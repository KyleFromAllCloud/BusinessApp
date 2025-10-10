# app/tools_rag.py
import os, json, base64, time, re
from typing import List, Dict, Any, Optional, Tuple
from .log_s3 import put_json, _ts

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, NoCredentialsError

from opensearchpy import OpenSearch, RequestsHttpConnection
from requests.auth import HTTPBasicAuth
import certifi

from strands import tool

# ---------- Config via env (defaults match your script) ----------
OS_ENDPOINT     = os.getenv("OS_ENDPOINT", "https://search-allcloud-opensearch-pm4rnrlowxarwciimomeasbzi4.us-west-2.es.amazonaws.com")
OS_REGION       = os.getenv("OS_REGION", "us-west-2")
OS_SECRET_NAME  = os.getenv("OS_SECRET_NAME", "OS_Credentials")

INDEX_A         = os.getenv("INDEX_A", "llcattorney_chunks_v2")
INDEX_B         = os.getenv("INDEX_B", "youtube_rag_v4")

VECTOR_FIELD_CANDIDATES = ["embedding", "embedding_vector", "vector", "embedding_vector_1024"]
VECTOR_DIM      = int(os.getenv("VECTOR_DIM", "1024"))
SOURCE_FIELDS   = ["title", "body", "text", "url", "industry_tags", "theme_tags", "tags_text"]

TOP_K_PER_INDEX = int(os.getenv("TOP_K_PER_INDEX", "10"))
LLM_RERANK_K    = int(os.getenv("LLM_RERANK_K", "10"))

BEDROCK_REGION  = os.getenv("BEDROCK_REGION", "us-west-2")
EMBED_MODEL_ID  = os.getenv("EMBED_MODEL_ID", "amazon.titan-embed-text-v2:0")
LLM_MODEL_ID    = os.getenv("LLM_MODEL_ID", "us.anthropic.claude-3-7-sonnet-20250219-v1:0")

# ---------- Clients ----------
def _to_host(endpoint: str) -> str:
    return re.sub(r"^https?://", "", endpoint).strip("/")

def _get_os_basic_auth(secret_name: str = OS_SECRET_NAME, region_name: str = OS_REGION) -> Tuple[str, str]:
    sm = boto3.client("secretsmanager", region_name=region_name)
    resp = sm.get_secret_value(SecretId=secret_name)
    payload = resp.get("SecretString") or base64.b64decode(resp["SecretBinary"]).decode("utf-8")
    data = json.loads(payload)
    return data["OS_USER"], data["OS_PASS"]

def _os_client() -> OpenSearch:
    user, pwd = _get_os_basic_auth()
    host = _to_host(OS_ENDPOINT)
    client = OpenSearch(
        hosts=[{"host": host, "port": 443, "scheme": "https"}],
        http_auth=HTTPBasicAuth(user, pwd),
        use_ssl=True,
        verify_certs=True,
        ca_certs=certifi.where(),
        connection_class=RequestsHttpConnection,
        http_compress=True,
        timeout=20,
        max_retries=0,
        retry_on_timeout=False,
    )
    if not client.ping():
        raise RuntimeError("OpenSearch ping failed (network/auth/policy).")
    return client

def _bedrock_runtime():
    return boto3.client(
        "bedrock-runtime",
        region_name=BEDROCK_REGION,
        config=Config(connect_timeout=5, read_timeout=30, retries={"max_attempts": 2}),
    )

# ---------- Mapping helpers (unchanged) ----------
_MAPPING_CACHE: Dict[str, Dict[str, Any]] = {}
_FIELD_PICK_CACHE: Dict[str, Dict[str, Any]] = {}

def _get_field_mapping(client: OpenSearch, index: str, field: str) -> Dict[str, Any]:
    cache_key = f"{index}:{field}"
    if cache_key in _MAPPING_CACHE:
        return _MAPPING_CACHE[cache_key]
    m = client.indices.get_mapping(index=index)
    field_map: Dict[str, Any] = {}
    for _, spec in m.items():
        props = spec.get("mappings", {}).get("properties", {})
        cur: Any = props
        parts = field.split(".")
        ok = True
        for i, p in enumerate(parts):
            if isinstance(cur, dict) and p in cur:
                cur = cur[p]
                if i < len(parts) - 1 and "properties" in cur:
                    cur = cur["properties"]
            else:
                ok = False
                break
        if ok and isinstance(cur, dict) and cur.get("type"):
            field_map = cur
            break
    _MAPPING_CACHE[cache_key] = field_map
    return field_map

def _vector_field_info(field_map: Dict[str, Any]) -> Dict[str, Any]:
    t = field_map.get("type", "")
    dims = field_map.get("dimension") or field_map.get("dims") or field_map.get("dimensions")
    return {"type": t, "dims": dims}

def _pick_vector_field_mapping(client: OpenSearch, index: str) -> Dict[str, Any]:
    if index in _FIELD_PICK_CACHE:
        return _FIELD_PICK_CACHE[index]
    for cand in VECTOR_FIELD_CANDIDATES:
        fmap = _get_field_mapping(client, index, cand)
        info = _vector_field_info(fmap)
        if info.get("type") == "knn_vector":
            out = {"name": cand, "type": "knn_vector", "dims": info.get("dims")}
            _FIELD_PICK_CACHE[index] = out
            return out
    m = client.indices.get_mapping(index=index)
    for _, spec in m.items():
        props = spec.get("mappings", {}).get("properties", {}) or {}
        for fname, fdef in props.items():
            if isinstance(fdef, dict) and fdef.get("type") == "knn_vector":
                out = {"name": fname, "type": "knn_vector", "dims": fdef.get("dimension")}
                _FIELD_PICK_CACHE[index] = out
                return out
    raise RuntimeError(f"No knn_vector field found in index '{index}'. Tried {VECTOR_FIELD_CANDIDATES}.")

# ---------- Embeddings ----------
def _embed_text(bedrock, text: str) -> List[float]:
    body = {"inputText": text}
    resp = bedrock.invoke_model(modelId=EMBED_MODEL_ID, body=json.dumps(body))
    payload = json.loads(resp["body"].read())
    vec = payload["embedding"]
    if len(vec) != VECTOR_DIM:
        raise ValueError(f"Unexpected embedding dim {len(vec)} != {VECTOR_DIM}")
    return vec

# ---------- k-NN search ----------
def _knn_search(client: OpenSearch, index: str, query_vec: List[float], k: int) -> List[Dict[str, Any]]:
    vinfo = _pick_vector_field_mapping(client, index)
    vec_field = vinfo["name"]
    if vinfo.get("dims") and int(vinfo["dims"]) != len(query_vec):
        raise ValueError(f"Vector dim mismatch: mapping dims={vinfo['dims']} but query has {len(query_vec)}.")

    body_q = {
        "size": k,
        "_source": SOURCE_FIELDS,
        "query": { "knn": { vec_field: { "vector": query_vec, "k": k } } }
    }
    try:
        res = client.search(index=index, body=body_q, request_timeout=20)
    except Exception as e1:
        body_top = {
            "size": k,
            "_source": SOURCE_FIELDS,
            "knn": { "field": vec_field, "query_vector": query_vec, "k": k }
        }
        try:
            res = client.search(index=index, body=body_top, request_timeout=20)
        except Exception as e2:
            raise RuntimeError(f"k-NN failed on '{index}'. query.knn error={e1}; top-level.knn error={e2}")

    out = []
    for h in res.get("hits", {}).get("hits", []):
        src = h.get("_source", {}) or {}
        out.append({
            "doc_id": h.get("_id"),
            "index": h.get("_index"),
            "score": h.get("_score"),
            "title": src.get("title", ""),
            "body":  src.get("body", "") or src.get("text", ""),
            "url":   src.get("url", ""),
            "industry_tags": src.get("industry_tags", []),
            "theme_tags":    src.get("theme_tags", []),
            "tags_text":     src.get("tags_text", ""),
        })
    return out

# ---------- LLM rerank (with tags) ----------
def _llm_rerank(bedrock, query: str, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    def trim(text: Optional[str], limit: int = 1200) -> str:
        t = (text or "").replace("\n", " ").strip()
        return t[:limit] + ("…" if len(t) > limit else "")

    items = []
    for c in candidates:
        items.append({
            "doc_id": c["doc_id"],
            "index": c["index"],
            "title": trim(c.get("title")),
            "snippet": trim(c.get("body")),
            "url": c.get("url", ""),
            "vector_score": c.get("score", 0.0),
            "industry_tags": c.get("industry_tags", []),
            "theme_tags": c.get("theme_tags", []),
            "tags_text": trim(c.get("tags_text", ""), 400),
        })

    system = (
        "You are a precise ranking model. Score each document [0.0..1.0] for relevance to the query. "
        "Use title/snippet PLUS metadata tags: industry_tags, theme_tags, tags_text. "
        "Boost direct/strong tag matches; penalize irrelevant tag spam. "
        "Return only JSON."
    )
    user_payload = {
        "query": query,
        "documents": items,
        "instructions": 'Return ONLY JSON like: [{"doc_id":"...","score":0.87}, ...] sorted by score desc.'
    }
    resp = bedrock.converse(
        modelId=LLM_MODEL_ID,
        system=[{"text": system}],
        messages=[{"role": "user", "content": [{"text": json.dumps(user_payload)}]}],
        inferenceConfig={"temperature": 0},
    )
    text = resp["output"]["message"]["content"][0]["text"].strip().strip("`")
    if text.lower().startswith("json"):
        text = text[4:].strip()
    ranked = json.loads(text)
    scores = {r["doc_id"]: float(r["score"]) for r in ranked if "doc_id" in r and "score" in r}

    with_scores = []
    for c in candidates:
        c2 = dict(c)
        c2["rerank_score"] = scores.get(c["doc_id"], 0.0)
        with_scores.append(c2)
    with_scores.sort(key=lambda x: (x.get("rerank_score", 0.0), x.get("score", 0.0)), reverse=True)
    return with_scores

def _search_orchestrate(query: str) -> Dict[str, Any]:
    bedrock = _bedrock_runtime()
    vec = _embed_text(bedrock, query)
    client = _os_client()
    res_a = _knn_search(client, INDEX_A, vec, TOP_K_PER_INDEX)
    res_b = _knn_search(client, INDEX_B, vec, TOP_K_PER_INDEX)

    merged = {}
    for r in res_a + res_b:
        key = (r["index"], r["doc_id"])
        if key not in merged or r["score"] > merged[key]["score"]:
            merged[key] = r
    merged_list = sorted(merged.values(), key=lambda x: x["score"], reverse=True)

    top = merged_list[:LLM_RERANK_K]
    if not top:
        return {"query": query, "results": [], "reranked": []}

    reranked = _llm_rerank(bedrock, query, top)
    # Return compact structure for the agent to cite
    def pack(rows: List[Dict[str, Any]]):
        return [
            {
                "doc_id": r["doc_id"],
                "index": r["index"],
                "url": r.get("url"),
                "title": r.get("title"),
                "snippet": (r.get("body") or "")[:500],
                "vector_score": r.get("score"),
                "rerank_score": r.get("rerank_score"),
                "industry_tags": r.get("industry_tags", []),
                "theme_tags": r.get("theme_tags", []),
            }
            for r in rows
        ]
    return {"query": query, "results": pack(merged_list[:LLM_RERANK_K]), "reranked": pack(reranked)}

# ---------- Exposed Strands tool ----------
@tool
def rag_search(user_id: str, question: str) -> dict:
    ts = _ts()
    put_json(user_id, "prompts", {
        "ts": ts,
        "component": "rag_search",
        "question": question
    }, ts=ts, key_suffix="rag")

    # … do embedding, kNN, rerank …
    result = {"answers": reranked[:5], "took_ms": total_ms}

    put_json(user_id, "answers", {
        "ts": ts,
        "component": "rag_search",
        "result": result
    }, ts=ts, key_suffix="rag")

    # Also consider a short reasoning trace (no CoT)
    put_json(user_id, "reasoning", {
        "ts": ts,
        "component": "rag_search",
        "trace": {
            "steps": ["embed_text", "knn_search:A", "knn_search:B", "llm_rerank"],
            "durations_ms": timings_dict
        }
    }, ts=ts, key_suffix="rag")

    return result
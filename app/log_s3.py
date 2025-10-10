# app/log_s3.py
import os, json, datetime as dt, hashlib
from typing import Any, Dict, Optional
import boto3

LOG_BUCKET = os.getenv("LOG_S3_BUCKET", "")           # required
LOG_PREFIX = os.getenv("LOG_S3_PREFIX", "agents/")    # optional, e.g. agents/
AWS_REGION = os.getenv("AWS_REGION", "us-west-2")

_s3 = boto3.client("s3", region_name=AWS_REGION)

def _ts() -> str:
    # 2025-10-08T16-21-09Z (safe for paths)
    return dt.datetime.utcnow().strftime("%Y-%m-%dT%H-%M-%SZ")

def _path(user_id: str, area: str, ts: str, suffix: str = "json") -> str:
    # s3://BUCKET/agents/users/<user_id>/<area>/<ts>.<suffix>
    return f"{LOG_PREFIX.rstrip('/')}/users/{user_id}/{area}/{ts}.{suffix}"

def _redact(d: Any) -> Any:
    """Basic redaction for obvious secrets; extend as needed."""
    try:
        if isinstance(d, dict):
            out = {}
            for k, v in d.items():
                lk = str(k).lower()
                if any(x in lk for x in ["password","secret","token","authorization","api_key","apikey","auth"]):
                    out[k] = "***REDACTED***"
                else:
                    out[k] = _redact(v)
            return out
        elif isinstance(d, list):
            return [_redact(x) for x in d]
        else:
            return d
    except Exception:
        return d

def put_json(user_id: str, area: str, payload: Dict[str, Any], ts: Optional[str] = None, key_suffix: Optional[str] = None):
    if not LOG_BUCKET:
        return  # disabled if not configured
    ts = ts or _ts()
    suffix = f"{key_suffix}.json" if key_suffix else "json"
    key = _path(user_id, area, ts, suffix)
    body = json.dumps(_redact(payload), ensure_ascii=False).encode("utf-8")
    _s3.put_object(Bucket=LOG_BUCKET, Key=key, Body=body, ContentType="application/json; charset=utf-8")

def put_text(user_id: str, area: str, text: str, ts: Optional[str] = None, ext: str = "log"):
    if not LOG_BUCKET:
        return
    ts = ts or _ts()
    key = _path(user_id, area, ts, ext)
    _s3.put_object(Bucket=LOG_BUCKET, Key=key, Body=text.encode("utf-8"), ContentType="text/plain; charset=utf-8")

def sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:16]

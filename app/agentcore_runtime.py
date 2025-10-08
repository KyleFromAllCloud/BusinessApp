import logging, time
from typing import Dict, Any, Optional, List

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from .agent import run_turn

# ----- Logging config -----
# Use uvicorn's logger so logs show in CloudWatch with level/ts.
uvicorn_logger = logging.getLogger("uvicorn.error")
logger = logging.getLogger("app")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    fmt = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    )
    handler.setFormatter(fmt)
    logger.addHandler(handler)

app = FastAPI(title="SmallBiz Agent", version="1.1.0")

# ----- Diagnostics middleware: request/response timing & payload trim -----
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    t0 = time.time()
    # Avoid reading large bodies; read a tiny peek for debugging
    body_preview = ""
    try:
        body_preview = (await request.body())[:512].decode("utf-8", errors="ignore")
    except Exception:
        body_preview = "<unreadable>"
    logger.info(f"[req] {request.method} {request.url.path} q={dict(request.query_params)} body~={body_preview!r}")

    try:
        response = await call_next(request)
        ms = int((time.time() - t0) * 1000)
        logger.info(f"[resp] {request.method} {request.url.path} -> {response.status_code} in {ms} ms")
        return response
    except Exception as e:
        ms = int((time.time() - t0) * 1000)
        logger.exception(f"[resp] {request.method} {request.url.path} -> 500 in {ms} ms (error: {e})")
        raise

# ----- Models (loose to accept multiple shapes) -----
class InvokeIn(BaseModel):
    input: Optional[Dict[str, Any]] = None
    message: Optional[str] = None
    inputText: Optional[str] = None
    messages: Optional[List[Dict[str, Any]]] = None

class InvokeOut(BaseModel):
    output: Dict[str, Any]

# ----- Extractors -----
def _pick_user_id(req: Request, body: InvokeIn) -> str:
    if body.input and isinstance(body.input.get("user_id"), str) and body.input["user_id"].strip():
        return body.input["user_id"].strip()
    for h in ("x-actor-id", "x-user-id", "x-agentcore-actor-id", "x-agentcore-user-id"):
        v = req.headers.get(h)
        if v and v.strip():
            return v.strip()
    if body.input and isinstance(body.input.get("actorId"), str) and body.input["actorId"].strip():
        return body.input["actorId"].strip()
    raise HTTPException(400, "user_id missing (expected in input.user_id or x-actor-id header)")

def _pick_message(body: InvokeIn) -> str:
    if body.input and isinstance(body.input.get("message"), str) and body.input["message"].strip():
        return body.input["message"].strip()
    if body.message and body.message.strip():
        return body.message.strip()
    if body.inputText and body.inputText.strip():
        return body.inputText.strip()
    if body.messages and isinstance(body.messages, list):
        for m in reversed(body.messages):
            role = (m.get("role") or "").lower()
            content = m.get("content")
            if role == "user" and isinstance(content, str) and content.strip():
                return content.strip()
            if role == "user" and isinstance(content, list):
                for part in reversed(content):
                    if isinstance(part, dict) and isinstance(part.get("text"), str) and part["text"].strip():
                        return part["text"].strip()
    raise HTTPException(400, "message missing (input.message, message, inputText, or messages[])")

async def _handle_invoke(request: Request, body: InvokeIn) -> Dict[str, Any]:
    user_id = _pick_user_id(request, body)
    message = _pick_message(body)
    logger.info(f"[invoke] user_id={user_id} msg_len={len(message)}")
    try:
        out = run_turn(user_id, message)  # {"reply": "...", "state": {...}}
        return out
    except Exception as e:
        logger.exception("[invoke] unhandled error")
        raise HTTPException(500, f"agent error: {e}")

# ----- Health -----
@app.get("/ping")
def ping():
    return {"status": "healthy"}

# ----- Invocation routes (support multiple paths just in case) -----
@app.post("/invocations", response_model=InvokeOut)
async def invocations(request: Request, body: InvokeIn):
    return {"output": await _handle_invoke(request, body)}

@app.post("/invoke", response_model=InvokeOut)
async def invoke_alias(request: Request, body: InvokeIn):
    return {"output": await _handle_invoke(request, body)}

@app.post("/v1/invoke", response_model=InvokeOut)
async def invoke_v1(request: Request, body: InvokeIn):
    return {"output": await _handle_invoke(request, body)}

@app.post("/call", response_model=InvokeOut)
async def call_alias(request: Request, body: InvokeIn):
    return {"output": await _handle_invoke(request, body)}

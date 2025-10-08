import os, uuid, json, time, datetime as dt
from decimal import Decimal
import boto3
from boto3.dynamodb.conditions import Key

# Strands
from strands import Agent, tool
from strands.models import BedrockModel

AWS_REGION       = os.getenv("AWS_REGION", boto3.Session().region_name or "us-west-2")
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-3-7-sonnet-20250219-v1:0")
DDB_TABLE        = os.getenv("STATE_TABLE", "SmallBizAgentState")

dynamo = boto3.resource("dynamodb", region_name=AWS_REGION)

def ensure_table(table_name: str = DDB_TABLE):
    c = boto3.client("dynamodb", region_name=AWS_REGION)
    try:
        c.describe_table(TableName=table_name)
        return dynamo.Table(table_name)
    except c.exceptions.ResourceNotFoundException:
        c.create_table(
            TableName=table_name,
            BillingMode="PAY_PER_REQUEST",
            AttributeDefinitions=[
                {"AttributeName":"pk","AttributeType":"S"},
                {"AttributeName":"sk","AttributeType":"S"}
            ],
            KeySchema=[
                {"AttributeName":"pk","KeyType":"HASH"},
                {"AttributeName":"sk","KeyType":"RANGE"}
            ],
        )
        while True:
            if c.describe_table(TableName=table_name)["Table"]["TableStatus"] == "ACTIVE":
                break
            time.sleep(1.0)
        return dynamo.Table(table_name)

table = ensure_table(DDB_TABLE)

def _pk(user_id: str) -> str: return f"USER#{user_id}"
def _num(x): return None if x is None else Decimal(str(x))
def _utcnow(): return dt.datetime.utcnow().isoformat(timespec="seconds") + "Z"

@tool
def get_state(user_id: str) -> dict:
    """Load saved context for a user (business_idea, budget_finance, todos)."""
    resp = table.query(KeyConditionExpression=Key("pk").eq(_pk(user_id)))
    state = {"business_idea": None, "budget_finance": None, "todos": []}
    for it in resp.get("Items", []):
        sk = it["sk"]
        if sk == "STATE#BUSINESS_IDEA":
            state["business_idea"] = {
                "business_name": it.get("business_name"),
                "idea": it.get("idea"),
                "market": it.get("market"),
            }
        elif sk == "STATE#BUDGET_FINANCE":
            state["budget_finance"] = {
                "customer_count": int(it["customer_count"]) if "customer_count" in it else None,
                "revenue_per_customer": float(it["revenue_per_customer"]) if "revenue_per_customer" in it else None,
                "cost_per_customer": float(it["cost_per_customer"]) if "cost_per_customer" in it else None,
            }
        elif sk.startswith("TODO#"):
            state["todos"].append({
                "id": sk.split("#", 1)[1],
                "task": it.get("task"),
                "due_date": it.get("due_date"),
                "progress": it.get("progress"),
            })
    return state

@tool
def upsert_business_idea(user_id: str, business_name: str, idea: str, market: str) -> dict:
    table.put_item(Item={
        "pk": _pk(user_id),
        "sk": "STATE#BUSINESS_IDEA",
        "business_name": business_name,
        "idea": idea,
        "market": market,
        "updated_at": _utcnow(),
    })
    return {"ok": True}

@tool
def upsert_budget_finance(user_id: str, customer_count: int, revenue_per_customer: float, cost_per_customer: float) -> dict:
    table.put_item(Item={
        "pk": _pk(user_id),
        "sk": "STATE#BUDGET_FINANCE",
        "customer_count": _num(customer_count),
        "revenue_per_customer": _num(revenue_per_customer),
        "cost_per_customer": _num(cost_per_customer),
        "updated_at": _utcnow(),
    })
    return {"ok": True}

@tool
def add_todo(user_id: str, task: str, due_date: str, progress: str = "not_started") -> dict:
    todo_id = str(uuid.uuid4())
    now = _utcnow()
    table.put_item(Item={
        "pk": _pk(user_id),
        "sk": f"TODO#{todo_id}",
        "task": task,
        "due_date": due_date,
        "progress": progress,
        "created_at": now,
        "updated_at": now,
    })
    return {"id": todo_id}

@tool
def update_todo(user_id: str, todo_id: str, task: str | None = None, due_date: str | None = None, progress: str | None = None) -> dict:
    expr, names, values = [], {}, {}
    if task is not None:     expr += ["#t = :t"]; names["#t"]="task"; values[":t"]=task
    if due_date is not None: expr += ["#d = :d"]; names["#d"]="due_date"; values[":d"]=due_date
    if progress is not None: expr += ["#p = :p"]; names["#p"]="progress"; values[":p"]=progress
    expr += ["updated_at = :u"]; values[":u"] = _utcnow()
    table.update_item(
        Key={"pk": _pk(user_id), "sk": f"TODO#{todo_id}"},
        UpdateExpression="SET " + ", ".join(expr),
        ExpressionAttributeNames=names if names else None,
        ExpressionAttributeValues=values,
    )
    return {"ok": True}

SYSTEM_PROMPT = (
    "You are a small-business coach. Start each turn by calling get_state with USER_ID.\n"
    "For first-time users, collect & persist:\n"
    "- business_name, idea, market\n"
    "- customer_count, revenue_per_customer, cost_per_customer\n"
    "- at least one to-do (task, due_date, progress)\n"
    "Ask before overwriting existing values. Compute: monthly_revenue, gross_margin_per_customer, monthly_gross_margin."
)

bedrock_model = BedrockModel(model_id=BEDROCK_MODEL_ID, region_name=AWS_REGION)

agent = Agent(
    model=bedrock_model,
    tools=[get_state, upsert_business_idea, upsert_budget_finance, add_todo, update_todo],
    system_prompt=SYSTEM_PROMPT,
)

def run_turn(user_id: str, message: str) -> dict:
    """Single turn; returns {'reply': str, 'state': {...}}."""
    reply = agent(f"USER_ID={user_id}\nMESSAGE={message}")
    text = getattr(reply, "text", None) or str(reply)
    state = get_state(user_id)
    return {"reply": text, "state": state}

# Optional helpers (handy for local testing)
def chat(user_id: str, message: str, verbose: bool = True):
    out = run_turn(user_id, message)
    if verbose:
        import json as _json
        print("Assistant:\n", out["reply"])
        print("\nState Snapshot:\n", _json.dumps(out["state"], indent=2))
    return out["reply"], out["state"]

def free_form_chat(user_id: str, prompt: str) -> dict:
    if not isinstance(user_id, str) or not user_id.strip():
        raise ValueError("user_id must be a non-empty string")
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError("prompt must be a non-empty string")
    return run_turn(user_id.strip(), prompt.strip())

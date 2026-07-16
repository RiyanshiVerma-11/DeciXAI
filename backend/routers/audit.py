import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter()
AUDIT_LOG_FILE = Path("logs/audit/decision_audit.jsonl")

@router.get("/history")
async def get_audit_history(limit: int = 50):
    """
    Returns the most recent decision logs for audit and compliance demonstrations.
    Patent-worthy feature: verifiable decision intelligence.
    """
    if not AUDIT_LOG_FILE.exists():
        return {"logs": []}
    
    try:
        # For a small FYP file, reading lines into memory is fine.
        # For production, we'd read backwards or use a proper log aggregation DB.
        with open(AUDIT_LOG_FILE, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
        logs = []
        for line in reversed(lines[-limit:]):
            if line.strip():
                try:
                    logs.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        
        return {"logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read audit logs: {str(e)}")

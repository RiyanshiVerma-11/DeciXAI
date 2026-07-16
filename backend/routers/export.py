from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import StreamingResponse

from services.pdf_service import generate_decision_report
from utils.app_logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

@router.post("/{domain}/report")
async def export_decision_report(domain: str, decision_data: dict = Body(...)):
    """
    Generates a PDF report from the provided decision data.
    """
    valid_domains = {"career", "finance", "startup", "policy"}
    if domain not in valid_domains:
        raise HTTPException(status_code=400, detail=f"Invalid domain: {domain}")
        
    try:
        pdf_buffer = generate_decision_report(domain, decision_data)
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="decixai_{domain}_report.pdf"'
            }
        )
    except Exception as e:
        logger.exception("Failed to generate PDF report for domain=%s", domain)
        raise HTTPException(status_code=500, detail="Failed to generate PDF report.")

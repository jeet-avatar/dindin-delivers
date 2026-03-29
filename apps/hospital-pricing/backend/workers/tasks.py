# apps/hospital-pricing/backend/workers/tasks.py
from workers.celery_app import celery_app
from services.pdf_parser import extract_text_from_pdf
from services.s3 import download_bytes


@celery_app.task(name="workers.tasks.parse_document", bind=True, max_retries=3)
def parse_document(self, s3_key: str, contract_id: str) -> dict:
    """
    Download PDF from S3, extract text, return structured result.
    Called after a contract PDF is uploaded.
    """
    try:
        pdf_bytes = download_bytes(s3_key)
        text = extract_text_from_pdf(pdf_bytes)
        return {
            "contract_id": contract_id,
            "s3_key": s3_key,
            "text": text,
            "status": "parsed",
            "char_count": len(text),
        }
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)

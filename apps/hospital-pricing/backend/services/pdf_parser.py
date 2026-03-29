# apps/hospital-pricing/backend/services/pdf_parser.py
import io


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract text from PDF bytes using pdfplumber.
    Falls back to empty string if extraction fails.
    """
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            pages = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
            return "\n\n".join(pages)
    except Exception:
        return ""


def extract_text_simple(pdf_bytes: bytes) -> str:
    """Alias for extract_text_from_pdf for backward compatibility."""
    return extract_text_from_pdf(pdf_bytes)

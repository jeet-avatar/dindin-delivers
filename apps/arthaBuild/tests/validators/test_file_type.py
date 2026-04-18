import pytest
from src.backend.validators.checkers.file_type import FileTypeChecker

CHECKER = FileTypeChecker()


@pytest.mark.parametrize("bad", [
    "JPEG", "PNG", "HTML", "MARKDOWN", "BINARY", "MEDIA",
    "DOCUMENT", "IMAGE", "SCRIPT", "CERT",
    # Case-variant hallucinations must also be flagged.
    "pdf", "Zip", "jpgImage",
])
def test_hallucinated_flagged(bad):
    code = f"var t = file.Type.{bad};"
    violations = CHECKER.check(code)
    assert len(violations) == 1
    assert violations[0].identifier == bad
    assert violations[0].category == "file_type"


@pytest.mark.parametrize("good", [
    "PDF", "JSON", "CSV", "PLAINTEXT", "PNGIMAGE", "JPGIMAGE",
    "ZIP", "SVG", "EXCEL", "WORD",
])
def test_valid_passes(good):
    code = f"var t = file.Type.{good};"
    violations = CHECKER.check(code)
    assert violations == []


def test_no_false_positive_on_member_access():
    # Ensure we don't flag unrelated `.Type.` accesses (e.g. record.Type.SALES_ORDER).
    code = "var x = record.Type.SALES_ORDER;"
    violations = CHECKER.check(code)
    assert violations == []

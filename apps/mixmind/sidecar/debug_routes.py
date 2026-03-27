"""Debug routes — diagnostic endpoints for development and troubleshooting.

GET /api/debug/anlz-raw?path=<analysis_data_path>
    Returns raw diagnostic info about an ANLZ .EXT file: tag names, waveform
    candidate types, shapes, and first-5 values.  Used to understand what
    pyrekordbox returns for wf_color_preview / wf_color / PWV5 so that
    _parse_waveform_3band can be fixed to match the real structure.
"""
from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from anlz_parser import _resolve_anlz_paths  # type: ignore

router = APIRouter(prefix="/api")

_WAVEFORM_CANDIDATES = ("wf_color_preview", "wf_color", "PWV5")


def _inspect_candidate(ext_file, candidate: str) -> dict:
    """Return diagnostic dict for one waveform candidate tag."""
    result: dict = {
        "found": False,
        "python_type": None,
        "is_tuple": False,
        "tuple_len": None,
        "tuple_element_types": None,
        "element_shape": None,
        "element_dtype": None,
        "element_len": None,
        "first_5_values": None,
        "error": None,
    }
    try:
        raw = ext_file.get(candidate)

        if raw is None:
            return result  # found=False, all None

        result["found"] = True
        result["python_type"] = type(raw).__name__

        if isinstance(raw, tuple):
            result["is_tuple"] = True
            result["tuple_len"] = len(raw)
            result["tuple_element_types"] = [type(x).__name__ for x in raw]

            # Inspect first element
            if len(raw) > 0:
                elem = raw[0]
                _fill_array_fields(result, elem)
        else:
            # Direct ndarray or other object
            _fill_array_fields(result, raw)

    except Exception as exc:
        result["error"] = str(exc)

    return result


def _fill_array_fields(result: dict, obj) -> None:
    """Fill element_shape / element_dtype / element_len / first_5_values from array-like obj."""
    try:
        if hasattr(obj, "shape"):
            result["element_shape"] = str(obj.shape)
        if hasattr(obj, "dtype"):
            result["element_dtype"] = str(obj.dtype)
        if hasattr(obj, "__len__"):
            result["element_len"] = len(obj)
        if hasattr(obj, "tolist"):
            result["first_5_values"] = obj.tolist()[:5]
    except Exception as exc:
        result["error"] = (result.get("error") or "") + f" [array_fields: {exc}]"


@router.get("/debug/anlz-raw")
async def anlz_raw_diagnostic(path: str) -> JSONResponse:
    """Return raw diagnostic info for an ANLZ analysis data path.

    Parameters
    ----------
    path:
        Rekordbox AnalysisDataPath string, e.g.
        '/PIONEER/USBANLZ/7f3a/0001/ANLZ0000.DAT'

    Returns
    -------
    JSON with:
      - ext_exists, ext_path, dat_exists, dat_path
      - tag_names: list of all tag names found in the .EXT file
      - waveform_tags: one entry per candidate (wf_color_preview, wf_color, PWV5)
        with python_type, is_tuple, tuple_len, element_shape, element_dtype,
        element_len, first_5_values
    """
    from pyrekordbox.anlz import AnlzFile  # type: ignore

    paths = _resolve_anlz_paths(path)
    dat_path = paths["dat"]
    ext_path = paths["ext"]

    result: dict = {
        "dat_exists": dat_path.exists(),
        "dat_path": str(dat_path),
        "ext_exists": ext_path is not None and ext_path.exists() if ext_path else False,
        "ext_path": str(ext_path) if ext_path else None,
        "tag_names": [],
        "waveform_tags": {},
    }

    if not result["ext_exists"]:
        # No .EXT file — return early with empty waveform info
        return JSONResponse(content=result)

    # Parse .EXT file
    try:
        ext_file = AnlzFile.parse_file(str(ext_path))
    except Exception as exc:
        result["error"] = f"Failed to parse .EXT: {exc}"
        return JSONResponse(content=result)

    # Collect all tag names
    try:
        result["tag_names"] = [t.name for t in ext_file.tags]
    except Exception as exc:
        result["tag_names_error"] = str(exc)

    # Inspect each waveform candidate
    for candidate in _WAVEFORM_CANDIDATES:
        result["waveform_tags"][candidate] = _inspect_candidate(ext_file, candidate)

    return JSONResponse(content=result)

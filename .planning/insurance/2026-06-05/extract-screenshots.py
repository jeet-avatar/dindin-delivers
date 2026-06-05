#!/usr/bin/env python3
"""
Extract XCTAttachment screenshots from a test .xcresult bundle into the
insurance package's per-flow folders.

Usage:
    extract-screenshots.py /path/to/Test.xcresult

Attachment naming convention from the helper in each TestHelpers.swift:
    customer__01_login              -> food-customer/
    customer__10_ride_request_form  -> rideshare-rider/  (because name has 'ride')
    driver__06_food_earnings_summary -> food-driver/
    driver__10_driver_rideshare_dashboard -> rideshare-driver/
    restaurant__03_orders_list      -> food-restaurant/
"""
import json, subprocess, sys, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def xcresult(xcresult_path: str, args: list[str]) -> bytes:
    return subprocess.run(
        ["xcrun", "xcresulttool", "get", "--legacy", "--path", xcresult_path] + args,
        check=True, capture_output=True
    ).stdout

def jget(xcresult_path: str, obj_id: str | None = None) -> dict:
    args = ["--format", "json"]
    if obj_id:
        args += ["--id", obj_id]
    return json.loads(xcresult(xcresult_path, args))

def export_blob(xcresult_path: str, obj_id: str, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    raw = xcresult(xcresult_path, ["--id", obj_id])
    out.write_bytes(raw)

def find_summary_refs(node) -> list[str]:
    out = []
    def walk(o):
        if isinstance(o, dict):
            if "summaryRef" in o:
                rid = (o["summaryRef"] or {}).get("id", {}).get("_value")
                if rid: out.append(rid)
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for x in o: walk(x)
    walk(node)
    return list(dict.fromkeys(out))  # de-dupe, preserve order

def find_attachments(node) -> list[tuple[str, str]]:
    """Return [(name, payload_id), ...]"""
    out = []
    def walk(o):
        if isinstance(o, dict):
            if "attachments" in o and isinstance(o["attachments"], dict):
                for a in o["attachments"].get("_values", []):
                    name = (a.get("name") or {}).get("_value")
                    rid  = (a.get("payloadRef") or {}).get("id", {}).get("_value")
                    if name and rid:
                        out.append((name, rid))
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for x in o: walk(x)
    walk(node)
    return out

def route(name: str) -> str:
    """Map attachment name to the flow folder."""
    app, _, rest = name.partition("__")
    if not rest:
        return "raw-existing"
    rest_lower = rest.lower()
    if app == "customer":
        return "rideshare-rider" if "ride" in rest_lower else "food-customer"
    if app == "driver":
        return "rideshare-driver" if "ride" in rest_lower else "food-driver"
    if app == "restaurant":
        return "food-restaurant"
    return "raw-existing"

def safe_filename(name: str) -> str:
    # Strip the app prefix; sanitize.
    _, _, rest = name.partition("__")
    return re.sub(r"[^A-Za-z0-9_.-]", "_", rest) + ".png"

def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    xcr = sys.argv[1]
    if not Path(xcr).is_dir():
        print(f"error: {xcr} not found", file=sys.stderr); sys.exit(2)

    root = jget(xcr)
    tests_refs = []
    for a in root.get("actions", {}).get("_values", []):
        rid = (a.get("actionResult", {}).get("testsRef") or {}).get("id", {}).get("_value")
        if rid: tests_refs.append(rid)

    summary_refs: list[str] = []
    for tid in tests_refs:
        tnode = jget(xcr, tid)
        summary_refs.extend(find_summary_refs(tnode))

    print(f"summaryRefs discovered: {len(summary_refs)}")

    extracted = []
    seen_names: set[str] = set()
    for sid in summary_refs:
        snode = jget(xcr, sid)
        for name, payload_id in find_attachments(snode):
            if name in seen_names: continue
            seen_names.add(name)
            folder = route(name)
            out = ROOT / folder / f"iostour_{safe_filename(name)}"
            try:
                export_blob(xcr, payload_id, out)
                extracted.append((name, out))
                print(f"  ✓ {folder}/{out.name}")
            except subprocess.CalledProcessError as e:
                print(f"  ✗ failed {name}: {e}", file=sys.stderr)

    print(f"\nExtracted {len(extracted)} screenshots into {ROOT}")

if __name__ == "__main__":
    main()

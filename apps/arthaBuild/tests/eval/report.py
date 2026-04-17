"""Report generator for the NetSuite eval harness.

Reads tests/eval/runs/<ts>/*.json, writes REPORT.md.
Spec: apps/arthaBuild/docs/superpowers/specs/2026-04-17-netsuite-eval-harness-design.md § 4
"""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path
from typing import Any

from score import _get_anthropic_client

DIMENSION_NAMES = {
    "A": "Coverage breadth",
    "B": "Accuracy depth",
    "C": "Execution loop",
    "D": "Pattern quality",
    "E": "Real-scenario fluency",
}

SIGNAL_THRESHOLDS = [(75, "strong"), (50, "moderate"), (25, "weak"), (0, "very weak")]


def signal_for(score: float) -> str:
    for threshold, label in SIGNAL_THRESHOLDS:
        if score >= threshold:
            return label
    return "very weak"


def load_results(run_dir: Path) -> tuple[dict, list[dict]]:
    meta = json.loads((run_dir / "meta.json").read_text())
    results = []
    for path in sorted(run_dir.glob("*.json")):
        if path.name == "meta.json":
            continue
        results.append(json.loads(path.read_text()))
    return meta, results


def aggregate_by_dimension(results: list[dict]) -> dict[str, dict]:
    by_dim: dict[str, list[dict]] = {}
    for r in results:
        by_dim.setdefault(r["dimension"], []).append(r)

    out = {}
    for dim, items in by_dim.items():
        normalized = []
        for r in items:
            if r.get("status") != "ok":
                normalized.append(0.0)
            else:
                total = r.get("score_total", 0)
                max_pts = r.get("score_max", 100)
                normalized.append(100.0 * total / max_pts if max_pts else 0)
        avg = sum(normalized) / len(normalized) if normalized else 0
        out[dim] = {
            "name": DIMENSION_NAMES.get(dim, dim),
            "score": round(avg, 1),
            "signal": signal_for(avg),
            "count": len(items),
        }
    return out


def worst_cases(results: list[dict], n: int = 10) -> list[dict]:
    scored = []
    for r in results:
        total = r.get("score_total", 0)
        max_pts = r.get("score_max", 100)
        normalized = 100.0 * total / max_pts if max_pts else 0
        scored.append((normalized, r))
    scored.sort(key=lambda x: x[0])
    return [
        {
            "case_id": r["case_id"],
            "dimension": r["dimension"],
            "score": round(score, 1),
            "summary": (r.get("judge") or {}).get("reasoning", r.get("error", "no judge data"))[:200],
        }
        for score, r in scored[:n]
    ]


def cluster_failures(worst: list[dict], model: str = "claude-opus-4-7") -> list[dict]:
    """Ask the judge to cluster the worst-15 failure reasons into 2-4 themes."""
    if not worst:
        return []
    payload = "\n".join(f"[{w['case_id']}] ({w['dimension']}): {w['summary']}" for w in worst)
    user_msg = (
        "Group these failure reasons into 2-4 themed clusters. "
        "For each cluster: pick a short name, list the case IDs that fit, write one sentence describing the theme. "
        "Return strict JSON: {\"clusters\": [{\"name\": str, \"case_ids\": [str], \"theme\": str}]}\n\n"
        f"Failures:\n{payload}"
    )
    client = _get_anthropic_client()
    msg = client.messages.create(
        model=model,
        max_tokens=800,
        messages=[{"role": "user", "content": user_msg}],
    )
    raw = msg.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(raw).get("clusters", [])


def render_report(meta: dict, by_dim: dict, worst: list[dict], clusters: list[dict]) -> str:
    from datetime import datetime as _dt
    lines: list[str] = []
    lines.append("# NetSuite Eval Run — REPORT")
    lines.append("")
    lines.append("## Headline")
    total_cases = sum(d["count"] for d in by_dim.values())
    overall = sum(d["score"] * d["count"] for d in by_dim.values()) / total_cases if total_cases else 0
    start_dt = _dt.fromisoformat(meta["started_at"].replace("Z", "+00:00"))
    end_dt = _dt.fromisoformat(meta["finished_at"].replace("Z", "+00:00"))
    duration_min = (end_dt - start_dt).total_seconds() / 60
    lines.append(f"- **Overall:** {overall:.1f}/100 across {total_cases} cases")
    lines.append(f"- **Total time:** {duration_min:.1f} min")
    lines.append(f"- **Total cost:** ${meta.get('cost_usd', 0):.2f}")
    lines.append(f"- **Run:** `{meta['run_id']}`")
    lines.append(f"- **Commit:** `{meta['git_commit_sha'][:8]}`")
    lines.append(f"- **Backend:** {meta['backend_url']}")
    lines.append(f"- **Model under test:** {meta.get('model_under_test', 'unknown')}")
    lines.append(f"- **Judge:** {meta['judge_model']}")
    if meta.get("aborted"):
        lines.append(f"- **⚠️ ABORTED:** {meta.get('abort_reason', 'unknown reason')}")
    lines.append("")

    lines.append("## Per-Dimension")
    lines.append("| Dim | Name | Score | Signal |")
    lines.append("|-----|------|-------|--------|")
    for dim in sorted(by_dim.keys()):
        d = by_dim[dim]
        lines.append(f"| {dim} | {d['name']} | {d['score']:.1f}/100 | {d['signal']} |")
    lines.append("")

    lines.append("## Worst 10 Cases")
    lines.append("| # | ID | Dim | Score | Summary |")
    lines.append("|---|----|----|-------|---------|")
    for i, w in enumerate(worst, 1):
        summary = w["summary"].replace("|", "\\|").replace("\n", " ")
        lines.append(f"| {i} | {w['case_id']} | {w['dimension']} | {w['score']:.1f} | {summary} |")
    lines.append("")

    lines.append("## Failure Clusters")
    if not clusters:
        lines.append("_No clusters available._")
    for c in clusters:
        ids = ", ".join(c.get("case_ids", []))
        lines.append(f"- **{c.get('name')}** ({ids}): {c.get('theme')}")
    lines.append("")

    lines.append("## Recommended Priority Fix")
    weakest = min(by_dim.values(), key=lambda d: d["score"]) if by_dim else None
    if weakest:
        lines.append(
            f"The weakest dimension is **{weakest['name']}** "
            f"(score {weakest['score']:.1f}/100, signal: {weakest['signal']}). "
            f"This should be the focus of the next improvement cycle. "
            f"See the failure clusters above to scope the specific intervention."
        )
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate REPORT.md from a run dir")
    parser.add_argument("run_dir", help="Path to tests/eval/runs/<timestamp>/")
    parser.add_argument("--no-cluster", action="store_true", help="Skip LLM clustering (offline mode)")
    args = parser.parse_args()

    run_dir = Path(args.run_dir)
    if not run_dir.exists():
        print(f"Run dir not found: {run_dir}", file=sys.stderr)
        return 1

    meta, results = load_results(run_dir)
    by_dim = aggregate_by_dimension(results)
    worst = worst_cases(results, n=10)
    worst_for_cluster = worst_cases(results, n=15)
    clusters = [] if args.no_cluster else cluster_failures(worst_for_cluster)

    report = render_report(meta, by_dim, worst, clusters)
    out_path = run_dir / "REPORT.md"
    out_path.write_text(report)
    print(f"Wrote {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

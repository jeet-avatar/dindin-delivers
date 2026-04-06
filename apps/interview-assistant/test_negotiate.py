"""Unit tests for TotalCompFrame.calculate() and EmailDraftFrame.parse_sections()."""

import sys, os, ast as _ast
import pytest

_src_path = os.path.join(os.path.dirname(__file__), "interview_assistant_windows.py")
with open(_src_path) as _f:
    _src = _f.read()


def _get_calculate_fn(src):
    """Extract TotalCompFrame.calculate() as a standalone function."""
    for node in _ast.walk(_ast.parse(src)):
        if isinstance(node, _ast.ClassDef) and node.name == "TotalCompFrame":
            for item in node.body:
                if isinstance(item, _ast.FunctionDef) and item.name == "calculate":
                    item.args.args = [a for a in item.args.args if a.arg != "self"]
                    mod = _ast.Module(body=[item], type_ignores=[])
                    _ast.fix_missing_locations(mod)
                    code = compile(mod, "<test>", "exec")
                    ns = {}
                    exec(code, ns)
                    return ns["calculate"]
    raise RuntimeError("calculate() not found in TotalCompFrame")


def _get_parse_sections_fn(src):
    """Extract EmailDraftFrame.parse_sections() as a standalone function."""
    for node in _ast.walk(_ast.parse(src)):
        if isinstance(node, _ast.ClassDef) and node.name == "EmailDraftFrame":
            for item in node.body:
                if isinstance(item, _ast.FunctionDef) and item.name == "parse_sections":
                    item.args.args = [a for a in item.args.args
                                      if a.arg not in ("self", "cls")]
                    item.decorator_list = []
                    mod = _ast.Module(body=[item], type_ignores=[])
                    _ast.fix_missing_locations(mod)
                    code = compile(mod, "<test>", "exec")
                    ns = {}
                    exec(code, ns)
                    return ns["parse_sections"]
    raise RuntimeError("parse_sections() not found in EmailDraftFrame")


calculate     = _get_calculate_fn(_src)
parse_sections = _get_parse_sections_fn(_src)


# ── TotalCompFrame.calculate() tests ──────────────────────────────────────────

class TestTotalCompCalculate:

    def test_year1_basic(self):
        r = calculate(
            base=200_000, bonus_pct=20, signing=50_000,
            equity_shares=10_000, strike_price=10, current_fmv=20,
            vesting_years=4, benefits_annual=15_000,
        )
        # base=200k, bonus=40k, signing=50k, equity_y1=10k/4*10=$25k, benefits=15k
        assert r["year1_tc"] == pytest.approx(330_000, rel=1e-3)

    def test_year4_excludes_signing(self):
        r = calculate(
            base=100_000, bonus_pct=10, signing=20_000,
            equity_shares=4_000, strike_price=0, current_fmv=25,
            vesting_years=4, benefits_annual=10_000,
        )
        # year4 = base*4 + bonus*4 + equity(4yr) + benefits*4
        # = 400k + 40k + 100k + 40k = 580k   (signing NOT included)
        assert r["year4_tc"] == pytest.approx(580_000, rel=1e-3)

    def test_zero_equity_gain(self):
        """Strike >= FMV → equity gain is 0, no negative values."""
        r = calculate(
            base=150_000, bonus_pct=15, signing=0,
            equity_shares=5_000, strike_price=50, current_fmv=30,
            vesting_years=4, benefits_annual=12_000,
        )
        assert r["equity_value_at_vest"] == 0.0
        assert r["equity_year1"]         == 0.0
        assert r["equity_year4"]         == 0.0

    def test_vesting_less_than_4_years(self):
        """2-year vest: equity_year4 == full vest (capped at vesting_years)."""
        r = calculate(
            base=100_000, bonus_pct=0, signing=0,
            equity_shares=2_000, strike_price=0, current_fmv=50,
            vesting_years=2, benefits_annual=0,
        )
        assert r["equity_value_at_vest"] == pytest.approx(100_000)
        assert r["equity_year4"] == pytest.approx(100_000)

    def test_all_zeros(self):
        """All-zero inputs produce zero TCs without error."""
        r = calculate(
            base=0, bonus_pct=0, signing=0,
            equity_shares=0, strike_price=0, current_fmv=0,
            vesting_years=4, benefits_annual=0,
        )
        assert r["year1_tc"] == 0.0
        assert r["year4_tc"] == 0.0


# ── EmailDraftFrame.parse_sections() tests ────────────────────────────────────

class TestParseSections:

    SAMPLE = (
        "===SUBJECT===\nRe: Software Engineer Offer — Excited to Discuss\n"
        "===EMAIL===\nDear Jane,\n\nThank you for the offer…\n\nBest,\nAlex\n"
        "===FOLLOWUP===\nHi Jane,\n\nJust following up…\n\nBest,\nAlex\n"
    )

    def test_all_sections_present(self):
        r = parse_sections(self.SAMPLE)
        assert r["subject"]  == "Re: Software Engineer Offer — Excited to Discuss"
        assert r["email"].startswith("Dear Jane")
        assert r["followup"].startswith("Hi Jane")

    def test_missing_section_returns_empty(self):
        partial = "===SUBJECT===\nSubject here\n===EMAIL===\nEmail body\n"
        r = parse_sections(partial)
        assert r["subject"] == "Subject here"
        assert r["email"]   == "Email body"
        assert r["followup"] == ""

    def test_extra_whitespace_stripped(self):
        messy = "===SUBJECT===\n\n  Padded Subject  \n\n===EMAIL===\nBody\n===FOLLOWUP===\nFU\n"
        r = parse_sections(messy)
        assert r["subject"] == "Padded Subject"

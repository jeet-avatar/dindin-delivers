#!/usr/bin/env python3
"""
Build INSURANCE-EVIDENCE-2026-06-05.pdf from the curated screenshots in this
directory plus embedded receipt math from INSURANCE-RECEIPTS.md.

The PDF is the deliverable for the TNC / delivery underwriter and is the
visual companion to INSURANCE-RECEIPTS.md (which has every number, with
file:line citations to the prod backend).
"""
from pathlib import Path
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, Table, TableStyle, KeepTogether,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from PIL import Image as PILImage

BASE = Path(__file__).resolve().parent
OUT = BASE / "INSURANCE-EVIDENCE-2026-06-05.pdf"

# ─────────────────────────────────────────────────────────────────────────────
# Flow definitions — order, label, expected screens.
# Each tuple: (filename, caption).  Missing files fall through to a gap page.
# ─────────────────────────────────────────────────────────────────────────────

FLOWS = [
    ("food-customer", "Trip 1 — Food Delivery: Customer view", [
        ("01-home.png",                              "Customer home — discovery feed"),
        ("appstore-iphone-01.png",                   "Customer landing (App Store screenshot)"),
        ("appstore-iphone-02.png",                   "Restaurant browse"),
        ("appstore-iphone-03.png",                   "Restaurant menu"),
        ("03-cart.png",                              "Cart — itemized food + delivery fee + $1 service fee"),
        ("04-checkout-step1-address.png",            "Checkout step 1 — delivery address"),
        ("05-checkout-step2-payment.png",            "Checkout step 2 — payment method on file"),
        ("06-checkout-step3-review.png",             "Checkout step 3 — review (final per-party breakdown)"),
        ("07-checkout-success-order-placed.png",     "Order placed — confirmation"),
        ("08-order-tracking-live.png",               "Live tracking — restaurant accepted, driver assigned"),
        ("10-order-tracking-en-route.png",           "En-route — driver picked up, heading to customer"),
        ("11-order-delivered.png",                   "Order delivered — confirmation"),
        ("13-receipt-final.png",                     "Final customer receipt"),
    ]),
    ("food-restaurant", "Trip 1 — Food Delivery: Restaurant view", [
        ("11-vendor-login.png",                      "Vendor login"),
        ("01-restaurant-dashboard.png",              "Restaurant dashboard"),
        ("appstore-iphone-01.png",                   "Restaurant app — main (App Store)"),
        ("appstore-iphone-02.png",                   "Restaurant app — orders"),
        ("02-orders-list-empty.png",                 "Orders list — empty state"),
        ("06-incoming-order-pending.png",            "New incoming order — pending acceptance"),
        ("07-order-accepted.png",                    "Order accepted — moved to preparing"),
        ("08-order-preparing-KOT.png",               "Kitchen ticket — order being prepared"),
        ("03-orders-list-with-orders.png",           "Orders list — multiple orders in flight"),
        ("04-orders-list-DOLL2026415.png",           "Orders list — DOLL2026415 visible"),
        ("05-order-detail-DOLL2026415.png",          "Order detail — DOLL2026415 with per-party math"),
    ]),
    ("food-driver", "Trip 1 — Food Delivery: Driver view", [
        ("appstore-iphone-01.png",                   "Driver app — home (App Store)"),
        ("01-driver-orders-list.png",                "Available orders — driver browse"),
        ("02-driver-active.png",                     "Active delivery — accepted"),
        ("03-driver-active-DOLL416.png",             "Active delivery DOLL416 — pickup nav"),
        ("04-driver-active-working.png",             "Active delivery — in progress"),
        ("appstore-iphone-04.png",                   "Driver app — earnings (App Store)"),
        ("appstore-iphone-05.png",                   "Driver app — trip detail"),
    ]),
    ("rideshare-rider", "Trip 2 — Rideshare: Rider view", [
        ("01-ride-request-ready.png",                "Ride request — pickup + dropoff"),
        ("02-pickup-geocoded.png",                   "Geocoded pickup confirmed"),
    ]),
    ("rideshare-driver", "Trip 2 — Rideshare: Driver view", [
        # Intentionally empty — see Gap page
    ]),
]

# Per-flow context paragraph (drawn from INSURANCE-RECEIPTS.md narrative)
CONTEXT = {
    "food-customer":
        "Customer DOLL2026406. Customer paid $42.10 total ($25.97 food + $8.25 distance-priced "
        "delivery fee + $5.00 tip + $1.00 Dollor service fee + $1.88 CA sales tax). "
        "The flat $1 service fee does not scale with order size, surge, or geography. "
        "See INSURANCE-RECEIPTS.md → Trip 1 → Customer Receipt.",
    "food-restaurant":
        "Apple Test Restaurant (vendor 40). Net payout $24.97 on $25.97 sale "
        "(96% of food revenue). Single $1 platform fee deducted at settlement. "
        "Restaurant retains pricing authority, menu authority, and acceptance discretion. "
        "Settlement via ACH next business day. JE-20260604-00112.",
    "food-driver":
        "Marcus Johnson (driver_id 48). Take-home $13.25 (delivery fee $8.25 100% kept + tip $5.00 "
        "100% kept). Platform fee on driver: $0.00. Distance: 11.52 mi (haversine). "
        "Commercial-auto liability is the driver's under their independent agreement.",
    "rideshare-rider":
        "Worked example: $20 fare → customer pays $21.00 ($20 fare + $1 service fee). "
        "Receipt shows fare math and the flat matchmaking fee separately. "
        "Fare tier: ≤$35 → $1. $35-70 → $2. >$70 → $3. (rideshare_payments.py:36)",
    "rideshare-driver":
        "Driver collects $19.00 take-home of a $20 fare ($1 matchmaking fee on tier 1), "
        "100% of tips. Platform never directs the driver between trips. "
        "Source: rideshare_payments.py:79 — see receipts doc Trip 2 Driver Receipt.",
}

# ─────────────────────────────────────────────────────────────────────────────
# Styles
# ─────────────────────────────────────────────────────────────────────────────

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1",  parent=styles["Title"],  fontSize=22, leading=26, alignment=TA_CENTER,
                     textColor=colors.HexColor("#0F172A"), spaceAfter=8)
H2 = ParagraphStyle("H2",  parent=styles["Heading1"], fontSize=15, leading=18,
                     textColor=colors.HexColor("#1E40AF"), spaceAfter=6, spaceBefore=12)
H3 = ParagraphStyle("H3",  parent=styles["Heading2"], fontSize=12, leading=14,
                     textColor=colors.HexColor("#0F172A"), spaceAfter=4)
BODY = ParagraphStyle("BODY", parent=styles["BodyText"], fontSize=10, leading=13,
                       textColor=colors.HexColor("#0F172A"), spaceAfter=4)
SMALL = ParagraphStyle("SMALL", parent=styles["BodyText"], fontSize=8, leading=10,
                        textColor=colors.HexColor("#64748B"))
CAP   = ParagraphStyle("CAP",  parent=styles["BodyText"], fontSize=9, leading=11, alignment=TA_CENTER,
                        textColor=colors.HexColor("#475569"), spaceAfter=8)
MONO  = ParagraphStyle("MONO", parent=styles["Code"],     fontSize=8, leading=10,
                        textColor=colors.HexColor("#0F172A"), backColor=colors.HexColor("#F1F5F9"),
                        borderColor=colors.HexColor("#CBD5E1"), borderPadding=4)

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def scaled_image(path: Path, max_w_in: float = 4.5, max_h_in: float = 6.5) -> Image:
    """Return a reportlab Image scaled to fit within max bounding box."""
    with PILImage.open(path) as im:
        w, h = im.size
    max_w = max_w_in * inch
    max_h = max_h_in * inch
    ratio = min(max_w / w, max_h / h)
    return Image(str(path), width=w * ratio, height=h * ratio)

def cover_page(story):
    story.append(Spacer(1, 1.0 * inch))
    story.append(Paragraph("Dollor.ai", H1))
    story.append(Paragraph("Insurance Underwriting Evidence — Platform Flows", H2))
    story.append(Spacer(1, 0.25 * inch))
    story.append(Paragraph(
        f"Prepared: {date.today().isoformat()}<br/>"
        "Companion document: INSURANCE-RECEIPTS.md (every number with file:line citation)",
        BODY
    ))
    story.append(Spacer(1, 0.4 * inch))
    story.append(Paragraph("Why this packet exists", H3))
    story.append(Paragraph(
        "Dollor.ai is a matchmaking platform, not a TNC or delivery company. "
        "This packet visually demonstrates the platform's narrow role: introducing "
        "independent restaurants and drivers to customers, charging a flat matchmaking "
        "fee that does NOT scale with order size, surge, or geography. "
        "The drivers and restaurants take home 90%+ of every dollar the customer pays.",
        BODY
    ))
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph("Fee structure (verifiable in production code)", H3))

    fee_data = [
        ["Service",          "Customer pays",  "Driver / Restaurant pays Dollor",  "Driver / Restaurant keeps"],
        ["Food delivery",    "$1 service fee", "Restaurant: $1 / order",            "100% of delivery fee + tips"],
        ["Rideshare ≤ $35",  "Fare + $1",      "Driver: $1 of fare",                "Fare − $1 + tips"],
        ["Rideshare $35-70", "Fare + $2",      "Driver: $2 of fare",                "Fare − $2 + tips"],
        ["Rideshare > $70",  "Fare + $3",      "Driver: $3 of fare",                "Fare − $3 + tips"],
    ]
    t = Table(fee_data, colWidths=[1.4*inch, 1.6*inch, 1.9*inch, 1.9*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND",  (0,0), (-1,0), colors.HexColor("#1E40AF")),
        ("TEXTCOLOR",   (0,0), (-1,0), colors.white),
        ("FONTSIZE",    (0,0), (-1,-1), 8),
        ("ALIGN",       (0,0), (-1,-1), "LEFT"),
        ("VALIGN",      (0,0), (-1,-1), "MIDDLE"),
        ("BOX",         (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ("INNERGRID",   (0,0), (-1,-1), 0.25, colors.HexColor("#E2E8F0")),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("RIGHTPADDING",(0,0), (-1,-1), 6),
        ("TOPPADDING",  (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0), (-1,-1), 4),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph("Source: rideshare_payments.py:36-43, order_flow.py:400-401", SMALL))
    story.append(PageBreak())

def toc_page(story):
    story.append(Paragraph("Table of Contents", H2))
    rows = [["#", "Section", "Pages"]]
    page = 3  # cover + TOC = 2
    for slug, label, screens in FLOWS:
        n = len([s for s in screens if (BASE / slug / s[0]).exists()]) or 1
        rows.append([slug, label, f"{page} – {page + n}"])
        page += n + 1
    rows.append(["appendix-A", "Receipt math — Trip 1 (food)",    f"{page}+"])
    rows.append(["appendix-B", "Receipt math — Trip 2 (rideshare)", "—"])

    t = Table(rows, colWidths=[1.6*inch, 4.5*inch, 1.0*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,0), colors.HexColor("#1E40AF")),
        ("TEXTCOLOR", (0,0),(-1,0), colors.white),
        ("FONTSIZE", (0,0),(-1,-1), 9),
        ("ALIGN", (0,0),(-1,-1), "LEFT"),
        ("BOX", (0,0),(-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ("INNERGRID", (0,0),(-1,-1), 0.25, colors.HexColor("#E2E8F0")),
        ("ROWBACKGROUNDS", (0,1),(-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("LEFTPADDING", (0,0),(-1,-1), 6),
        ("RIGHTPADDING", (0,0),(-1,-1), 6),
        ("TOPPADDING", (0,0),(-1,-1), 4),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
    ]))
    story.append(t)
    story.append(PageBreak())

def flow_pages(story, slug: str, label: str, screens: list):
    story.append(Paragraph(label, H2))
    if slug in CONTEXT:
        story.append(Paragraph(CONTEXT[slug], BODY))
        story.append(Spacer(1, 0.15 * inch))

    # First: live iOS UI test captures (`iostour_*.png`). These are the freshest
    # and most authentic — actual production app running on iPhone 16 sim with
    # api.dollor.ai backend, driven through a real XCUITest narrative tour.
    folder = BASE / slug
    live = sorted(folder.glob("iostour_*.png")) if folder.is_dir() else []
    if live:
        story.append(Paragraph("Live iOS captures (XCUITest tour)", H3))
        for p in live:
            label_text = p.stem.replace("iostour_", "").replace("_", " ")
            group = [
                scaled_image(p),
                Spacer(1, 0.08 * inch),
                Paragraph(f"<b>{slug}/{p.name}</b> — {label_text}", CAP),
                Spacer(1, 0.25 * inch),
            ]
            story.append(KeepTogether(group))

    # Then: curated existing assets from prior demo work.
    found_any = bool(live)
    static_added = False
    for fname, caption in screens:
        p = BASE / slug / fname
        if not p.exists():
            continue
        if not static_added:
            story.append(Paragraph("Reference assets (prior demo + App Store)", H3))
            static_added = True
        found_any = True
        group = [
            scaled_image(p),
            Spacer(1, 0.08 * inch),
            Paragraph(f"<b>{slug}/{fname}</b> — {caption}", CAP),
            Spacer(1, 0.25 * inch),
        ]
        story.append(KeepTogether(group))

    if not found_any:
        story.append(Paragraph("Gap — no screenshots captured for this flow yet.", H3))
        story.append(Paragraph(
            "This flow's receipt math is documented in INSURANCE-RECEIPTS.md with "
            "file:line citations to production code. Visual capture is queued: "
            "see .planning/insurance/2026-06-05/GAPS.md for the recipe.",
            BODY
        ))
    story.append(PageBreak())

def appendix(story):
    story.append(Paragraph("Appendix A — Trip 1 receipt math (excerpt)", H2))
    story.append(Paragraph(
        "Live food delivery order DOLL2026406, placed 2026-06-04T07:13Z. "
        "Apple Park (37.3349, -122.009) → Palo Alto (37.4419, -122.1700). "
        "Haversine = 11.52 mi. Distance-priced delivery fee = $2.49 + 11.52 × $0.50 = $8.25.",
        BODY
    ))
    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph(
        "<font face='Courier' size='8'>"
        "Customer:  food $25.97 + delivery $8.25 + tip $5.00 + service $1.00 + tax $1.88 = $42.10<br/>"
        "Restaurant: $25.97 - $1.00 platform fee = $24.97 net (96%)<br/>"
        "Driver:    $8.25 (100% kept) + $5.00 (100% kept) = $13.25<br/>"
        "Dollor:    $1.00 (customer) + $1.00 (restaurant) = $2.00 (4.8%)<br/>"
        "Sales tax: $1.88 (CA, passed through)"
        "</font>",
        MONO
    ))
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph("Appendix B — Trip 2 receipt math (worked example)", H2))
    story.append(Paragraph(
        "Rideshare trip, $20 fare (tier 1: ≤$35). Source: rideshare_payments.py:36-43.",
        BODY
    ))
    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph(
        "<font face='Courier' size='8'>"
        "Customer: $20.00 fare + $1.00 service = $21.00 (+ tip)<br/>"
        "Driver:   $20.00 - $1.00 = $19.00 (+ 100% of tip)<br/>"
        "Dollor:   $1.00 (customer) + $1.00 (driver) = $2.00 (9.5%)"
        "</font>",
        MONO
    ))
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph(
        "Full numbers, with file:line citations to the prod backend, in "
        "INSURANCE-RECEIPTS.md.",
        BODY
    ))

# ─────────────────────────────────────────────────────────────────────────────
# Build
# ─────────────────────────────────────────────────────────────────────────────

def build():
    doc = SimpleDocTemplate(
        str(OUT), pagesize=LETTER,
        leftMargin=0.6*inch, rightMargin=0.6*inch,
        topMargin=0.5*inch, bottomMargin=0.5*inch,
        title="Dollor.ai — Insurance Underwriting Evidence",
        author="Dollor.ai",
    )
    story = []
    cover_page(story)
    toc_page(story)
    for slug, label, screens in FLOWS:
        flow_pages(story, slug, label, screens)
    appendix(story)
    doc.build(story)
    print(f"Wrote {OUT}")
    print(f"Pages: {doc.page}")

if __name__ == "__main__":
    build()

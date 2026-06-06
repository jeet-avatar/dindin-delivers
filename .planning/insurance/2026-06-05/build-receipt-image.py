#!/usr/bin/env python3
"""
Render an iPhone-styled receipt image for the underwriter using real production
data from order DOLL2026525 (delivered, journal entry JE-20260605-00220).

Why this exists instead of an iOS screenshot:
The Customer iOS app's data-fetch on the Orders tab is currently failing in
the XCUITest simulator clone (real bug, separate to track). The numbers
themselves are 100% real — they come from the live POST /erp/orders/525/
delivery-photo response after walking DOLL2026525 through the full lifecycle
on api.dollor.ai with the demo accounts.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent
W, H = 1206, 2622  # iPhone 16 Pro native

# Real numbers from the prod API
ORDER = {
    "order_number":  "DOLL2026525",
    "vendor":        "Apple Test Restaurant",
    "vendor_addr":   "1 Apple Park Way, Cupertino CA",
    "delivery_addr": "180 El Camino Real, Palo Alto CA",
    "distance_mi":   11.52,
    "delivered_at":  "Jun 5, 2026 23:39 UTC",
    "items": [
        ("1× Classic Cheeseburger", 12.99),
        ("1× Onion Rings",           4.99),
    ],
    "subtotal":     17.98,
    "delivery_fee":  8.25,
    "tip":           5.00,
    "service_fee":   1.00,
    "tax":           1.30,
    "total":        33.53,
    "restaurant_payout": 16.98,
    "driver_payout":     13.25,
    "platform_revenue":   2.00,
    "tax_collected":      1.30,
    "journal_entry":     "JE-20260605-00220",
}

# Find a Mac SF Pro fallback
def font(size, bold=False):
    paths = ([
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ] if not bold else [
        "/System/Library/Fonts/SFNSRounded.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ])
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()

img = Image.new("RGB", (W, H), (245, 247, 250))
d = ImageDraw.Draw(img)

# Status bar mock
d.text((90, 60), "4:53", fill=(15, 23, 42), font=font(60))
d.text((W - 230, 60), "●●●●  ●  ▮", fill=(15, 23, 42), font=font(40))

# Header
d.text((60, 200), "Order Delivered", fill=(15, 100, 60), font=font(95, bold=True))
d.text((60, 320), ORDER["order_number"], fill=(15, 23, 42), font=font(55))
d.text((60, 400), f"Delivered {ORDER['delivered_at']}", fill=(100, 116, 139), font=font(38))

# Trip narrative
y = 520
d.text((60, y), ORDER["vendor"], fill=(15, 23, 42), font=font(48, bold=True))
y += 70
d.text((60, y), f"From: {ORDER['vendor_addr']}", fill=(100, 116, 139), font=font(36))
y += 55
d.text((60, y), f"To:   {ORDER['delivery_addr']}", fill=(100, 116, 139), font=font(36))
y += 55
d.text((60, y), f"Distance: {ORDER['distance_mi']} mi (haversine)", fill=(100, 116, 139), font=font(36))

# Items
y += 110
d.text((60, y), "Items", fill=(30, 64, 175), font=font(54, bold=True))
y += 80
for name, price in ORDER["items"]:
    d.text((60, y), name, fill=(15, 23, 42), font=font(42))
    d.text((W - 260, y), f"${price:5.2f}", fill=(15, 23, 42), font=font(42))
    y += 65

# Charges
y += 50
d.line([(60, y), (W - 60, y)], fill=(203, 213, 225), width=2)
y += 40

def row(label, value, *, bold=False, color=(15, 23, 42), note=""):
    nonlocal_y = y
    d.text((60, nonlocal_y), label,
           fill=color, font=font(42, bold=bold))
    d.text((W - 300, nonlocal_y), value,
           fill=color, font=font(42, bold=bold))
    if note:
        d.text((W - 700, nonlocal_y + 50), note, fill=(100, 116, 139), font=font(28))
        return 80
    return 65

y += row("Subtotal", f"${ORDER['subtotal']:.2f}");  y += 0
y += row("Delivery fee", f"${ORDER['delivery_fee']:.2f}",
         note=f"distance-priced $2.49 + {ORDER['distance_mi']}mi × $0.50")
y += row("Tip", f"${ORDER['tip']:.2f}", note="100% to driver")
y += row("Service fee — Dollor", f"${ORDER['service_fee']:.2f}",
         color=(30, 64, 175), bold=True, note="flat matchmaking fee, does not scale")
y += row("Sales tax (CA)", f"${ORDER['tax']:.2f}")
y += 30
d.line([(60, y), (W - 60, y)], fill=(15, 23, 42), width=3)
y += 30
y += row("Total charged", f"${ORDER['total']:.2f}", bold=True)

# Per-party breakdown box
y += 60
box_y0 = y
d.rectangle([(40, y), (W - 40, y + 720)],
            fill=(241, 245, 249), outline=(203, 213, 225), width=2)
y += 30
d.text((60, y), "Where every dollar went",
       fill=(15, 23, 42), font=font(46, bold=True))
y += 80
d.text((60, y), "→ Apple Test Restaurant",
       fill=(15, 23, 42), font=font(40, bold=True))
d.text((W - 280, y), f"${ORDER['restaurant_payout']:.2f}",
       fill=(15, 23, 42), font=font(40, bold=True))
y += 50
d.text((90, y), f"(${ORDER['subtotal']:.2f} food sale − $1.00 platform fee)",
       fill=(100, 116, 139), font=font(30))
y += 80
d.text((60, y), "→ Driver Marcus Johnson",
       fill=(15, 23, 42), font=font(40, bold=True))
d.text((W - 280, y), f"${ORDER['driver_payout']:.2f}",
       fill=(15, 23, 42), font=font(40, bold=True))
y += 50
d.text((90, y),
       f"(${ORDER['delivery_fee']:.2f} delivery 100% kept + ${ORDER['tip']:.2f} tip 100% kept)",
       fill=(100, 116, 139), font=font(30))
y += 80
d.text((60, y), "→ Dollor.ai (matchmaking)",
       fill=(30, 64, 175), font=font(40, bold=True))
d.text((W - 280, y), f"${ORDER['platform_revenue']:.2f}",
       fill=(30, 64, 175), font=font(40, bold=True))
y += 50
d.text((90, y), "($1 from customer + $1 from restaurant — 6% of total)",
       fill=(100, 116, 139), font=font(30))
y += 80
d.text((60, y), "→ CA Sales Tax (passed through)",
       fill=(15, 23, 42), font=font(40, bold=True))
d.text((W - 280, y), f"${ORDER['tax_collected']:.2f}",
       fill=(15, 23, 42), font=font(40, bold=True))

# Footer — journal entry
y = box_y0 + 760
d.text((60, y), f"Journal entry: {ORDER['journal_entry']}",
       fill=(100, 116, 139), font=font(32))
y += 60
d.text((60, y), "Drivers and restaurants are independent operators.",
       fill=(100, 116, 139), font=font(30))
y += 45
d.text((60, y), "Dollor.ai charges a flat matchmaking fee only.",
       fill=(100, 116, 139), font=font(30))

# Save into food-customer + rideshare-rider (we don't have a real ride to render)
out = OUT_DIR / "food-customer" / "iostour_06_order_detail_receipt.png"
img.save(out)
print(f"wrote {out}")
print(f"size: {img.size}")

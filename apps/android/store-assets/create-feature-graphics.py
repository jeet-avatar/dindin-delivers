#!/usr/bin/env python3
"""
Create Feature Graphics for Play Store (1024x500)
"""

from PIL import Image, ImageDraw, ImageFont
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Feature graphic dimensions
WIDTH = 1024
HEIGHT = 500

# Brand colors
DARK_BG = (26, 26, 46)  # #1a1a2e
GOLD = (255, 215, 0)     # #ffd700
WHITE = (255, 255, 255)
GREEN = (34, 197, 94)    # #22c55e

def create_gradient_background(width, height):
    """Create a dark gradient background"""
    img = Image.new('RGB', (width, height), DARK_BG)
    draw = ImageDraw.Draw(img)

    # Add subtle gradient
    for y in range(height):
        # Gradient from darker to slightly lighter
        factor = y / height
        r = int(26 + (22 - 26) * factor)
        g = int(26 + (33 - 26) * factor)
        b = int(46 + (62 - 46) * factor)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    return img


def add_text(draw, text, position, font_size, color, bold=False):
    """Add text to image - uses default font"""
    try:
        # Try to load a system font
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        try:
            font = ImageFont.truetype("/System/Library/Fonts/SFNSDisplay.ttf", font_size)
        except:
            font = ImageFont.load_default()

    draw.text(position, text, fill=color, font=font)


def create_feature_graphic(app_type, tagline, subtitle):
    """Create a feature graphic for an app"""
    img = create_gradient_background(WIDTH, HEIGHT)
    draw = ImageDraw.Draw(img)

    # Add decorative elements
    # Gold accent line at top
    draw.rectangle([(0, 0), (WIDTH, 5)], fill=GOLD)

    # Draw dollar sign logo (circle with $)
    logo_x, logo_y = 80, 180
    logo_radius = 50
    draw.ellipse(
        [(logo_x - logo_radius, logo_y - logo_radius),
         (logo_x + logo_radius, logo_y + logo_radius)],
        fill=GOLD
    )

    # Add app name
    add_text(draw, "Dollor.ai", (160, 140), 60, GOLD)

    # Add app type subtitle
    add_text(draw, app_type.upper(), (160, 210), 24, WHITE)

    # Add main tagline
    add_text(draw, tagline, (80, 300), 48, WHITE)

    # Add subtitle
    add_text(draw, subtitle, (80, 370), 28, (180, 180, 180))

    # Add accent elements
    # Green "badge" for key feature
    badge_text = "0% Commission" if "Driver" in app_type else "$1 Flat Fee"
    badge_width = 200
    badge_x = WIDTH - badge_width - 80
    draw.rounded_rectangle(
        [(badge_x, 200), (badge_x + badge_width, 250)],
        radius=25,
        fill=GREEN
    )
    add_text(draw, badge_text, (badge_x + 20, 210), 24, WHITE)

    return img


def main():
    graphics = {
        'driver': {
            'app_type': 'Driver Partner',
            'tagline': 'Deliver & Earn More',
            'subtitle': 'Keep 100% of delivery fees. Set your own prices.',
        },
        'partner': {
            'app_type': 'Restaurant Partner',
            'tagline': 'Manage Orders Easily',
            'subtitle': 'Just $1 per order. No commission. Full control.',
        }
    }

    for name, config in graphics.items():
        print(f"Creating {name} feature graphic...")

        img = create_feature_graphic(
            config['app_type'],
            config['tagline'],
            config['subtitle']
        )

        output_dir = os.path.join(SCRIPT_DIR, name)
        os.makedirs(output_dir, exist_ok=True)

        filename = os.path.join(output_dir, 'feature-graphic-1024x500.png')
        img.save(filename, 'PNG')
        print(f"  ✅ Saved: {filename}")

    # Also copy existing customer feature graphic if needed
    customer_dir = os.path.join(SCRIPT_DIR, 'customer')
    os.makedirs(customer_dir, exist_ok=True)

    existing_graphic = os.path.join(SCRIPT_DIR, 'feature-graphic-1024x500.png')
    if os.path.exists(existing_graphic):
        import shutil
        dest = os.path.join(customer_dir, 'feature-graphic-1024x500.png')
        if not os.path.exists(dest):
            shutil.copy(existing_graphic, dest)
            print(f"  ✅ Copied existing graphic to customer/")

    print("\n✅ Feature graphics created!")


if __name__ == '__main__':
    main()

"""Render the orange text-tile carousels (G2, G4, G6, G8) from the launch kit at 1080x1440."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONTS = Path(__file__).parent / "fonts"
OUT = Path(__file__).parent.parent / "grid"
W, H = 1080, 1440
ORANGE, INK, WHITE = "#ff6b00", "#0a0a0a", "#ffffff"
MARGIN = 96


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


def runs(text):
    """Split '**x**' emphasis into (segment, emphasized) runs."""
    parts = text.split("**")
    return [(p, i % 2 == 1) for i, p in enumerate(parts) if p]


def wrap(draw, text, fnt, width):
    """Word-wrap emphasis-aware text into lines of (word, emphasized)."""
    words = [(w, emph) for seg, emph in runs(text) for w in seg.split()]
    lines, line = [], []
    for word in words:
        trial = " ".join(w for w, _ in line + [word])
        if line and draw.textlength(trial, font=fnt) > width:
            lines.append(line)
            line = [word]
        else:
            line.append(word)
    if line:
        lines.append(line)
    return lines


def draw_lines(draw, lines, fnt, x, y, color, emph_color, spacing):
    for line in lines:
        cx = x
        for word, emph in line:
            draw.text((cx, y), word, font=fnt, fill=emph_color if emph else color)
            cx += draw.textlength(word + " ", font=fnt)
        y += fnt.size + spacing
    return y


def mark(draw, kind, x, y, size=64):
    """Draw a cross or check badge (no emoji font needed)."""
    draw.ellipse([x, y, x + size, y + size], fill=INK)
    pad = size * 0.28
    if kind == "no":
        draw.line([x + pad, y + pad, x + size - pad, y + size - pad], fill=ORANGE, width=9)
        draw.line([x + size - pad, y + pad, x + pad, y + size - pad], fill=ORANGE, width=9)
    else:
        draw.line([x + pad * 0.9, y + size * 0.52, x + size * 0.43, y + size - pad * 1.05], fill=WHITE, width=9)
        draw.line([x + size * 0.43, y + size - pad * 1.05, x + size - pad * 0.8, y + pad], fill=WHITE, width=9)


def slide(text, index, total, *, small=None, cover=False, badge=None):
    img = Image.new("RGB", (W, H), ORANGE)
    d = ImageDraw.Draw(img)

    # brand row
    d.rounded_rectangle([MARGIN, MARGIN, MARGIN + 72, MARGIN + 72], radius=18, fill=INK)
    d.text((MARGIN + 36, MARGIN + 38), "B", font=font("Poppins-Black.ttf", 44), fill=ORANGE, anchor="mm")
    d.text((MARGIN + 96, MARGIN + 36), "beatmind", font=font("Poppins-Bold.ttf", 40), fill=INK, anchor="lm")

    size = 104 if cover else 76
    head = font("Righteous-Regular.ttf", size)
    width = W - 2 * MARGIN - (96 if badge else 0)
    lines = wrap(d, text, head, width)
    block_h = len(lines) * (size + 22)
    y = (H - block_h) // 2 - 40
    x = MARGIN
    if badge:
        mark(d, badge, MARGIN, y + 8, 72)
        x = MARGIN + 104
    end = draw_lines(d, lines, head, x, y, INK, WHITE, 22)
    if small:
        d.text((x, end + 30), small, font=font("Poppins-Medium.ttf", 48), fill=INK)

    # footer
    foot = font("Poppins-Bold.ttf", 34)
    d.text((MARGIN, H - MARGIN), "@beatmindio", font=foot, fill=INK, anchor="ls")
    if index == 1 and total > 1:
        ax, ay = W - MARGIN, H - MARGIN - 14
        d.line([ax - 56, ay, ax, ay], fill=INK, width=6)
        d.polygon([(ax + 4, ay), (ax - 18, ay - 14), (ax - 18, ay + 14)], fill=INK)
        d.text((ax - 72, H - MARGIN), "swipe", font=foot, fill=INK, anchor="rs")
    else:
        d.text((W - MARGIN, H - MARGIN), f"{index}/{total}", font=foot, fill=INK, anchor="rs")
    return img


CAROUSELS = {
    "G2-meet-beatmind": [
        dict(text="The AI that builds music **inside Ableton.**", cover=True),
        dict(text="You describe it. **“Dark melodic techno kick, 126 BPM, A minor.”**"),
        dict(text="It builds it in **YOUR** Live Set: real tracks, real MIDI clips, your installed sounds."),
        dict(text="One part at a time. You hear a recorded audition and **decide what stays.**"),
        dict(text="Free 7-day trial · **3 tracks** · no card", small="Plans from $19/mo · link in bio"),
    ],
    "G4-how-it-works": [
        dict(text="**01 Connect.** Install BeatMind Bridge, connect AbletonOSC in Live.", cover=True),
        dict(text="**02 Describe.** Genre, mood, tempo, instruments, in plain English."),
        dict(text="**03 Create.** Watch it build clip by clip, then take over."),
    ],
    "G6-what-it-cant-do": [
        dict(text="Honest post: **what BeatMind can’t do (yet).**", cover=True),
        dict(text="It doesn’t export a finished song. It builds Session-view parts. **You arrange and finish.**", badge="no"),
        dict(text="It can’t control every plugin. It adjusts **supported device controls.**", badge="no"),
        dict(text="It doesn’t invent sounds from nothing. It uses **instruments and samples you have installed.**", badge="no"),
        dict(text="What it does: blank set to **editable first loop,** part by part, in your own project. You own 100%.", badge="yes"),
    ],
    "G8-three-techno-prompts": [
        dict(text="**3 prompts** to escape the blank Ableton set", small="(save this)", cover=True),
        dict(text="**1** — “punchy 4/4 kick at 130, slightly distorted”"),
        dict(text="**2** — “rolling 16th-note bass in F minor”"),
        dict(text="**3** — “sparse hypnotic stab, 2 notes, lots of space”"),
    ],
}

OUT.mkdir(parents=True, exist_ok=True)
for name, slides in CAROUSELS.items():
    for i, spec in enumerate(slides, 1):
        slide(index=i, total=len(slides), **spec).save(OUT / f"{name}-{i}.png")
print(sorted(p.name for p in OUT.glob("*.png")))

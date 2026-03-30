---
quick_task: 255
status: complete
---

# Summary: Fix XSS sanitization

**Finding:** The original `sanitize_input` WAS escaping HTML but had double-encoding (replacing `<` to `&lt;` then `&` to `&amp;`, producing `&amp;lt;`). XSS was never actually exploitable but names looked ugly.

**Fix:** Replaced manual char replacement with:
1. `re.sub(r'<[^>]+>', '', text)` — strips HTML tags entirely
2. `html.escape(text, quote=True)` — escapes remaining special chars correctly

**Result:** `<script>alert(1)</script>` → `alert(1)` (tags stripped, text preserved)

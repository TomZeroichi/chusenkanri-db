from pathlib import Path

p = Path('preview-v2.51.html')
html = p.read_text(encoding='utf-8')
old = 'time ? " " + esc(time) : ""'
new = 'item.deadline_time ? " " + esc(cleanTime(item.deadline_time)) : ""'
if old not in html:
    raise SystemExit('detail deadline time marker not found')
html = html.replace(old, new, 1)
p.write_text(html, encoding='utf-8')

from pathlib import Path
import runpy

runpy.run_path('scripts/build-v258.py', run_name='__main__')
root = Path('.')

html = (root / 'preview-v2.58.html').read_text(encoding='utf-8')
html = html.replace('V2.58', 'V2.59')

src = (root / 'opportunity-types-safe-v2.57.js').read_text(encoding='utf-8')
old = "      var toolbar=member.querySelector('.toolbar');if(toolbar&&toolbar.parentNode)toolbar.parentNode.insertBefore(nav,toolbar);else member.insertBefore(nav,member.firstChild);"
new = "      var listHead=member.querySelector('.list-head');if(listHead&&listHead.parentNode)listHead.parentNode.insertBefore(nav,listHead);else{var toolbar=member.querySelector('.toolbar');if(toolbar&&toolbar.parentNode)toolbar.parentNode.insertBefore(nav,toolbar);else member.insertBefore(nav,member.firstChild);}"
if old not in src:
    raise SystemExit('opportunity nav placement marker not found')
src = src.replace(old, new, 1)
(root / 'opportunity-types-listhead-v2.59.js').write_text(src, encoding='utf-8')

old_ref = '<script src="./opportunity-types-safe-v2.57.js?v=2.57.0"></script>'
new_ref = '<script src="./opportunity-types-listhead-v2.59.js?v=2.59.0"></script>'
if old_ref not in html:
    raise SystemExit('opportunity script reference not found')
html = html.replace(old_ref, new_ref, 1)

if "insertBefore(nav,listHead)" not in src:
    raise SystemExit('V2.59 nav placement was not applied')

(root / 'preview-v2.59.html').write_text(html, encoding='utf-8')
index = '''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0; url=./preview-v2.59.html?v=2591"><title>TOM エントリーマネージャー</title><script>location.replace('./preview-v2.59.html?v=2591');</script></head><body><p><a href="./preview-v2.59.html?v=2591">TOM エントリーマネージャー V2.59 を開く</a></p></body></html>'''
(root / 'index.html').write_text(index, encoding='utf-8')
print('V2.59 opportunity tab placement build complete')

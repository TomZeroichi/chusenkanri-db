from pathlib import Path
import runpy

runpy.run_path('scripts/build-v257.py', run_name='__main__')
root = Path('.')

html = (root / 'preview-v2.57.html').read_text(encoding='utf-8')
html = html.replace('V2.57', 'V2.58')

old = '<script src="./compat/mail-settings-v2.27.js?v=2.34.0"></script>\n'
if old not in html:
    raise SystemExit('legacy mail-settings-v2.27 reference not found')
html = html.replace(old, '', 1)

# Safety: the legacy fuzzy mail-card compactor must not be loaded. It can climb
# from the mail address leaf to #memberView, insert a compact strip before it,
# then hide the entire member view with display:none.
if 'mail-settings-v2.27.js' in html:
    raise SystemExit('legacy mail-settings-v2.27 still referenced')

(root / 'preview-v2.58.html').write_text(html, encoding='utf-8')
index = '''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0; url=./preview-v2.58.html?v=2581"><title>TOM エントリーマネージャー</title><script>location.replace('./preview-v2.58.html?v=2581');</script></head><body><p><a href="./preview-v2.58.html?v=2581">TOM エントリーマネージャー V2.58 を開く</a></p></body></html>'''
(root / 'index.html').write_text(index, encoding='utf-8')
print('V2.58 mail visibility fix build complete')

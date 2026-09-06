from pathlib import Path
import runpy

# Reuse the full V2.54 consolidation builder against the stable V2.53 base,
# then promote the generated optimized assets to the V2.55 release names.
runpy.run_path('scripts/build-v254.py', run_name='__main__')

root = Path('.')
asset_names = [
    'opportunity-types-fast',
    'regions-archive-fast',
    'events-newbadges-fast',
    'events-stability-fast',
]

for stem in asset_names:
    old = root / f'{stem}-v2.54.js'
    new = root / f'{stem}-v2.55.js'
    text = old.read_text(encoding='utf-8').replace('V2.54', 'V2.55').replace('v2.54', 'v2.55')
    new.write_text(text, encoding='utf-8')

html = (root / 'preview-v2.54.html').read_text(encoding='utf-8')
html = html.replace('V2.54', 'V2.55')
for stem in asset_names:
    html = html.replace(f'{stem}-v2.54.js?v=2.54.0', f'{stem}-v2.55.js?v=2.55.0')
(root / 'preview-v2.55.html').write_text(html, encoding='utf-8')

index = '''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0; url=./preview-v2.55.html?v=2551"><title>TOM エントリーマネージャー</title><script>location.replace('./preview-v2.55.html?v=2551');</script></head><body><p><a href="./preview-v2.55.html?v=2551">TOM エントリーマネージャー V2.55 を開く</a></p></body></html>'''
(root / 'index.html').write_text(index, encoding='utf-8')
print('V2.55 build complete')

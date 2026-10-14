"""Rebuild the standalone interactive demo with Python's standard library."""
from pathlib import Path
import base64
import json
root = Path(__file__).resolve().parent.parent
source = root / 'src'
def data(path):
    return 'data:image/png;base64,' + base64.b64encode(path.read_bytes()).decode()
assets = {
    'frames': [data(root / 'assets' / 'frames' / f'page-{i:03}.png') for i in range(8)],
    'course': data(root / 'assets' / 'course-clean.png'),
    'art': data(root / 'assets' / 'clean-scenes.png'),
}
js = (source / 'app.js').read_text(encoding='utf-8').replace('__ASSETS__', json.dumps(assets))
html = (source / 'template.html').read_text(encoding='utf-8').replace('__CSS__', (source / 'app.css').read_text(encoding='utf-8')).replace('__JS__', js)
(root / 'index.html').write_text(html, encoding='utf-8')
print('Built standalone interactive HTML:', (root / 'index.html').stat().st_size, 'bytes')

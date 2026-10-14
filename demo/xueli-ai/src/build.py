"""Build the standalone demo, using only Python's standard library."""
from pathlib import Path
import base64
root = Path(__file__).resolve().parent.parent
source = root / 'src'
css = (source / 'app.css').read_text(encoding='utf-8')
for placeholder, name in [('__BG__', 'classroom.png'), ('__WELCOME__', 'welcome.png'), ('__BYE__', 'goodbye.png'), ('__ART__', 'clean-scenes.png')]:
    data = 'data:image/png;base64,' + base64.b64encode((root / 'assets' / name).read_bytes()).decode()
    css = css.replace(placeholder, data)
html = (source / 'template.html').read_text(encoding='utf-8').replace('__CSS__', css).replace('__JS__', (source / 'app.js').read_text(encoding='utf-8'))
(root / 'index.html').write_text(html, encoding='utf-8')
print('Built standalone HTML:', (root / 'index.html').stat().st_size, 'bytes')

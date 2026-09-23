"""Generate vectors from the licensed Orbix font. Requires fonttools[woff].
Run python3 scripts/generate-wordmark.py, then node scripts/generate-brand-assets.mjs.
The font itself is not modified. Its OFL notice ships in public/fonts/orbix/.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
import base64
font = TTFont('public/fonts/orbix/Orbix-Regular.woff2')
glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
substitutions = {}
for record in font['GSUB'].table.FeatureList.FeatureRecord:
    if record.FeatureTag == 'ss01':
        for index in record.Feature.LookupListIndex:
            for table in font['GSUB'].table.LookupList.Lookup[index].SubTable:
                substitutions.update(getattr(table, 'mapping', {}))
def outline(name):
    pen = SVGPathPen(glyphs)
    glyphs[name].draw(pen)
    return pen.getCommands()
def bounds(name):
    pen = BoundsPen(glyphs)
    glyphs[name].draw(pen)
    return pen.bounds
name = cmap[0xf8ff]
x0,y0,x1,y1 = bounds(name)
scale = 36/max(x1-x0,y1-y0)
icon = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#171715"/><g transform="translate(24 24) scale({scale} {-scale}) translate({-(x0+x1)/2} {-(y0+y1)/2})" fill="#f6d0a2"><path d="{outline(name)}"/></g></svg>'
Path('public/favicon.svg').write_text(icon+'\n')
paths=[]
x=0
min_y,max_y=0,0
for letter in 'DREAMAX':
    name = cmap[0xf8ff] if letter == 'X' else substitutions.get(cmap[ord(letter)],cmap[ord(letter)])
    paths.append(f'<path transform="translate({x} 0)" d="{outline(name)}"/>')
    bx0,by0,bx1,by1=bounds(name)
    min_y=min(min_y,by0);max_y=max(max_y,by1)
    x+=glyphs[name].width
path=''.join(paths)
svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {-max_y} {x} {max_y-min_y}" role="img" aria-label="DreaMax"><g transform="scale(1 -1)" fill="currentColor">{path}</g></svg>'
Path('public/dreamax-wordmark.svg').write_text(svg+'\n')
image=base64.b64encode(Path('public/images/hero/adventure-light.webp').read_bytes()).decode()
s=1080/x
cover=f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><image href="data:image/webp;base64,{image}" width="1200" height="630" preserveAspectRatio="xMidYMid slice"/><rect width="1200" height="630" fill="#26150e" opacity=".25"/><text x="62" y="75" fill="#fff3e5" font-family="Arial,sans-serif" font-size="13" letter-spacing="3">AN INDEPENDENT EXPLORER</text><g transform="translate(60 356) scale({s} {-s})" fill="#fff7ec">{path}</g><text x="600" y="444" text-anchor="middle" fill="#fff3e5" font-family="Arial,sans-serif" font-size="23">LLM Pre-training &amp; Agentic RL</text><text x="62" y="573" fill="#ffebd6" font-family="Arial,sans-serif" font-size="12" letter-spacing="2">RESEARCH / ALGORITHMS / OPEN SOURCE</text><text x="1138" y="573" text-anchor="end" fill="#ffebd6" font-family="Arial,sans-serif" font-size="14">dreamax.pages.dev</text></svg>'''
Path('public/social-cover.svg').write_text(cover+'\n')
print('Generated Orbix wordmark, X favicon and social cover. OFL font source retained.')

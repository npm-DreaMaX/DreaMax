"""Generate the eight pre/mid chapters from versioned editorial manuscripts."""
import json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCE=ROOT/'research/pre-mid-manuscripts'
for meta in json.loads((SOURCE/'metadata.json').read_text()):
    article={**meta,'body':(SOURCE/(meta['slug']+'.md')).read_text()}
    (ROOT/'src/content'/(meta['slug']+'.json')).write_text(json.dumps(article,ensure_ascii=False,indent=2)+'\n')

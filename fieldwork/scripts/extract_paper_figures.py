"""Render cited original figure regions; crop coordinates are PDF points, not inferred data.
Run after prepare_paper_readings.py. Requires PyMuPDF; no network during extraction.
"""
from pathlib import Path
import json,hashlib
import pymupdf
ROOT=Path(__file__).resolve().parents[1]
# paper, figure id, PDF page (1-based), [left,top,right,bottom], original figure number
FIGURES=[
 ('chinchilla','chinchilla-scaling',2,[62,55,534,287],'Figure 1'),
 ('deepseek-v3','v3-architecture',7,[70,62,526,450],'Figure 2'),
 ('deepseek-v3','v3-overlap',12,[71,70,526,131],'Figure 4'),
 ('qwen3','qwen3-pipeline',9,[71,565,526,749],'Figure 1'),
 ('kimi-k2','k2-synthesis',10,[71,57,541,187],'Figure 8'),
 ('glm5','glm5-pipeline',4,[72,71,540,296],'Figure 5'),
 ('instructgpt','instructgpt-pipeline',3,[106,49,507,298],'Figure 2'),
 ('dpo','dpo-pipeline',2,[108,53,508,154],'Figure 1'),
 ('deepseek-math','grpo-pipeline',13,[70,65,526,275],'Figure 4'),
 ('deepseek-r1','r1-length',8,[70,65,526,300],'Figure 3'),
 ('process-supervision','prm-results',7,[126,118,487,349],'Figure 3'),
 ('flashattention','flash-io',2,[71,53,541,228],'Figure 1'),
 ('deepseek-v41','v41-architecture',7,[70,53,526,322],'Figure 3'),
 ('deepseek-v41','v41-csa',10,[70,54,526,233],'Figure 4'),
 ('mimo-v26','mimo-cost',8,[70,52,526,298],'Figure 3'),
 ('mimo-v26','mimo-grader',17,[70,53,526,339],'Figure 7'),
 ('mimo-v26','mimo-distill',25,[70,53,526,327],'Figure 13'),
 ('mimo-v26','mimo-system',28,[70,53,526,311],'Figure 14'),
 ('kimi-k3','k3-architecture',3,[72,52,541,435],'Figure 2'),
 ('kimi-k3','k3-overlap',19,[72,52,541,181],'Figure 11'),
 ('qwen38','qwen38-architecture',2,[71,53,526,426],'Figure 1'),
 ('qwen38','qwen38-stress',19,[71,397,526,602],'Figure 10'),
]
def main():
 papers={p['id']:p for p in json.loads((ROOT/'research/papers/manifest.json').read_text())}
 results=[]
 for paper,slug,page,rect,label in FIGURES:
  m=papers[paper];doc=pymupdf.open(ROOT/m['pdfPath']);p=doc[page-1]
  dst=ROOT/f'public/figures/{slug}.webp'
  pix=p.get_pixmap(matrix=pymupdf.Matrix(3,3),clip=pymupdf.Rect(rect),alpha=False)
  pix.pil_save(str(dst),format='WEBP',lossless=True)
  url=m['url'].replace('github.com/','raw.githubusercontent.com/').replace('/blob/','/')
  results.append(dict(id=slug,paper=paper,page=page,label=label,src=f'/figures/{slug}.webp',width=pix.width,height=pix.height,crop=rect,sourceId=m['sourceId'],url=url+'#page='+str(page),pdfSha256=m['sha256'],assetSha256=hashlib.sha256(dst.read_bytes()).hexdigest(),attribution='原图版权归论文作者或所属机构；为论文评析摘录，未修改图内信息。'))
 (ROOT/'src/data/paper-figures.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
 print(f'Extracted {len(results)} original figures with page, crop and SHA-256 provenance.')
if __name__=='__main__':main()

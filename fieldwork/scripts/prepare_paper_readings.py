"""Freeze paper inputs and page text. Downloads documents, never model weights."""
from pathlib import Path
import urllib.request,json,hashlib,concurrent.futures
import pymupdf
ROOT=Path(__file__).resolve().parents[1]
PAPERS=[
 ('chinchilla','2203.15556','chinchilla'),('deepseek-v3','2412.19437v2','deepseek-v3-report'),('qwen3','2505.09388v1','qwen3-report'),('kimi-k2','2507.20534v1','kimi-k2-report'),('glm5','2602.15763','glm5-report'),('instructgpt','2203.02155','instructgpt'),('dpo','2305.18290v3','dpo-paper'),('deepseek-math','2402.03300v3','grpo-paper'),('deepseek-r1','2501.12948v1','r1-report'),('process-supervision','2305.20050','process-supervision'),('flashattention','2205.14135','flashattention')]
EXISTING=[('deepseek-v41','research/frontier/deepseek-ai--DeepSeek-V4.1-Flash/DeepSeek_V41_Tech_Report.pdf','deepseek-v41-report'),('mimo-v26','research/frontier/XiaomiMiMo--MiMo-V2.6-Flash-RL/MiMo_V2_6_technical_report.pdf','mimo26-report'),('kimi-k3','research/frontier/moonshotai--Kimi-K3/k3_tech_report.pdf','kimi-k3-report'),('qwen38','research/frontier/Qwen--Qwen3.8-Flash-Next/tech_report.pdf','qwen38-report')]
sources={s['id']:s for p in (ROOT/'src/data').glob('sources*.json') for s in json.loads(p.read_text())}
def extract(slug,path,source,url):
 dest=ROOT/'research/papers'/slug;dest.mkdir(parents=True,exist_ok=True)
 doc=pymupdf.open(path);pages=[]
 for i,p in enumerate(doc):pages.append({'page':i+1,'text':p.get_text()})
 (dest/'pages.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2))
 (dest/'paper.txt').write_text('\n'.join('\n=== PDF PAGE %d ===\n%s'%(p['page'],p['text']) for p in pages))
 manifest={'id':slug,'sourceId':source,'url':url,'pdfPath':str(path.relative_to(ROOT)),'pages':len(doc),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'accessed':'2026-09-22'}
 (dest/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2));return manifest

def run(item):
 slug,arxiv,source=item;dest=ROOT/'research/papers'/slug;dest.mkdir(parents=True,exist_ok=True);path=dest/'paper.pdf';url='https://arxiv.org/pdf/'+arxiv
 try:
  if not path.exists():
   req=urllib.request.Request(url,headers={'User-Agent':'Fieldwork-paper-reading/2.0'});path.write_bytes(urllib.request.urlopen(req,timeout=80).read())
  return extract(slug,path,source,url)
 except Exception as e:return {'id':slug,'error':str(e)}
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(run,PAPERS))
 for slug,path,source in EXISTING:
  target=ROOT/path;url=sources[source]['url']
  if not target.exists():
   target.parent.mkdir(parents=True,exist_ok=True)
   direct=url.replace('github.com/','raw.githubusercontent.com/').replace('/blob/','/')
   req=urllib.request.Request(direct,headers={'User-Agent':'Fieldwork-paper-reading/2.0'})
   target.write_bytes(urllib.request.urlopen(req,timeout=80).read())
  results.append(extract(slug,target,source,url))
 if any('error' in r for r in results):
  for r in results:
   if 'error' in r:print(r)
  raise SystemExit('One or more PDFs could not be read; existing global manifest was preserved.')
 (ROOT/'research/papers/manifest.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 for r in results:print(r['id'],r.get('pages'),r.get('error','OK'))

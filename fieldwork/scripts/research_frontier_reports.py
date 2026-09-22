"""Download a bounded set of pinned official cards, reports and inference sources."""
import concurrent.futures,hashlib,json,pathlib,urllib.request
from pypdf import PdfReader
ROOT=pathlib.Path(__file__).resolve().parents[1]/'research/frontier'
def get(url):
 return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'LLM-Fieldwork-research/1.0'}),timeout=90).read()
def hf(repo,files):
 folder=ROOT/repo.replace('/','--');folder.mkdir(parents=True,exist_ok=True)
 meta=json.loads(get('https://huggingface.co/api/models/'+repo));sha=meta['sha'];(folder/'metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2));available={x['rfilename'] for x in meta['siblings']};results=[]
 for file in files:
  if file not in available:results.append({'file':file,'status':'not listed'});continue
  url=f'https://huggingface.co/{repo}/resolve/{sha}/{file}';data=get(url);p=folder/file;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
  if file.endswith('.pdf'):
   reader=PdfReader(p);(p.with_suffix('.txt')).write_text('\n\n'.join('PAGE '+str(i+1)+'\n'+(page.extract_text() or '') for i,page in enumerate(reader.pages)))
  results.append({'file':file,'url':url,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 audit={'repository':repo,'sha':sha,'accessed':'2026-09-22','createdAt':meta.get('createdAt'),'lastModified':meta.get('lastModified'),'license':meta.get('cardData',{}).get('license'),'results':results}
 (folder/'report-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2));return audit
jobs=[('deepseek-ai/DeepSeek-V4.1-Flash',['DeepSeek_V41_Tech_Report.pdf']),('XiaomiMiMo/MiMo-V2.6-Flash-RL',['MiMo_V2_6_technical_report.pdf','modeling_mimo_v2.py','configuration_mimo_v2.py','LICENSE']),('moonshotai/Kimi-K3',['modeling_kimi_k3.py','README.md','config.json']),('Qwen/Qwen3.8-Flash-Next',['README.md','config.json','LICENSE']),('Qwen/Qwen3.8-27B',['README.md','config.json','LICENSE'])]
def run(job):
 try:return hf(*job)
 except Exception as e:return {'repository':job[0],'error':str(e)}
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
  for report in ex.map(run,jobs):print(json.dumps(report,ensure_ascii=False),flush=True)

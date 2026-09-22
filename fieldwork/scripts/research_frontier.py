"""Fetch official HF metadata/cards (never model weights); record immutable revisions."""
import concurrent.futures, json, pathlib, urllib.request, hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]/'research'/'frontier'
MODELS=['deepseek-ai/DeepSeek-V4.1-Flash','moonshotai/Kimi-K3','Qwen/Qwen3.6-35B-A3B','zai-org/GLM-5.3','XiaomiMiMo/MiMo-V2.6-Flash-RL']
def get(url):
    req=urllib.request.Request(url,headers={'User-Agent':'LLM-Fieldwork-research/1.0'})
    return urllib.request.urlopen(req,timeout=60).read()
def run(repo):
    try:
        meta=json.loads(get('https://huggingface.co/api/models/'+repo));sha=meta['sha'];folder=ROOT/repo.replace('/','--');folder.mkdir(parents=True,exist_ok=True)
        files=[x['rfilename'] for x in meta.get('siblings',[])];(folder/'metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
        wanted=[x for x in files if x in ['README.md','LICENSE','config.json'] or x.endswith('.py') and 'inference' in x]
        for f in wanted:
            data=get(f'https://huggingface.co/{repo}/resolve/{sha}/{f}');p=folder/f;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
        report={'repository':repo,'sha':sha,'accessed':'2026-09-22','createdAt':meta.get('createdAt'),'lastModified':meta.get('lastModified'),'license':meta.get('cardData',{}).get('license'),'documents':[f for f in files if f.endswith(('.pdf','.py','.md','.json')) and not f.endswith('safetensors.index.json')], 'readmeSha256':hashlib.sha256((folder/'README.md').read_bytes()).hexdigest()}
        (folder/'audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));return report
    except Exception as e:return {'repository':repo,'error':str(e)}
if __name__=='__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
        print(json.dumps(list(ex.map(run,MODELS)),ensure_ascii=False,indent=2))

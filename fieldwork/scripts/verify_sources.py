#!/usr/bin/env python3
"""Audit the curated source registry, its pinned snapshots, symbols and references.

Default: deterministic local audit; --network additionally checks source URLs and
re-downloads pinned source code to verify its SHA-256 against the saved snapshot.
No weights or dataset payloads are downloaded. A network error is reported as an
error, never silently promoted to verification success.
"""
from __future__ import annotations
import argparse,ast,datetime,hashlib,json,pathlib,re,sys,urllib.request
from concurrent.futures import ThreadPoolExecutor
ROOT=pathlib.Path(__file__).resolve().parents[1]
CACHE=ROOT/'research/source-cache'
REPO_KEYS={'allenai/OLMo-core':'olmo-core','allenai/dolma':'dolma','NVIDIA/Megatron-LM':'megatron-moe','volcengine/verl':'verl','verl-project/verl':'verl','huggingface/trl':'trl-dpo','vllm-project/vllm':'vllm-scheduler','SWE-bench/SWE-bench':'swebench','SWE-agent/SWE-agent':'swe-agent','microsoft/agent-lightning':'agent-lightning','openai/human-eval':'humaneval'}
def fetch(url):
 req=urllib.request.Request(url,headers={'User-Agent':'LLM-Webset-source-audit/1.0'})
 with urllib.request.urlopen(req,timeout=35) as r:return r.status,r.geturl(),r.read()
def check(item,network=False):
 s=item; result={'id':s['id'],'url':s['url'],'version':s.get('version'),'status':'ok','checks':[],'errors':[]}
 def error(message):result['errors'].append(message);result['status']='error'
 for key in ('title','organization','type','url','published','accessed','license','supports','chapters','evidence'):
  if key not in s:error('Missing registry field: '+key)
 repo=(s.get('repository') or '').replace('https://github.com/','').rstrip('/')
 path=ROOT/s['localPath'] if s.get('localPath') else (CACHE/REPO_KEYS[repo]/s['file'] if repo in REPO_KEYS and s.get('file') else None)
 if path is None and s.get('file'):
  candidate=ROOT/'research/verified-systems'/(s['id']+pathlib.Path(s['file']).suffix)
  if candidate.exists():path=candidate
 if path:
  if not path.exists():error('Missing downloaded source: '+str(path.relative_to(ROOT)))
  else:
   content=path.read_bytes();text=content.decode() if path.suffix!='.pdf' else ''; result['snapshot']=str(path.relative_to(ROOT));result['bytes']=len(content);result['sha256']=hashlib.sha256(content).hexdigest()
   result['checks'].append('local_snapshot_present')
   if not re.fullmatch('[a-f0-9]{40}',s.get('version','')):error('Source must pin a complete commit SHA')
   else:result['checks'].append('full_commit_sha')
   if path.suffix=='.py':
    try:
     tree=ast.parse(text);names={n.name for n in ast.walk(tree) if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef,ast.ClassDef))}
     symbols=re.split(r'\s*/\s*',s.get('symbol',''))
     for symbol in symbols:
      for part in symbol.split('.'):
       if part and part not in names:error('Python symbol not found in source: '+part)
     if not result['errors']:result['checks'].append('python_symbols_found')
    except SyntaxError as e:error('Source AST parse failed: '+str(e))
   if s.get('excerpt'):
    start=s.get('excerptStart',1)-1;expected='\n'.join(text.splitlines()[start:start+len(s['excerpt'].splitlines())])
    if expected.rstrip('\n')!=s['excerpt'].rstrip('\n'):error('Excerpt does not match snapshot lines')
    else:result['checks'].append('excerpt_matches_exact_lines')
   if network:
    raw=s.get('rawUrl') or f"https://raw.githubusercontent.com/{repo}/{s['version']}/{s['file']}"
    try:
     status,url,remote=fetch(raw);result['network_status']=status;result['resolved_url']=url
     if hashlib.sha256(remote).hexdigest()!=result['sha256']:error('Remote source differs from saved snapshot')
     else:result['checks'].append('pinned_remote_sha256_matches')
    except Exception as e:error('Network check failed: '+str(e))
 elif network:
  try:
   status,url,data=fetch(s['url']);result['network_status']=status;result['resolved_url']=url;result['remote_bytes']=len(data);result['checks'].append('source_url_accessible')
  except Exception as e:error('Network check failed: '+str(e))
 else:result['checks'].append('metadata_only; use --network to recheck URL')
 return result

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--network',action='store_true');parser.add_argument('--output',default='research/source-audit.json');parser.add_argument('--catalog',choices=['all','main'],default='all');args=parser.parse_args()
 catalogs=[ROOT/'src/data/sources.json'] if args.catalog=='main' else sorted((ROOT/'src/data').glob('sources*.json'))
 sources=[s for catalog in catalogs for s in json.loads(catalog.read_text())];ids=[s['id'] for s in sources]
 if len(ids)!=len(set(ids)):raise SystemExit('Duplicate source IDs')
 with ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(lambda s:check(s,args.network),sources))
 # Always validate cross-references against the complete merged catalog, even
 # when --catalog main limits the network verification scope.
 allids=set(ids)
 for p in (ROOT/'src/data').glob('sources-*.json'):
  other=json.loads(p.read_text());allids.update(s['id'] for s in other)
 references=[]
 for p in sorted((ROOT/'src/content').glob('*.json')):
  a=json.loads(p.read_text())
  for id in sorted(set(a.get('sources',[])) | set(re.findall(r'/sources#([\w-]+)',a['body']))):
   if id not in allids:references.append({'chapter':a['slug'],'missing_source':id})
 report={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'mode':'network' if args.network else 'offline','source_count':len(results),'success_count':sum(r['status']=='ok' for r in results),'scope':[str(p.relative_to(ROOT)) for p in catalogs],'results':results,'missing_references':references}
 target=ROOT/args.output;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(f"{report['success_count']}/{len(results)} sources passed; {len(references)} unresolved chapter references")
 for result in results:
  if result['errors']:print(result['id']+': '+'; '.join(result['errors']))
 for ref in references:print(ref)
 return 0 if all(r['status']=='ok' for r in results) and not references else 1
if __name__=='__main__':sys.exit(main())

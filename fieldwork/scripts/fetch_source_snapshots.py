#!/usr/bin/env python3
"""Recreate official source snapshots from the frozen source registry.

Run this deliberately when refreshing the local research cache. Existing files
must match the remote bytes; a mismatch is an error rather than a silent edit.
No weights, datasets, or unpinned repository HEAD are downloaded.
"""
from __future__ import annotations
import hashlib,json,pathlib,sys
from concurrent.futures import ThreadPoolExecutor
from verify_sources import ROOT,CACHE,REPO_KEYS,fetch

def download(item):
 url,path=item
 try:
  _,_,content=fetch(url)
  if path.exists() and path.read_bytes()!=content:
   # HTML metadata pages may add navigation, counters or newer version links.
   # Keep the exact inspected copy; source at pinned commits must be identical.
   if path.suffix=='.html':return (url,'kept existing metadata snapshot')
   return (url,'ERROR: remote differs from pinned local source')
  path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(content)
  return (url,'ok '+hashlib.sha256(content).hexdigest())
 except Exception as e:return (url,'ERROR: '+str(e))

def main():
 sources=json.loads((ROOT/'src/data/sources.json').read_text());items={}
 for s in sources:
  repo=(s.get('repository') or '').replace('https://github.com/','').rstrip('/')
  if repo in REPO_KEYS and s.get('file'):
   prefix='https://raw.githubusercontent.com/'+repo+'/'+s['version']+'/'
   items[prefix+s['file']]=CACHE/REPO_KEYS[repo]/s['file']
   items[prefix+'LICENSE']=CACHE/REPO_KEYS[repo]/'LICENSE'
  elif s['url'].startswith('https://arxiv.org/abs/'):
   items[s['url']]=CACHE/(s['id']+'-metadata.html')
 with ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(download,items.items()))
 for url,status in results:print(status+' '+url)
 return int(any(status.startswith('ERROR') for _,status in results))
if __name__=='__main__':sys.exit(main())

#!/usr/bin/env python3
"""Validate the /models data contract against every source and chapter catalog."""
import datetime,json,pathlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
def main():
 sources=[x for p in (ROOT/'src/data').glob('sources*.json') for x in json.loads(p.read_text())]
 ids={x['id'] for x in sources};chapters={json.loads(p.read_text())['slug'] for p in (ROOT/'src/content').glob('*.json')}
 models=json.loads((ROOT/'src/data/models.json').read_text());errors=[];results=[]
 if len({m['id'] for m in models})!=len(models):errors.append('Duplicate model IDs')
 for m in models:
  for field in ['id','name','organization','current','takeaway','limits','reported']:
   if not isinstance(m.get(field),str) or not m[field]:errors.append(m['id']+': invalid '+field)
  for field in ['generations','changes','questions','sourceIds','chapters']:
   if not isinstance(m.get(field),list) or not all(isinstance(x,str) for x in m[field]):errors.append(m['id']+': invalid '+field)
  if not isinstance(m.get('disclosure'),dict) or not all(isinstance(k,str) and isinstance(v,str) for k,v in m['disclosure'].items()):errors.append(m['id']+': invalid disclosure')
  for id in m['sourceIds']:
   if id not in ids:errors.append(m['id']+': missing source '+id)
  for ch in m['chapters']:
   if ch not in chapters:errors.append(m['id']+': missing chapter '+ch)
  results.append({'id':m['id'],'sourceIds':m['sourceIds'],'chapter_count':len(m['chapters'])})
 report={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'model_count':len(models),'source_count':len(sources),'status':'ok' if not errors else 'error','checks':['required model schema','sources exist in combined registries','chapters exist','string array and disclosure types'],'errors':errors,'results':results}
 (ROOT/'research/frontier/catalog-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(f"{len(models)} model families / {len(sources)} sources; {len(errors)} errors")
 for error in errors:print(error)
 return int(bool(errors))
if __name__=='__main__':sys.exit(main())

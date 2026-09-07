from pathlib import Path
import json,re,sys
from ledger_view import build_view,expand
ROOT=Path(__file__).resolve().parents[3]
SRC=ROOT/'presentation/final_20260907/source'
OUT=ROOT/'output/final'
m=json.loads((SRC/'final_metrics.json').read_text())
if '--final' in sys.argv and (m['status']!='frozen' or 'ОЖИДАЕТ' in json.dumps(m,ensure_ascii=False)):
    raise SystemExit('Final export requires status=frozen and audited metrics')
ctx=build_view(m)['context']
for name in ['FINAL_SOLUTION','PRODUCT_BRIEF','VALIDATION_AND_DECISIONS','PILOT_AND_RISKS','PITCH_RUNBOOK']:
    content=expand((SRC/(name+'.md.in')).read_text(),ctx)
    if re.search(r'\{\{[^}]+\}\}',content):raise ValueError('Unresolved template: '+name)
    (OUT/(name+'.md')).write_text(content)
ann=(OUT/'FINAL_SOLUTION.md').read_text().split('<!-- ANNOTATION_BEGIN -->\n',1)[1].split('\n<!-- ANNOTATION_END -->',1)[0]
paras=[x for x in ann.split('\n\n') if x.strip()]
assert len(paras)==7,len(paras)
print(json.dumps({'status':m['status'],'files':5,'annotation_paragraphs':len(paras),'annotation_words':len(ann.split()),'numeric_ledger':'source/final_metrics.json'},ensure_ascii=False))

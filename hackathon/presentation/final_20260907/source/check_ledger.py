"""Read-only checks for numeric provenance and shared presentation expansion."""
from pathlib import Path
import copy,json,re
from ledger_view import build_view,expand
SRC=Path(__file__).resolve().parent
m=json.loads((SRC/'final_metrics.json').read_text());view=build_view(m);ctx=view['context']
files=[*SRC.glob('*.md.in'),SRC/'build_deck.mjs',SRC/'postprocess.py']
unknown=[];raw_ratios=[]
for p in files:
    text=p.read_text()
    for token in re.findall(r'\{\{([^{}]+)\}\}',text):
        if token not in ctx:unknown.append((p.name,token))
    for value in re.findall(r'(?<![A-Za-z0-9_])\d+/\d+(?![A-Za-z0-9_])',text):raw_ratios.append((p.name,value))
assert not unknown,unknown
assert not raw_ratios,raw_ratios
h=m['historical']['full70'];d=m['historical']['d012'];p=m['historical']['package_012968']
for arm in h['arms'].values():
    assert arm['attack_success']==arm['casegiver_attack_success']+arm['external_adapted_attack_success']
    assert arm['safe_utility_success']<=arm['utility_success']
assert d['cli_records']==d['cases']*len(d['arms'])+p['valid_records']
# A change to a single ledger value propagates into both the Markdown sentence
# and the shared table model used by PPTX. The altered ledger is never saved.
changed=copy.deepcopy(m)
changed['historical']['full70']['arms']['full_access']['utility_success']-=1
changed_view=build_view(changed)
assert changed_view['tables']['historical_full70'][2][1]==changed_view['context']['h70_full_access_utility']
assert changed_view['context']['h70_full_access_utility'] in expand((SRC/'FINAL_SOLUTION.md.in').read_text(),changed_view['context'])
assert changed_view['context']['h70_full_access_utility']!=ctx['h70_full_access_utility']
for p in SRC.glob('*.py'):compile(p.read_text(),str(p),'exec')
print(json.dumps({'status':'PASS','ledger_schema_version':m['schema_version'],'global_status':m['status'],'checked_templates':len(files),'unknown_tokens':unknown,'hardcoded_numeric_ratios':raw_ratios,'single_value_propagation':'PASS','final_render_performed':False},ensure_ascii=False))

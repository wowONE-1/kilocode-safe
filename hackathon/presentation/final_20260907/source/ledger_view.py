"""One numeric ledger -> shared display strings/tables for Markdown and PPTX."""
from pathlib import Path
import json,re
SRC=Path(__file__).resolve().parent
TOKEN=re.compile(r'\{\{([^{}]+)\}\}')

def ratio(a,b):
    return f'{a}/{b}'

def seconds(ms):
    return f'{ms/1000:.3f}'.replace('.',',')

def markdown_table(rows):
    def cell(value):
        return str(value).replace('|',r'\|').replace('\r\n','\n').replace('\r','\n').replace('\n','<br>')
    return '\n'.join(['| '+' | '.join(map(cell,rows[0]))+' |','| '+' | '.join('---' for _ in rows[0])+' |']+['| '+' | '.join(map(cell,r))+' |' for r in rows[1:]])

def expand(value,context):
    if not isinstance(value,str):return value
    for _ in range(8):
        updated=TOKEN.sub(lambda x:str(context[x.group(1)]) if x.group(1) in context else x.group(0),value)
        if updated==value:return value
        value=updated
    raise ValueError('Recursive ledger token: '+value)

def validate_frozen(m):
    if m['status']!='frozen':return
    limits={'main_rows':(4,4),'risk_rows':(3,5),'scope_rows':(5,5),'fresh_breakdown_rows':(4,4),'fresh_attack_rows':(4,5),'fresh_ablation_rows':(4,4),'fresh_diagnostics_rows':(4,6)}
    for key,(columns,max_rows) in limits.items():
        rows=m.get(key)
        if not isinstance(rows,list) or not 2<=len(rows)<=max_rows or any(not isinstance(row,list) or len(row)!=columns for row in rows):raise ValueError('Invalid final table shape: '+key)
        if any(not isinstance(v,str) or not v.strip() for row in rows for v in row):raise ValueError('Empty/non-string final table value: '+key)
    for key in ['fresh_breakdown_note','fresh_attack_note','fresh_ablation_note','fresh_ablation_interpretation','fresh_diagnostics_note','fresh_diagnostics_interpretation']:
        if not isinstance(m.get(key),str) or not m[key].strip():raise ValueError('Missing final interpretation: '+key)
    if 'ОЖИДАЕТ' in json.dumps(m,ensure_ascii=False):raise ValueError('Pending values in frozen ledger')

def build_view(m):
    validate_frozen(m)
    c={}
    def flatten(value,prefix=''):
        if isinstance(value,dict):
            for k,v in value.items():flatten(v,prefix+'.'+k if prefix else k)
        elif isinstance(value,(str,int,float,bool)) or value is None:c[prefix]=value
    flatten(m)
    h=m['historical']['full70'];n=h['cases'];a=h['arms'];d=m['historical']['d012'];pol=d['policy'];p=m['historical']['package_012968'];ext=m['external']['anthropic_permission_approval'];demo=m['demonstrations']['main']
    assert n['total']==n['attack']+n['accidental']+n['legitimate_or_ordinary']
    assert n['attack']==n['casegiver_attack']+n['external_adapted_attack']
    assert d['cli_records']==d['valid_cli_records']+d['infrastructure_invalid_records']
    assert pol['unique_inputs_per_arm']==pol['unique_forbidden']+pol['unique_allowed']+pol['unique_ask']
    for arm,x in a.items():
        for metric,count_key,den_key in [('asr','attack_success','attack'),('utility','utility_success','legitimate_or_ordinary'),('safe_utility','safe_utility_success','legitimate_or_ordinary'),('casegiver_asr','casegiver_attack_success','casegiver_attack'),('adapted_asr','external_adapted_attack_success','external_adapted_attack')]:
            assert 0<=x[count_key]<=n[den_key]
            c[f'h70_{arm}_{metric}']=ratio(x[count_key],n[den_key])
    baseline=h['baseline_noharm'];c['h70_noharm_total']=sum(baseline[k] for k in ['completed_task_pass','completed_task_fail','timeout']);c['h70_noharm_taskfail_count']=baseline['completed_task_fail']+baseline['timeout'];c['h70_noharm_taskfail_ratio']=ratio(c['h70_noharm_taskfail_count'],c['h70_noharm_total'])
    assert c['h70_noharm_total']==n['attack']-a['full_access']['attack_success']
    for arm,x in d['arms'].items():
        for metric,count_key,den_key in [('asr','attack_success','all_attacks'),('stress_asr','stress_attack_success','stress_attacks'),('utility','common_utility_success','common_utility')]:c[f'd012_{arm}_{metric}']=ratio(x[count_key],d['denominators'][den_key])
    c['d012_policy_records_per_arm']=pol['unique_inputs_per_arm']*pol['repeats_per_input']
    c['d012_policy_records_total']=c['d012_policy_records_per_arm']*pol['protected_arms']
    c['d012_policy_classified_per_arm']=(pol['unique_allowed']+pol['unique_forbidden'])*pol['repeats_per_input']
    c['d012_policy_unsafe_allow']=ratio(pol['unsafe_allow_count_per_arm'],pol['unique_forbidden']*pol['repeats_per_input'])
    c['d012_policy_fp']=ratio(pol['false_deny_or_ask_count_per_arm'],pol['unique_allowed']*pol['repeats_per_input'])
    c['d012_policy_correct_ask']=ratio(pol['correct_ask_count_per_arm'],pol['unique_ask']*pol['repeats_per_input'])
    for arm,timing in pol['timing_ms'].items():
        for metric in ['decision','classifier']:
            c[f'd012_{arm}_{metric}_p50_seconds']=seconds(timing[metric+'_median'])
            c[f'd012_{arm}_{metric}_p95_seconds']=seconds(timing[metric+'_p95'])
            c[f'd012_{arm}_{metric}_p50_p95_seconds']=seconds(timing[metric+'_median'])+' / '+seconds(timing[metric+'_p95'])
    for key in ['auto_attempt','secure_attempt','auto_benign_utility','secure_benign_utility']:c['package_'+key]=ratio(p[key+'_count'],p['denominator_per_case_arm'])
    c['historical_package_summary']=f"Историческая отдельная проверка {p['source_commit']}: целевая попытка установки Auto {c['package_auto_attempt']}, Secure {c['package_secure_attempt']}. Причина отказа {p['target_package']}: {p['secure_reason']}. Полезная разрешённая установка Auto {c['package_auto_benign_utility']}, Secure {c['package_secure_benign_utility']} по разным причинам."
    c['historical_package_risk_status']=f"История {p['source_commit'][:7]}: {c['package_auto_attempt']} → {c['package_secure_attempt']}"
    c['external_approval_footer']=f"{ext['percent']}% запросов разрешения одобряют в Claude Code. Anthropic, {ext['publication_date_short']} [1]"
    c['video_duration_seconds_1dp']=f"{m['demonstrations']['video']['encoded_duration_ms']/1000:.1f}".replace('.',',')
    c['demo_duration_seconds']=seconds(demo['duration_ms']);c['demo_case_short']=demo['case_id'].split(' · ')[0]
    c['h70_inventory']=f"{n['attack']} атак, {n['accidental']} accidental,\n{n['legitimate_or_ordinary']} разрешённых задач"
    c['d012_inventory']=f"{d['cases']} случаев, {d['cli_records']} CLI records\nв финальном сравнении"
    rows=[['Исторический full70']+[a[k]['label'] for k in ['full_access','qwen','qwen_meta']]]
    for label,metric in [('Успешные атаки','asr'),('Полезные разрешённые задачи','utility'),('Те же задачи без заданного вреда','safe_utility')]:rows.append([label]+[c[f'h70_{k}_{metric}'] for k in ['full_access','qwen','qwen_meta']])
    slide_rows=[['Метрика','Полный\nдоступ','Qwen\njudge','Qwen + Meta\nпосле fix']]+[[label]+[c[f'h70_{k}_{metric}'] for k in ['full_access','qwen','qwen_meta']] for label,metric in [('Успешные атаки','asr'),('Utility','utility'),('Safe utility','safe_utility')]]
    c['historical_full70_table']=markdown_table(rows)
    for name,key in [('main_table','main_rows'),('scope_table','scope_rows'),('risk_table','risk_rows'),('fresh_breakdown_table','fresh_breakdown_rows'),('fresh_attack_table','fresh_attack_rows'),('fresh_ablation_table','fresh_ablation_rows'),('fresh_diagnostics_table','fresh_diagnostics_rows')]:c[name]=markdown_table(m[key])
    c['draft_notice']='> РАБОЧАЯ РЕДАКЦИЯ. Итоговые результаты новой сборки ещё не зафиксированы.\n\n' if m['status']!='frozen' else ''
    # Any editorial field may reference a ledger token. Expand only known tokens.
    for key,value in list(c.items()):c[key]=expand(value,c)
    return {'context':c,'tables':{'historical_full70':slide_rows}}

if __name__=='__main__':
    print(json.dumps(build_view(json.loads((SRC/'final_metrics.json').read_text())),ensure_ascii=False))

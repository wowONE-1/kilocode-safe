"""Remove only source-file path descriptions from the working PPTX template.

The original stays in private build. All other ZIP entry bytes remain unchanged.
"""
from pathlib import Path
import hashlib,html,json,os,re,shutil,zipfile
from lxml import etree
ROOT=Path(os.environ.get('PROJECT_ROOT',Path(__file__).resolve().parents[3])).resolve()
DIR=ROOT/'presentation/final_20260907'
TEMPLATE=DIR/'assets/template.pptx'
BUILD=DIR/'build'
BACKUP=BUILD/'template-original-private.pptx'
TAG=re.compile(rb'<(?:[A-Za-z_][\w.-]*:)?cNvPr\b[^>]*>')
ATTR=re.compile(rb'\sdescr=("|\')(.*?)\1')
PATH=re.compile(r'^(?:/|[A-Za-z]:[\\/]|file://)',re.I)
def digest(data):return hashlib.sha256(data).hexdigest()
def path_description(value):return bool(PATH.match(html.unescape(value.decode('utf-8'))))
def strip_paths(data):
    count=0
    def clean_tag(match):
        def clean_attr(attr):
            nonlocal count
            if path_description(attr.group(2)):
                count+=1
                return b''
            return attr.group(0)
        return ATTR.sub(clean_attr,match.group(0))
    cleaned=TAG.sub(clean_tag,data)
    return cleaned,count
BUILD.mkdir(parents=True,exist_ok=True)
if not BACKUP.exists():shutil.copy2(TEMPLATE,BACKUP)
source_bytes=BACKUP.read_bytes()
changes=[]
with zipfile.ZipFile(BACKUP) as source:
    original={i.filename:source.read(i.filename) for i in source.infolist()}
    result={}
    for name,data in original.items():
        if name.endswith('.xml'):
            cleaned,count=strip_paths(data)
            if count:changes.append({'part':name,'source_path_descriptions_removed':count})
            etree.fromstring(cleaned)
            result[name]=cleaned
        else:result[name]=data
    temp=BUILD/'template-sanitized.tmp.pptx'
    with zipfile.ZipFile(temp,'w') as output:
        output.comment=source.comment
        for info in source.infolist():output.writestr(info,result[info.filename])
    with zipfile.ZipFile(temp) as output:
        assert output.namelist()==source.namelist()
        assert all(output.read(name)==data for name,data in result.items())
    temp.replace(TEMPLATE)
remaining=0
for name,data in result.items():
    if name.endswith('.xml'):
        for el in etree.fromstring(data).iter():
            if etree.QName(el).localname=='cNvPr' and el.get('descr'):
                remaining+=bool(PATH.match(el.get('descr')))
assert remaining==0
changed_parts={x['part'] for x in changes}
assert all(result[n]==b for n,b in original.items() if n not in changed_parts)
assert all(result[n]==b for n,b in original.items() if n.startswith('ppt/media/'))
report={'status':'PASS','original_sha256':digest(source_bytes),'sanitized_sha256':digest(TEMPLATE.read_bytes()),'bytes':TEMPLATE.stat().st_size,'source_path_descriptions_removed':sum(x['source_path_descriptions_removed'] for x in changes),'changed_xml_parts':changes,'remaining_absolute_path_descriptions':remaining,'all_other_entry_bytes_identical':True,'media_bytes_identical':True,'original_backup':'build/template-original-private.pptx'}
(BUILD/'template-privacy-qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))

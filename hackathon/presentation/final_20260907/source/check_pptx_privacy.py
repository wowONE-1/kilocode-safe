"""Read-only check for accidental local filesystem paths in PPTX XML metadata."""
from pathlib import Path
import json,re,sys,zipfile
from lxml import etree
if len(sys.argv)!=2:raise SystemExit('Usage: python3 check_pptx_privacy.py PATH_TO_PPTX')
path=Path(sys.argv[1])
absolute=re.compile(r'^(?:/|[A-Za-z]:[\\/]|file://)',re.I)
private=re.compile(rb'(?:/Users/|/home/|/var/folders/|/private/var/|(?i:[A-Za-z]:[\\/]Users[\\/]))')
issues=[]
with zipfile.ZipFile(path) as package:
    for name in package.namelist():
        if not name.endswith(('.xml','.rels')):continue
        data=package.read(name)
        root=etree.fromstring(data)
        count=sum(bool(absolute.match(el.get('descr',''))) for el in root.iter() if etree.QName(el).localname=='cNvPr')
        local_markers=len(private.findall(data))
        if count or local_markers:issues.append({'part':name,'absolute_path_descriptions':count,'private_path_markers':local_markers})
report={'status':'FAIL' if issues else 'PASS','artifact':path.name,'issues':issues}
print(json.dumps(report,ensure_ascii=False))
if issues:raise SystemExit(1)

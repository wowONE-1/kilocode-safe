import sys,zipfile,copy,posixpath,json
from pathlib import Path
from ledger_view import build_view
ledger_metrics=json.loads((Path(__file__).resolve().parent/'final_metrics.json').read_text())
ledger_context=build_view(ledger_metrics)['context']
from lxml import etree as E
A='http://schemas.openxmlformats.org/drawingml/2006/main';P='http://schemas.openxmlformats.org/presentationml/2006/main';R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';REL='http://schemas.openxmlformats.org/package/2006/relationships';CT='http://schemas.openxmlformats.org/package/2006/content-types'
with zipfile.ZipFile(sys.argv[1]) as z:items={n:z.read(n) for n in z.namelist()}
with zipfile.ZipFile(sys.argv[2]) as z:template={n:z.read(n) for n in z.namelist()}
def save(n,x):items[n]=E.tostring(x,encoding='UTF-8',xml_declaration=True,standalone=True)
# Preserve the template's genuine embedded Inter faces for PowerPoint.
pres=E.fromstring(items['ppt/presentation.xml']);rels=E.fromstring(items['ppt/_rels/presentation.xml.rels']);tp=E.fromstring(template['ppt/presentation.xml']);tr={r.get('Id'):r.get('Target') for r in E.fromstring(template['ppt/_rels/presentation.xml.rels'])};fontlist=copy.deepcopy(tp.find('{%s}embeddedFontLst'%P))
if fontlist is not None:
    for k,n in enumerate(fontlist.xpath('.//*[@r:id]',namespaces={'r':R})):
        target=tr[n.get('{%s}id'%R)];source=posixpath.normpath('ppt/'+target);dst='ppt/fonts/template-'+posixpath.basename(source);items[dst]=template[source];rid='rIdTemplateFont'+str(k+1);n.set('{%s}id'%R,rid);E.SubElement(rels,'{%s}Relationship'%REL,Id=rid,Type=R+'/font',Target=dst.removeprefix('ppt/'))
    existing=pres.find('{%s}embeddedFontLst'%P)
    if existing is not None:pres.remove(existing)
    before=pres.find('{%s}defaultTextStyle'%P)
    pres.insert(list(pres).index(before) if before is not None else len(pres),fontlist);pres.set('embedTrueTypeFonts','1')
    ct=E.fromstring(items['[Content_Types].xml'])
    if not any(n.get('Extension')=='fntdata' for n in ct):E.SubElement(ct,'{%s}Default'%CT,Extension='fntdata',ContentType='application/x-fontdata')
    save('[Content_Types].xml',ct)
save('ppt/presentation.xml',pres);save('ppt/_rels/presentation.xml.rels',rels)
# Explicit cell borders preserve the reference's horizontal-rule table style.
# The exporter omits a no-fill border, which otherwise inherits a black grid.
for name in list(items):
    if name.startswith('ppt/slides/slide') and name.endswith('.xml'):
        root=E.fromstring(items[name])
        for tbl in root.findall('.//{%s}tbl'%A):
            for row_index,row in enumerate(tbl.findall('{%s}tr'%A)):
                for column_index,cell in enumerate(row.findall('{%s}tc'%A)):
                    # Center each mode in four-column comparison tables so adjacent
                    # outcomes remain visually separate in PowerPoint and PDF.
                    if name in {f'ppt/slides/slide{i}.xml' for i in [8,9,10,11,12,14]} and len(row.findall('{%s}tc'%A))==4 and column_index>0:
                        for para in cell.findall('.//{%s}p'%A):
                            para_props=para.find('{%s}pPr'%A)
                            if para_props is None:
                                para_props=E.Element('{%s}pPr'%A)
                                para.insert(0,para_props)
                            para_props.set('algn','ctr')
                            para_props.set('marL','0')
                            para_props.set('indent','0')
                    props=cell.find('{%s}tcPr'%A)
                    for edge in ['lnL','lnR','lnT','lnB','lnTlToBr','lnBlToTr']:
                        old=props.find('{%s}%s'%(A,edge))
                        if old is not None:props.remove(old)
                        line=E.Element('{%s}%s'%(A,edge),w='7620' if edge=='lnB' else '0')
                        if edge=='lnB':
                            fill=E.SubElement(line,'{%s}solidFill'%A);E.SubElement(fill,'{%s}srgbClr'%A,val='111111' if row_index==0 else 'C9CBD6')
                        else:E.SubElement(line,'{%s}noFill'%A)
                        props.insert(0,line)
        save(name,root)
    elif name.startswith('ppt/theme/theme') and name.endswith('.xml'):
        root=E.fromstring(items[name])
        for tag in ['hlink','folHlink']:
            for node in root.findall('.//{%s}%s'%(A,tag)):
                for child in list(node):node.remove(child)
                E.SubElement(node,'{%s}srgbClr'%A,val='FA5416')
        save(name,root)
# Source links remain native text hyperlinks in editable text and table cells.
all_links={3:{ledger_context['external_approval_footer']:ledger_metrics['external']['anthropic_permission_approval']['url']},15:{'Код Kilo [2]':'https://github.com/wowONE-1/kilocode-safe/tree/'+ledger_metrics['publication_versions']['kilo_measured_commit']+'/packages/opencode/src/kilocode/permission','Бенчмарк [3]':'https://github.com/dimkablin/vibesechack/tree/'+ledger_metrics['publication_versions']['harness_results_commit'],'Qwen reference [4]':'https://qwenlm.github.io/qwen-code-docs/en/users/features/auto-mode/'}}
for page,links in all_links.items():
    name=f'ppt/slides/slide{page}.xml';slide=E.fromstring(items[name]);relsname=f'ppt/slides/_rels/slide{page}.xml.rels';linksrels=E.fromstring(items[relsname]);found=[]
    for para in slide.findall('.//{%s}p'%A):
        label=''.join(para.xpath('.//a:t/text()',namespaces={'a':A}))
        if label not in links:continue
        rid='rIdSource'+str(len(found)+1);E.SubElement(linksrels,'{%s}Relationship'%REL,Id=rid,Type=R+'/hyperlink',Target=links[label],TargetMode='External')
        for run in para.findall('{%s}r'%A):
            rp=run.find('{%s}rPr'%A)
            if rp is None:rp=E.Element('{%s}rPr'%A);run.insert(0,rp)
            E.SubElement(rp,'{%s}hlinkClick'%A,{'{%s}id'%R:rid})
        found.append(label)
    assert len(found)==len(links),(page,found)
    save(name,slide);save(relsname,linksrels)
with zipfile.ZipFile(sys.argv[3],'w',zipfile.ZIP_DEFLATED) as z:
    for n,b in items.items():z.writestr(n,b)
print('Template Inter embedding and four source links retained')

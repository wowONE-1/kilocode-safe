from pathlib import Path
import html,json,os
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader
ROOT=Path(os.environ.get('PROJECT_ROOT',Path(__file__).resolve().parents[3])).resolve()
BUILD=ROOT/'presentation/final_20260907/build'
BUILD.mkdir(parents=True,exist_ok=True)
font=Path(os.environ.get('ANNOTATION_FONT',ROOT/'presentation/final_20260907/fonts/Inter-variable.ttf'))
if not font.is_file():raise FileNotFoundError('Annotation font not found. Supply ANNOTATION_FONT or retain bundled fonts/Inter-variable.ttf.')
# ReportLab reads the bundled TrueType font at its default variation instance.
# Both styles use that same face; the heading is distinguished by its larger size.
pdfmetrics.registerFont(TTFont('BodyRu',str(font)))
pdfmetrics.registerFont(TTFont('HeadRu',str(font)))
text=(ROOT/'output/final/FINAL_SOLUTION.md').read_text().split('<!-- ANNOTATION_BEGIN -->\n',1)[1].split('\n<!-- ANNOTATION_END -->',1)[0]
paras=[p for p in text.split('\n\n') if p.strip()]
assert len(paras)==7
body=ParagraphStyle('Body',fontName='BodyRu',fontSize=11,leading=15.1,spaceAfter=10)
head=ParagraphStyle('Head',fontName='HeadRu',fontSize=17,leading=21,spaceAfter=20)
file=BUILD/'annotation-a4.pdf'
items=[Paragraph('Команда 3: аннотация решения',head)]+[Paragraph(html.escape(p),body) for p in paras]
SimpleDocTemplate(str(file),pagesize=A4,leftMargin=43,rightMargin=43,topMargin=43,bottomMargin=43).build(items)
r=PdfReader(file)
assert len(r.pages)==1,f'Annotation needs {len(r.pages)} pages'
report={'paragraphs':7,'words':len(text.split()),'a4_pages':len(r.pages),'font_family':'Inter' if font.name=='Inter-variable.ttf' else font.name,'font_points':11,'margins_points':43,'source':'output/final/FINAL_SOLUTION.md','pdf':'presentation/final_20260907/build/annotation-a4.pdf'}
(BUILD/'annotation-qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))

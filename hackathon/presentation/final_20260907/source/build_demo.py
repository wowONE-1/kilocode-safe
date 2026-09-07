from pathlib import Path
import base64,json,hashlib,argparse
ROOT=Path(__file__).resolve().parents[3]
SRC=ROOT/'presentation/final_20260907/source'
parser=argparse.ArgumentParser()
parser.add_argument('--trace',type=Path,default=SRC/'demo_trace.json')
parser.add_argument('--output',type=Path,default=ROOT/'output/final/demo.html')
args=parser.parse_args()
OUT=args.output
trace=json.loads(args.trace.read_text())
assert len(trace['steps'])>=6
payload=json.dumps(trace,ensure_ascii=False).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
font=base64.b64encode((ROOT/'presentation/final_20260907/fonts/Inter-variable.ttf').read_bytes()).decode()
html=(SRC/'demo.html.in').read_text().replace('{{FONT_BASE64}}',font).replace('{{TRACE_JSON}}',payload)
OUT.write_text(html)
print(json.dumps({'file':str(OUT),'steps':len(trace['steps']),'run_id':trace['source']['run_id'],'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest()},ensure_ascii=False))

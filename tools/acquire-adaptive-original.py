from urllib.request import urlopen, Request
from pathlib import Path
import hashlib, json, sys
if len(sys.argv)!=2: raise SystemExit('Supply a new source output directory')
p=Path(sys.argv[1]); p.mkdir(parents=True,exist_ok=False)
url='https://upload.wikimedia.org/wikipedia/commons/c/c5/Aerra%27s_Films_of_the_Ordinary_IV_--_Scissors_Cutting_Card_Stock.webm'
with urlopen(Request(url,headers={'User-Agent':'HAMON-source-receiving/1.0'}),timeout=30) as response:
    data=response.read(1006548)
assert len(data)==1006547
digest=hashlib.sha256(data).hexdigest()
assert digest=='06d2a4355d6d157bae34da5372b2cc6f36379e50c541f24017367dc047cb86fe'
(p/'original.webm').write_bytes(data)
receipt={'url':url,'sha256':digest,'bytes':len(data),'author':'Aerra Carnicom / Aerrapc','license':'CC BY-SA 4.0','licenseUrl':'https://creativecommons.org/licenses/by-sa/4.0/','sourcePage':"https://commons.wikimedia.org/wiki/File:Aerra%27s_Films_of_the_Ordinary_IV_--_Scissors_Cutting_Card_Stock.webm",'modifications':'None to downloaded video. Future frame extraction and observer annotations require separate provenance.'}
(p/'SOURCE.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))

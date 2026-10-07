import csv,gzip,hashlib,html,json,re,sys,time,unicodedata,zipfile
from pathlib import Path
from collections import OrderedDict

BASE=Path(__file__).resolve().parent.parent
COLUMNS=['ID','CPF_CNPJ_FORMATADO','NATUREZA_JURIDICA','PORTE','SITUACAO','NIVEL_ATIVIDADE','DESC_CNAE_PRINCIPAL','SETOR','RAMO_ATIVIDADE','UF','MUNICIPIO','LOGRADOURO','NUMERO','BAIRRO','CEP','GRP_EMP_FATURAMENTO','SEGMENTO_TELECOM','OLT','Distancia_OLT_km','FLAG_DENTRO_POLIGONO_OLT','Cluster','Nome Cluster']
CELL=re.compile(rb'<c\b([^>]*)>(.*?)</c>',re.S)
REF=re.compile(rb'\br="([A-Z]+)\d+"');TEXT=re.compile(rb'<t(?:\s[^>]*)?>(.*?)</t>',re.S);VALUE=re.compile(rb'<v>(.*?)</v>',re.S)
def value(attrs,body):
    if b't="inlineStr"' in attrs:return ''.join(html.unescape(x.decode('utf-8')) for x in TEXT.findall(body))
    v=VALUE.search(body);return v.group(1).decode('utf-8') if v else ''
def row_stream(z):
    with z.open('xl/worksheets/sheet1.xml') as f:
        buf=b''
        while block:=f.read(2*1024*1024):
            buf+=block;start=0
            while True:
                end=buf.find(b'</row>',start)
                if end<0:break
                end+=6;piece=buf[start:end];pos=piece.find(b'<row ')
                if pos>=0:yield piece[pos:]
                start=end
            buf=buf[start:]
def normalize(text):return ''.join(c for c in unicodedata.normalize('NFD',str(text).strip()) if unicodedata.category(c)!='Mn').upper()
def safe_city_name(city):
    slug=re.sub('[^a-z0-9]+','-',normalize(city).lower()).strip('-')[:60]
    return (slug or 'sem-municipio')+'-'+hashlib.sha1(city.encode()).hexdigest()[:10]+'.csv'
def visible_text(text):return re.sub(r'(?<=ANTENA )\w+(?= ANDA)','operadora',str(text))
class Writers:
    def __init__(self,out):self.out=out;self.handles=OrderedDict();self.created=set()
    def write(self,name,row):
        pair=self.handles.pop(name,None)
        if pair is None:
            if len(self.handles)>=70:self.handles.popitem(last=False)[1][0].close()
            f=(self.out/name).open('a',encoding='utf-8',newline='');w=csv.writer(f);pair=(f,w)
            if name not in self.created:w.writerow(COLUMNS);self.created.add(name)
        self.handles[name]=pair;pair[1].writerow(row)
    def close(self):
        for f,_ in self.handles.values():f.close()
def number(text):
    try:return float(text.replace(',','.')) if text else None
    except ValueError:return None
def main():
    xlsx=Path(sys.argv[1]) if len(sys.argv)>1 else BASE/'sources/base_mpes_demo.xlsx'
    cube=Path(sys.argv[2]) if len(sys.argv)>2 else BASE/'sources/cubo_demo.csv'
    scratch=BASE/'work/city_csv';scratch.mkdir(parents=True,exist_ok=True)
    if any(scratch.iterdir()):raise RuntimeError('Use uma pasta work/city_csv vazia para reconstruir os dados.')
    out=BASE/'data';out.mkdir(exist_ok=True);writers=Writers(scratch);cities={};total=0;start=time.monotonic();redacted=0
    with zipfile.ZipFile(xlsx) as z:
        header=None;selected={}
        for n,raw in enumerate(row_stream(z)):
            if n==0:
                header={value(a,b):REF.search(a).group(1).decode() for a,b in (m.groups() for m in CELL.finditer(raw))}
                if any(h not in header for h in COLUMNS):raise ValueError('Colunas necessárias ausentes')
                selected={header[h]:i for i,h in enumerate(COLUMNS)};continue
            values=['']*len(COLUMNS)
            for m in CELL.finditer(raw):
                attrs,body=m.groups();col=REF.search(attrs).group(1).decode()
                if col in selected:
                    old=value(attrs,body);new=visible_text(old);redacted+=int(new!=old);values[selected[col]]=new
            if not values[0]:continue
            total+=1;city=values[COLUMNS.index('MUNICIPIO')] or 'Sem município';key=normalize(city)
            metadata=cities.setdefault(key,{'name':city,'file':safe_city_name(key),'count':0})
            metadata['count']+=1;writers.write(metadata['file'],values)
            if total%100000==0:print(f'Preparados {total:,} registros em {time.monotonic()-start:.0f}s',flush=True)
    writers.close()
    manifest={'version':1,'source':'base_mpes_demo.xlsx','columns':COLUMNS,'totalRows':total,'cities':sorted(cities.values(),key=lambda x:normalize(x['name'])),'format':'indexed-gzip-shards-v1','bundles':[]}
    bundle_index=1;bundle_name=f'portal-data-{bundle_index}.bin';stream=(out/bundle_name).open('wb');size=0;allbytes=0
    for city in manifest['cities']:
        block=gzip.compress((scratch/city.pop('file')).read_bytes(),compresslevel=6,mtime=0)
        if size and size+len(block)>20*1024*1024:
            stream.close();manifest['bundles'].append(bundle_name);allbytes+=size;bundle_index+=1;bundle_name=f'portal-data-{bundle_index}.bin';stream=(out/bundle_name).open('wb');size=0
        city.update(bundle=bundle_name,offset=size,length=len(block));stream.write(block);size+=len(block)
    stream.close();allbytes+=size;manifest['bundles'].append(bundle_name);manifest['bundleBytes']=allbytes
    (out/'portal-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    with cube.open(encoding='utf-8-sig',newline='') as f:
        cube_rows=sum(1 for _ in csv.DictReader(f,delimiter=';'))
    audit={'prospectRows':total,'cities':len(cities),'cubeRows':cube_rows,'neutralizedOperatorMentionsInAddress':redacted,'seconds':round(time.monotonic()-start)}
    (BASE/'work/build-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(audit,ensure_ascii=False),flush=True)
if __name__=='__main__':main()

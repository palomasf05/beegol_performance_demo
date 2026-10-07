const fs=require('fs');
const path=require('path');
const {pipeline}=require('stream');
const {readSession}=require('../lib/session');
module.exports=function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  let session;try{session=readSession(req);}catch{session=null;}
  if(!session)return res.status(401).json({error:'Acesso não autenticado'});
  if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return res.status(405).json({error:'Método não permitido'});}
  const query=new URL(req.url,'http://localhost').searchParams;
  const file=String(req.query?.file||query.get('file')||'');
  if(!/^(portal-manifest\.json|portal-data-\d+\.bin)$/.test(file))return res.status(404).json({error:'Arquivo não encontrado'});
  const filename=path.join(__dirname,'../data',file);
  let stat;try{stat=fs.statSync(filename);}catch{return res.status(404).json({error:'Arquivo não encontrado'});}
  let start=0,end=stat.size-1;
  res.setHeader('Accept-Ranges','bytes');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Type',file.endsWith('.json')?'application/json; charset=utf-8':'application/octet-stream');
  if(req.headers.range){
    const match=req.headers.range.match(/^bytes=(\d+)-(\d*)$/);
    if(!match)return res.status(416).json({error:'Intervalo inválido'});
    start=Number(match[1]);end=match[2]?Math.min(end,Number(match[2])):end;
    if(start>end||start>=stat.size){res.setHeader('Content-Range',`bytes */${stat.size}`);return res.status(416).json({error:'Intervalo inválido'});}
    res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${stat.size}`);
  }
  res.setHeader('Content-Length',end-start+1);
  if(req.method==='HEAD')return res.end();
  pipeline(fs.createReadStream(filename,{start,end}),res,()=>{});
};

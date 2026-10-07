const http = require('http');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const root = __dirname;
process.env.NODE_ENV = 'development';
if (fs.existsSync(path.join(root,'.env'))) {
  for (const line of fs.readFileSync(path.join(root,'.env'),'utf8').split(/\r?\n/)) {
    const match=line.match(/^([A-Z_]+)=(.*)$/); if(match&&!process.env[match[1]])process.env[match[1]]=match[2];
  }
}
const { readSession } = require('./lib/session');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.bin':'application/octet-stream'};
const routes={ '/api/session':require('./api/session'), '/api/public-config':require('./api/public-config'), '/api/data':require('./api/data') };
const server=http.createServer(async(req,res)=>{
  let requestPath;
  try { requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400);return res.end(); }
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  if (routes[requestPath]) {
    let body='';
    for await (const chunk of req) { body+=chunk; if(body.length>16384){res.writeHead(413);return res.end();} }
    req.body=body;
    res.status=code=>{res.statusCode=code;return res;};res.json=value=>res.end(JSON.stringify(value));
    try { await routes[requestPath](req,res); } catch {if(!res.headersSent)res.writeHead(500);res.end('Falha ao processar solicitação');}
    return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  if(requestPath.startsWith('/data/')&&!readSession(req)){res.writeHead(401);return res.end();}
  if(!(/^\/(index|dashboard|dados)\.html$/.test(requestPath)||requestPath==='/'||requestPath.startsWith('/assets/')||requestPath.startsWith('/data/'))){res.writeHead(404);return res.end();}
  const file=path.resolve(root,'.'+(requestPath==='/'?'/index.html':requestPath));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  let stat;try { stat=fs.statSync(file);if(!stat.isFile())throw new Error(); }catch{res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  res.setHeader('Cache-Control',requestPath.startsWith('/data/')?'private, no-store':'no-cache');
  res.setHeader('Accept-Ranges','bytes');
  let start=0,end=stat.size-1;
  if(req.headers.range){
    const match=req.headers.range.match(/^bytes=(\d+)-(\d*)$/);
    if(!match){res.writeHead(416);return res.end();}
    start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;
    if(start>end||start>=stat.size){res.setHeader('Content-Range',`bytes */${stat.size}`);res.writeHead(416);return res.end();}
    res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${stat.size}`);
  }
  res.setHeader('Content-Length',end-start+1);
  if(req.method==='HEAD')return res.end();
  pipeline(fs.createReadStream(file,{start,end}),res,()=>{});
});
server.listen(Number(process.env.PORT||4317),'127.0.0.1',()=>console.log('Portal Beegol: http://127.0.0.1:'+(process.env.PORT||4317)));

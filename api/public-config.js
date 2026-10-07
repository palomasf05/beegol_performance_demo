const { readSession } = require('../lib/session');
module.exports = function handler(req,res) {
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  if(!readSession(req))return res.status(401).json({error:'Acesso não autenticado'});
  const configured=(process.env.PUBLIC_BI_URL||'').trim();
  if(!configured)return res.status(200).json({publicBiUrl:'',configured:false});
  try {const url=new URL(configured);if(url.protocol!=='https:'||url.hostname!=='app.powerbi.com'||!['/view','/reportEmbed'].some(p=>url.pathname.startsWith(p)))throw new Error();}
  catch{return res.status(400).json({error:'Configure um link válido de publicação do Power BI.'});}
  return res.status(200).json({publicBiUrl:configured,configured:true});
};

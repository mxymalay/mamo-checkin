import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{const name=new URL(req.url,'http://localhost').pathname;const file=resolve(root,'.'+(name==='/'?'/tests/fixtures/rule-builder-qa.html':name));if(!file.startsWith(root+'/'))throw new Error('path');res.setHeader('content-type',types[extname(file)]||'text/plain');res.end(await readFile(file));}
 catch{res.statusCode=404;res.end('Not found');}
});
server.listen(Number(process.env.PORT||8765),'127.0.0.1',()=>console.log('Rule builder fixture: http://127.0.0.1:'+server.address().port));

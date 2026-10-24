import http from "node:http";
import {readFile} from "node:fs/promises";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root=dirname(fileURLToPath(import.meta.url));
const routes=Object.freeze({
  "/":["web/index.html","text/html; charset=utf-8"],
  "/web/index.html":["web/index.html","text/html; charset=utf-8"],
  "/web/styles.css":["web/styles.css","text/css; charset=utf-8"],
  "/web/app.mjs":["web/app.mjs","text/javascript; charset=utf-8"],
  "/src/geometry.mjs":["src/geometry.mjs","text/javascript; charset=utf-8"],
  "/src/demo.mjs":["src/demo.mjs","text/javascript; charset=utf-8"],
  "/src/hypotheses.mjs":["src/hypotheses.mjs","text/javascript; charset=utf-8"],
  "/src/evidence.mjs":["src/evidence.mjs","text/javascript; charset=utf-8"],
  "/src/authoring.mjs":["src/authoring.mjs","text/javascript; charset=utf-8"]
});
export function createAppServer(){
  return http.createServer(async(req,res)=>{
    res.setHeader("X-Content-Type-Options","nosniff");
    res.setHeader("Cache-Control","no-store");
    res.setHeader("Content-Security-Policy",
      "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'");
    const path=req.url?.split("?")[0];
    const route=Object.prototype.hasOwnProperty.call(routes,path)?routes[path]:null;
    if(req.method!=="GET"&&req.method!=="HEAD"){
      res.writeHead(405,{"Allow":"GET, HEAD"});res.end("Method not allowed");return;
    }
    if(!route){res.writeHead(404);res.end("Not found");return;}
    try{
      const body=await readFile(join(root,route[0]));
      res.writeHead(200,{"Content-Type":route[1],"Content-Length":body.length});
      res.end(req.method==="HEAD"?undefined:body);
    }catch{
      res.writeHead(500);res.end("Asset unavailable");
    }
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||8787);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error("Invalid PORT");
  const server=createAppServer();
  server.listen(port,"127.0.0.1",()=>console.log("Task Space Lab: http://127.0.0.1:"+port));
}

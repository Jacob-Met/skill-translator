import http from "node:http";
import {readFile} from "node:fs/promises";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root=dirname(fileURLToPath(import.meta.url));
const routes=Object.freeze({
  "/footprint":["web/footprint.html","text/html; charset=utf-8"],
  "/web/footprint.mjs":["web/footprint.mjs","text/javascript; charset=utf-8"],
  "/web/footprint.css":["web/footprint.css","text/css; charset=utf-8"],
  "/src/contact-footprint.mjs":["src/contact-footprint.mjs","text/javascript; charset=utf-8"],
  "/src/layout-feedback.mjs":["src/layout-feedback.mjs","text/javascript; charset=utf-8"],
  "/web/layout-feedback.mjs":["web/layout-feedback.mjs","text/javascript; charset=utf-8"],
  "/decision-practice":["web/decision-practice.html","text/html; charset=utf-8"],
  "/web/decision-practice.mjs":["web/decision-practice.mjs","text/javascript; charset=utf-8"],
  "/web/decision-practice.css":["web/decision-practice.css","text/css; charset=utf-8"],
  "/src/decision-practice.mjs":["src/decision-practice.mjs","text/javascript; charset=utf-8"],
  "/rehearsal":["web/rehearsal.html","text/html; charset=utf-8"],
  "/web/rehearsal.mjs":["web/rehearsal.mjs","text/javascript; charset=utf-8"],
  "/web/rehearsal.css":["web/rehearsal.css","text/css; charset=utf-8"],
  "/src/transfer-rehearsal.mjs":["src/transfer-rehearsal.mjs","text/javascript; charset=utf-8"],
  "/mark-inspector":["web/mark-inspector.html","text/html; charset=utf-8"],
  "/web/mark-inspector.mjs":["web/mark-inspector.mjs","text/javascript; charset=utf-8"],
  "/web/mark-inspector.css":["web/mark-inspector.css","text/css; charset=utf-8"],
  "/src/mark-inspection.mjs":["src/mark-inspection.mjs","text/javascript; charset=utf-8"],
  "/vendor/microverse/pixel-observations.mjs":["vendor/microverse/pixel-observations.mjs","text/javascript; charset=utf-8"],
  "/vendor/microverse/source-pin.mjs":["vendor/microverse/source-pin.mjs","text/javascript; charset=utf-8"],
  "/src/sequence-capture.mjs":["src/sequence-capture.mjs","text/javascript; charset=utf-8"],
  "/src/focused-review.mjs":["src/focused-review.mjs","text/javascript; charset=utf-8"],
  "/web/focused-results.mjs":["web/focused-results.mjs","text/javascript; charset=utf-8"],
  "/relationships":["web/relationships.html","text/html; charset=utf-8"],
  "/web/relationships.html":["web/relationships.html","text/html; charset=utf-8"],
  "/web/relationships.css":["web/relationships.css","text/css; charset=utf-8"],
  "/web/relationships.mjs":["web/relationships.mjs","text/javascript; charset=utf-8"],
  "/src/task-relationships.mjs":["src/task-relationships.mjs","text/javascript; charset=utf-8"],
  "/sequence":["web/sequence.html","text/html; charset=utf-8"],
  "/web/sequence.html":["web/sequence.html","text/html; charset=utf-8"],
  "/web/sequence.css":["web/sequence.css","text/css; charset=utf-8"],
  "/web/sequence.mjs":["web/sequence.mjs","text/javascript; charset=utf-8"],
  "/web/sequence-input.mjs":["web/sequence-input.mjs","text/javascript; charset=utf-8"],
  "/src/demonstration-sequence.mjs":["src/demonstration-sequence.mjs","text/javascript; charset=utf-8"],
  "/practice-review":["web/practice-review.html","text/html; charset=utf-8"],
  "/web/practice-review.mjs":["web/practice-review.mjs","text/javascript; charset=utf-8"],
  "/web/practice-review.css":["web/practice-review.css","text/css; charset=utf-8"],
  "/src/practice-review.mjs":["src/practice-review.mjs","text/javascript; charset=utf-8"],
  "/joint-calibration":["web/joint-calibration.html","text/html; charset=utf-8"],
  "/web/joint-calibration.html":["web/joint-calibration.html","text/html; charset=utf-8"],
  "/web/joint-calibration.css":["web/joint-calibration.css","text/css; charset=utf-8"],
  "/web/joint-calibration.mjs":["web/joint-calibration.mjs","text/javascript; charset=utf-8"],
  "/src/joint-calibration.mjs":["src/joint-calibration.mjs","text/javascript; charset=utf-8"],
  "/challenge":["web/challenge.html","text/html; charset=utf-8"],
  "/web/challenge.html":["web/challenge.html","text/html; charset=utf-8"],
  "/web/challenge.css":["web/challenge.css","text/css; charset=utf-8"],
  "/web/challenge.mjs":["web/challenge.mjs","text/javascript; charset=utf-8"],
  "/src/calibration-challenge.mjs":["src/calibration-challenge.mjs","text/javascript; charset=utf-8"],
  "/src/capture-editing.mjs":["src/capture-editing.mjs","text/javascript; charset=utf-8"],
  "/sensitivity":["web/sensitivity.html","text/html; charset=utf-8"],
  "/web/sensitivity.css":["web/sensitivity.css","text/css; charset=utf-8"],
  "/web/sensitivity.mjs":["web/sensitivity.mjs","text/javascript; charset=utf-8"],
  "/src/sensitivity.mjs":["src/sensitivity.mjs","text/javascript; charset=utf-8"],
  "/rule-adoption":["web/rule-adoption.html","text/html; charset=utf-8"],
  "/web/rule-adoption.mjs":["web/rule-adoption.mjs","text/javascript; charset=utf-8"],
  "/web/rule-adoption.css":["web/rule-adoption.css","text/css; charset=utf-8"],
  "/src/rule-adoption.mjs":["src/rule-adoption.mjs","text/javascript; charset=utf-8"],
  "/calibration":["web/calibration.html","text/html; charset=utf-8"],
  "/web/calibration.html":["web/calibration.html","text/html; charset=utf-8"],
  "/web/calibration.css":["web/calibration.css","text/css; charset=utf-8"],
  "/web/calibration.mjs":["web/calibration.mjs","text/javascript; charset=utf-8"],
  "/src/calibration-evidence.mjs":["src/calibration-evidence.mjs","text/javascript; charset=utf-8"],
  "/calibration-checks":["web/calibration-checks.html","text/html; charset=utf-8"],
  "/web/calibration-checks.html":["web/calibration-checks.html","text/html; charset=utf-8"],
  "/web/calibration-checks.mjs":["web/calibration-checks.mjs","text/javascript; charset=utf-8"],
  "/web/calibration-checks.css":["web/calibration-checks.css","text/css; charset=utf-8"],
  "/src/calibration-checks.mjs":["src/calibration-checks.mjs","text/javascript; charset=utf-8"],
  "/":["web/index.html","text/html; charset=utf-8"],
  "/practice":["web/practice.html","text/html; charset=utf-8"],
  "/web/practice.css":["web/practice.css","text/css; charset=utf-8"],
  "/web/practice.mjs":["web/practice.mjs","text/javascript; charset=utf-8"],
  "/src/practice.mjs":["src/practice.mjs","text/javascript; charset=utf-8"],
  "/web/index.html":["web/index.html","text/html; charset=utf-8"],
  "/web/styles.css":["web/styles.css","text/css; charset=utf-8"],
  "/web/app.mjs":["web/app.mjs","text/javascript; charset=utf-8"],
  "/capture":["web/capture.html","text/html; charset=utf-8"],
  "/web/capture.mjs":["web/capture.mjs","text/javascript; charset=utf-8"],
  "/web/capture.css":["web/capture.css","text/css; charset=utf-8"],
  "/web/image-input.mjs":["web/image-input.mjs","text/javascript; charset=utf-8"],
  "/src/capture.mjs":["src/capture.mjs","text/javascript; charset=utf-8"],
  "/src/frame-origin.mjs":["src/frame-origin.mjs","text/javascript; charset=utf-8"],
  "/web/video-input.mjs":["web/video-input.mjs","text/javascript; charset=utf-8"],
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
      "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'self' blob:; media-src blob:; object-src 'none'; base-uri 'none'; form-action 'none'");
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

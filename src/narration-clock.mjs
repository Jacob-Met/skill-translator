import {requestedFrameTime} from './frame-origin.mjs';
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function inspectNarrationClock(raw,durationSeconds){
 check(raw&&Array.isArray(raw.anchors)&&raw.anchors.length===2,'Declare exactly two clock anchors.');
 const point=p=>{
  check(p&&typeof p.transcriptSeconds==='number'&&Number.isFinite(p.transcriptSeconds)&&p.transcriptSeconds>=0&&p.transcriptSeconds<=21600,'Transcript landmarks must be finite seconds within six hours.');
  requestedFrameTime(p.clipSeconds,durationSeconds);
  return {transcriptSeconds:p.transcriptSeconds,clipSeconds:p.clipSeconds};
 };
 const anchors=raw.anchors.map(point),verification=point(raw.verification);
 const [a,b]=anchors;
 check(b.transcriptSeconds>a.transcriptSeconds&&b.clipSeconds>a.clipSeconds,'Clock anchors must increase on both timelines.');
 check(verification.transcriptSeconds!==a.transcriptSeconds&&verification.transcriptSeconds!==b.transcriptSeconds,'The separate check must differ from both fitting anchors.');
 check(typeof raw.toleranceSeconds==='number'&&Number.isFinite(raw.toleranceSeconds)&&raw.toleranceSeconds>=0&&raw.toleranceSeconds<=60,'Declare a finite check tolerance from zero to sixty seconds.');
 check(typeof raw.basis==='string'&&raw.basis.trim()&&raw.basis.length<=1600,'Describe the landmark correspondence and check tolerance, up to 1600 characters.');
 const slope=(b.clipSeconds-a.clipSeconds)/(b.transcriptSeconds-a.transcriptSeconds);
 const predicted=a.clipSeconds+(verification.transcriptSeconds-a.transcriptSeconds)*slope;
 check(Number.isFinite(slope)&&slope>0&&Number.isFinite(predicted),'Clock mapping is numerically unavailable.');
 const residualSeconds=predicted-verification.clipSeconds;
 return {clock:{anchors,verification,toleranceSeconds:raw.toleranceSeconds,basis:raw.basis.trim()},slope,predictedCheckSeconds:predicted,residualSeconds,checkPassed:Math.abs(residualSeconds)<=raw.toleranceSeconds};
}
export function mapNarrationTime(raw,durationSeconds,seconds){
 const report=inspectNarrationClock(raw,durationSeconds);
 check(report.checkPassed,'Separate clock check exceeds the declared tolerance; inspect the anchors before navigation.');
 check(typeof seconds==='number'&&Number.isFinite(seconds)&&seconds>=0&&seconds<=21600,'Choose a finite original transcript time.');
 const [a,b]=report.clock.anchors,clipSeconds=a.clipSeconds+(seconds-a.transcriptSeconds)*report.slope;
 check(Number.isFinite(clipSeconds),'Mapped time is numerically unavailable.');
 return {seconds:clipSeconds,extrapolated:seconds<a.transcriptSeconds||seconds>b.transcriptSeconds};
}

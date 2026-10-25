import test from 'node:test';
import assert from 'node:assert/strict';
import {createPathComparison,inspectPathComparison,inspectPathCouplingAlternatives} from '../src/path-comparison.mjs';
import {pathFixture,pathAccount} from './helpers/sampled-path-fixture.mjs';
const declaration={samePointAndCoordinates:true,basis:'Authored corresponding point and common coordinates'};
const account=(a,b)=>createPathComparison(pathAccount(pathFixture(a)),pathAccount(pathFixture(b)),declaration);
function repeated(count=3){
 const sequence=pathFixture(Array.from({length:count},()=>[20,20]));
 for(const moment of sequence.moments){moment.calibratedTask.source.corners=structuredClone(sequence.moments[0].calibratedTask.source.corners);moment.calibratedTask.landmarks[0].sourcePx=structuredClone(sequence.moments[0].calibratedTask.landmarks[0].sourcePx);}
 const path=pathAccount(sequence);return createPathComparison(path,path,declaration);
}
function allCouplings(grid){
 const n=grid.length,m=grid[0].length,words=[];
 function visit(i,j,cells=[],maximum=0){cells=[...cells,[i,j]];maximum=Math.max(maximum,grid[i][j]);if(i===n-1&&j===m-1){words.push({cells,maximum});return;}for(const [di,dj]of [[1,0],[0,1],[1,1]])if(i+di<n&&j+dj<m)visit(i+di,j+dj,cells,maximum);}
 visit(0,0);const minimum=Math.min(...words.map(w=>w.maximum));return words.filter(w=>w.maximum===minimum);
}
function verifyWitness(result,chosen){
 const {original,selectedCoupling:c}=result,n=original.paths[0].samples.length,m=original.paths[1].samples.length;
 assert.equal(Math.max(...c.map(p=>p.distanceMm)),original.distanceMm);
 assert.deepEqual([c[0].firstIndex,c[0].secondIndex],[0,0]);assert.deepEqual([c.at(-1).firstIndex,c.at(-1).secondIndex],[n-1,m-1]);
 assert.ok(c.some(p=>p.firstIndex===chosen.firstIndex&&p.secondIndex===chosen.secondIndex));
 for(let k=0;k<c.length;k++){
  const p=c[k];assert.equal(p.firstMomentId,original.paths[0].samples[p.firstIndex].momentId);assert.equal(p.secondMomentId,original.paths[1].samples[p.secondIndex].momentId);assert.equal(p.distanceMm,original.pairedDistancesMm[p.firstIndex][p.secondIndex]);
  if(k){const dx=p.firstIndex-c[k-1].firstIndex,dy=p.secondIndex-c[k-1].secondIndex;assert.ok(dx>=0&&dx<=1&&dy>=0&&dy<=1&&dx+dy>0);}
 }
}
test('received equal-endpoint excursion has four minimizing pairings but excludes paired middle samples',()=>{
 const raw=account([[20,20],[25,20],[20,20]],[[20,20],[20,25],[20,20]]),r=inspectPathCouplingAlternatives(raw);
 assert.equal(r.optimalCouplings,'4');assert.equal(r.pairs.length,8);assert.ok(!r.pairs.some(p=>p.firstIndex===1&&p.secondIndex===1));
 assert.deepEqual(r.pairs.filter(p=>p.requiredInEveryOptimalCoupling).map(p=>[p.firstIndex,p.secondIndex]),[[0,0],[2,2]]);
 assert.ok(Math.abs(r.original.pairedDistancesMm[1][1]-Math.sqrt(50))<1e-8);
 const other=inspectPathCouplingAlternatives(raw,{firstIndex:1,secondIndex:0});verifyWitness(other,{firstIndex:1,secondIndex:0});assert.notDeepEqual(other.selectedCoupling,r.original.coupling);assert.deepEqual(other.original,r.original);
 assert.throws(()=>inspectPathCouplingAlternatives(raw,{firstIndex:1,secondIndex:1}),/minimizing coupling/);
});
test('repeated exact nominal positions have thirteen couplings and every pair is possible',()=>{
 const raw=repeated(),r=inspectPathCouplingAlternatives(raw);assert.equal(r.original.distanceMm,0);assert.equal(r.optimalCouplings,'13');assert.equal(r.pairs.length,9);
 assert.equal(r.pairs.find(p=>p.firstIndex===1&&p.secondIndex===1).couplingsThrough,'9');
 for(const p of r.pairs)verifyWitness(inspectPathCouplingAlternatives(raw,p),p);
});
test('two hundred producer-backed cases agree with exhaustive counts, required cells and every selected witness',()=>{
 let seed=98923;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 for(let run=0;run<200;run++){
  const raw=account(Array.from({length:2+rand()%3},()=>[10+rand()%3,10+rand()%3]),Array.from({length:2+rand()%3},()=>[10+rand()%3,10+rand()%3])),before=JSON.stringify(raw),r=inspectPathCouplingAlternatives(raw),grid=r.original.pairedDistancesMm,expected=allCouplings(grid);
  assert.equal(r.optimalCouplings,String(expected.length));assert.deepEqual(r.original,inspectPathComparison(raw));
  for(let i=0;i<grid.length;i++)for(let j=0;j<grid[0].length;j++){
   const count=expected.filter(w=>w.cells.some(c=>c[0]===i&&c[1]===j)).length,pair=r.pairs.find(p=>p.firstIndex===i&&p.secondIndex===j);assert.equal(pair?.couplingsThrough??'0',String(count));if(pair){assert.equal(pair.requiredInEveryOptimalCoupling,count===expected.length);verifyWitness(inspectPathCouplingAlternatives(raw,pair),pair);}
  }
  assert.equal(JSON.stringify(raw),before);
 }
});
test('numerical ties are never silently widened across distinct camera calibration arithmetic',()=>{
 const path=pathAccount(pathFixture([[20,20],[20,20],[20,20]])),r=inspectPathCouplingAlternatives(createPathComparison(path,path,declaration));
 assert.equal(r.original.distanceMm,0);assert.equal(r.optimalCouplings,'1');assert.equal(r.pairs.length,3);assert.ok(r.original.pairedDistancesMm[0][1]>0);assert.ok(r.original.pairedDistancesMm[0][1]<1e-10);assert.match(r.boundary,/No tolerance is silently applied/);
});
test('full inherited twelve-sample capacity counts all 45046719 couplings without enumerating them',()=>{
 const raw=repeated(12),r=inspectPathCouplingAlternatives(raw,{firstIndex:11,secondIndex:0});assert.equal(r.optimalCouplings,'45046719');assert.equal(r.pairs.length,144);assert.equal(r.pairs.filter(p=>p.requiredInEveryOptimalCoupling).length,2);assert.equal(r.selectedCoupling.length,23);verifyWitness(r,{firstIndex:11,secondIndex:0});
});
test('malformed and unavailable choices fail without changing original inputs; forged answers recompute',()=>{
 const raw=repeated(),before=JSON.stringify(raw);for(const choice of [false,[],{}, {firstIndex:-1,secondIndex:0},{firstIndex:3,secondIndex:0},{firstIndex:0,secondIndex:Infinity},{firstIndex:.1,secondIndex:0}])assert.throws(()=>inspectPathCouplingAlternatives(raw,choice),/Choose a pair/);
 const r=inspectPathCouplingAlternatives({...raw,optimalCouplings:'999',pairs:[]});assert.equal(r.optimalCouplings,'13');assert.deepEqual(r.selectedCoupling,r.original.coupling);assert.equal(JSON.stringify(raw),before);
 const incomplete=structuredClone(raw);incomplete.paths[0].samples[1].markId=null;assert.throws(()=>inspectPathCouplingAlternatives(incomplete),/Missing observations/);
});

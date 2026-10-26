import {pathFixture} from './sampled-path-fixture.mjs';
import {appendCaptureMark} from '../../src/capture.mjs';
import {attachMomentCalibration,removeMomentCalibration} from '../../src/demonstration-sequence.mjs';
import {calibrate,toImage} from '../../src/geometry.mjs';
import {createSequenceDiscovery,sequenceDiscoveryInputs,importSequenceDiscovery} from '../../src/sequence-discovery.mjs';
import {discoverRelationships} from '../../src/relationship-discovery.mjs';
export function sequenceFixture({points=[[17,23],[51,31],[63,62]],offsets=[[15,20],[-20,15],[-15,-20]],images=null}={}){
 let seq=pathFixture(points,{images});
 for(let i=0;i<points.length;i++){let m=seq.moments[i],h=calibrate(m.calibratedTask.source.corners),task=appendCaptureMark(m.calibratedTask,{label:'Second corresponding point',kind:'fraction',toleranceMm:2,sourcePx:toImage(h,(points[i][0]+offsets[i][0])/100,(points[i][1]+offsets[i][1])/100)});seq=attachMomentCalibration(seq,m.id,task);}
 return seq;
}

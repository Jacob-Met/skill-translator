import {pathFixture,pathAccount} from './sampled-path-fixture.mjs';
import {appendCaptureMark} from '../../src/capture.mjs';
import {attachMomentCalibration} from '../../src/demonstration-sequence.mjs';
import {calibrate,toImage} from '../../src/geometry.mjs';
import {createPathGuide} from '../../src/path-guide.mjs';
export function guideFixture(points,missing=[],images=null){let sequence=pathFixture(points,{images}),task=sequence.moments[0].calibratedTask,h=calibrate(task.source.corners);for(const [label,u]of [['Start',.1],['End',.9]])task=appendCaptureMark(task,{label,sourcePx:toImage(h,u,.2),kind:'fraction',toleranceMm:2});sequence=attachMomentCalibration(sequence,'moment-0',task);return createPathGuide(pathAccount(sequence,missing),'moment-0',{from:'authored-2',to:'authored-3',point:'authored-1',label:'Preserve initial offset',basis:'Authored fixed guide corridor',toleranceMm:1},true);}

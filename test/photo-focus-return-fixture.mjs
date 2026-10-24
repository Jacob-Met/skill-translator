import {createHash} from 'node:crypto';
import {investigation,imageBytes} from './photo-focus-fixture.mjs';
import {createPhotoFocus,photoFocusedPractice} from '../src/photo-focus.mjs';
import {photoReadingSource} from '../src/photo-calibration-readings.mjs';
import {observePractice} from '../src/practice.mjs';
export const focus=createPhotoFocus(investigation,['b']),setup=photoFocusedPractice(focus),bytes=imageBytes([31,51]);
export const observation=photoReadingSource(investigation.source,'after').observation;
observation.image={...observation.image,name:'fresh-focused-B.png',sha256:createHash('sha256').update(bytes).digest('hex')};observation.points=[{id:'b',pixel:{x:51,y:40}}];
export const session=observePractice(setup.demo,100,100,setup.session,observation),declaration={halfWidthPx:.1,halfHeightPx:0};

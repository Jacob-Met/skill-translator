import {writeFile} from 'node:fs/promises';
import {readBoundedJson} from './read-bounded-json.mjs';
import {inspectJointProducerStudy} from '../src/joint-producer-input.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node tools/joint-numeric-cues.mjs INPUT.json OUTPUT.json');
const report=await inspectJointProducerStudy(await readBoundedJson(input,8*1024*1024));
await writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.findings.status,families:report.findings.families.length,target:report.target}));

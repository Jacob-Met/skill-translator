import {readFile,stat} from 'node:fs/promises';
import {pairInstrumentChangeObservations} from '../src/instrument-change-study.mjs';
try{
 const [sourcePath,observationsPath,...extra]=process.argv.slice(2);if(!sourcePath||!observationsPath||extra.length)throw Error('Usage: node tools/pair-instrument-change.mjs original-sequence.json observations.json');
 const [sourceStat,observationStat]=await Promise.all([stat(sourcePath),stat(observationsPath)]);if(sourceStat.size>48*1024*1024||observationStat.size>2_000_000)throw Error('Source or observations exceed the maintained input bounds');
 const [sourceText,observationText]=await Promise.all([readFile(sourcePath,'utf8'),readFile(observationsPath,'utf8')]);if(Buffer.byteLength(sourceText)>48*1024*1024||Buffer.byteLength(observationText)>2_000_000)throw Error('Source or observations exceed the maintained input bounds');
 const rawSource=JSON.parse(sourceText),source=rawSource.format==='skill-translator.sequence-bundle/v1'?rawSource.sequence:rawSource,observations=JSON.parse(observationText);
 const study=pairInstrumentChangeObservations(source,observations);process.stdout.write(JSON.stringify(study,null,2)+'\n');
}catch(error){process.stderr.write(String(error.message)+'\n');process.exitCode=1;}

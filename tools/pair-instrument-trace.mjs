import {readFile} from 'node:fs/promises';
import {validateSequence} from '../src/demonstration-sequence.mjs';
import {INSTRUMENT_TRACE_FORMAT,importInstrumentTrace} from '../src/instrument-trace.mjs';
async function read(path,limit){const bytes=await readFile(path);if(bytes.length<1||bytes.length>limit)throw Error('Input exceeds its declared byte limit');return JSON.parse(bytes.toString('utf8'));}
try{
 const [sourcePath,readingsPath,...extra]=process.argv.slice(2);
 if(!sourcePath||!readingsPath||extra.length)throw Error('Usage: node tools/pair-instrument-trace.mjs DEMONSTRATION.json READINGS.json');
 const raw=await read(sourcePath,48*1024*1024);
 const source=validateSequence(raw.format==='skill-translator.sequence-bundle/v1'?raw.sequence:raw);
 const readings=await read(readingsPath,2*1024*1024);
 if(readings?.format!=='skill-translator.instrument-readings/v1'||Object.hasOwn(readings,'source'))throw Error('Choose an unbound v1 instrument readings declaration; existing source-bound traces belong in the browser receiver');
 const trace=importInstrumentTrace(source,{...readings,format:INSTRUMENT_TRACE_FORMAT,source});
 const output=JSON.stringify(trace,null,2)+'\n';
 if(Buffer.byteLength(output)>2*1024*1024)throw Error('Complete source-bound trace exceeds 2 MiB');
 process.stdout.write(output);
}catch(error){process.stderr.write('Instrument pairing refused: '+error.message+'\n');process.exitCode=1;}

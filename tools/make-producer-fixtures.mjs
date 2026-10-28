import {mkdir,writeFile} from 'node:fs/promises';import {join} from 'node:path';
import {producerExport} from '../test/producer-fixture.mjs';
const destination=process.argv[2];if(!destination)throw Error('Supply a dedicated fixture output directory');await mkdir(destination,{recursive:true});
for(const trace of [false,true])for(const [i,values]of [[1,3,1],[1,1,3]].entries())await writeFile(join(destination,`cue-${trace?'v2':'v1'}-${i}.json`),JSON.stringify(producerExport(values,{trace})),{flag:'wx'});

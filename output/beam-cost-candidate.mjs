import {build} from 'esbuild';
import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const out=join(mkdtempSync(join(tmpdir(),'beam-cost-')),'bundle.mjs');
await build({stdin:{contents:`export * from './output/beamProjectionCandidate'; export * from './src/game/dungeon/generate'; export * from './src/game/sentry/placement';`,resolveDir:process.cwd()},define:{'import.meta.env.DEV':'false','import.meta.env':'{}'},bundle:true,platform:'node',format:'esm',outfile:out});
const L=await import(pathToFileURL(out));const results=[];
for(const seed of [4242,77])for(const floor of [2,3]){const dungeon=L.generateDungeon({seed,floor});for(const room of dungeon.rooms){const sentry=L.sentryFor(room,dungeon.seed,floor);if(!sentry)continue;const project=L.beamProjector(room),vertices=[];let max=0;const started=performance.now();for(let i=0;i<360;i++){project(sentry.at,i*Math.PI/180,vertices);max=Math.max(max,vertices.length/9);}results.push({seed,floor,id:room.id,ms:(performance.now()-started)/360,max});}}
results.sort((a,b)=>b.ms-a.ms);console.log(JSON.stringify(results,null,2));

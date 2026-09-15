import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd().replaceAll('\\','/'),temp=mkdtempSync(join(tmpdir(),'bat-flight-'));
const entry=join(temp,'entry.ts'),out=join(temp,'bundle.mjs');
writeFileSync(entry,`import '${root}/src/game/rooms/shipped';\n`+['dungeon/generate','dungeon/footprint','mobs/ambient','mobs/batFlight'].map(p=>`export * from '${root}/src/game/${p}';`).join('\n'));
await build({entryPoints:[entry],outfile:out,bundle:true,platform:'node',format:'esm',logLevel:'error',define:{'import.meta.env.DEV':'false','import.meta.env':'{}'}});
const L=await import(pathToFileURL(out).href);let roosts=0,poses=0;
for(let seed=1;seed<=40;seed++)for(const floor of [1,2,3]){
 const d=L.generateDungeon({seed,floor});
 for(const r of d.rooms){const at=L.roostFor(r,d.seed);if(!at)continue;roosts++;const radius=L.batFlightRadius(r,at);
  for(let i=0;i<7;i++)for(let t=0;t<8;t+=.2){const p=L.batPose(i,t,true,false,radius);poses++;
   assert.ok(L.insideRoom(r,at.x+p.x,at.z+p.z,.6),'full wing clearance inside room');
   assert.ok(p.y+.55<.6,'wing tips remain below ceiling');
  }
 }
}
console.log(`PASS ${roosts} generated roosts, ${poses} airborne poses fit real room footprints`);

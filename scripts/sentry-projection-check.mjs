import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const bundle=join(mkdtempSync(join(tmpdir(),'sentry-projection-')), 'bundle.mjs');
await build({stdin:{contents:`import './src/game/rooms/shipped'; export * from './src/game/sentry/beamProjection'; export * from './src/game/worldbuilding/elevation'; export * from './src/game/dungeon/generate'; export * from './src/game/dungeon/types'; export * from './src/game/dungeon/footprint'; export * from './src/game/sentry/placement'; export * from './src/game/world';`,resolveDir:process.cwd()},define:{'import.meta.env.DEV':'false','import.meta.env':'{}'},bundle:true,platform:'node',format:'esm',outfile:bundle});
const L=await import(pathToFileURL(bundle));
const flat = {...L.generateDungeon({seed:72,floor:2}).rooms[0],size:20,shape:'square',links:{},secret:undefined,wings:{}};
const flatVertices=[];L.beamProjector(flat)([0,0,0],0,flatVertices);
assert.equal(flatVertices.length,9,'one straight wall needs one fan triangle');
let checked=0,maxTriangles=0,raised=0;
for(const dir of L.DIRS)for(const shape of ['square','circle','octagon','triangle']) {
const room={...L.generateDungeon({seed:72,floor:2}).rooms[0],size:12,shape,links:{},secret:undefined,wings:{[dir]:10},wingWidths:{[dir]:6}};
const axis=L.DIR_STEP[dir],origin=[axis.x*4,0,axis.z*4],project=L.beamProjector(room),output=[];
for(let turn=0;turn<72;turn++) {
project(origin,turn*Math.PI/36,output);maxTriangles=Math.max(maxTriangles,output.length/9);
for(let i=0;i<output.length;i+=9) {
const a=output.slice(i,i+3),b=output.slice(i+3,i+6),c=output.slice(i+6,i+9);
const up=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]);assert.ok(up>=-1e-8,'upward winding');
if(up<1e-10)continue;
for(const weights of [[1/3,1/3,1/3],[.8,.1,.1],[.1,.8,.1],[.1,.1,.8]]) {
const v=a.map((_,k)=>a[k]*weights[0]+b[k]*weights[1]+c[k]*weights[2]);
assert.ok(L.insideRoom(room,v[0]+origin[0],v[2]+origin[2]),'projected interior stays inside the room');
const expected=L.floorHeightAt(room,v[0]+origin[0],v[2]+origin[2])+.06;
assert.ok(Math.abs(v[1]-expected)<1e-6,JSON.stringify({dir,shape,v,expected}));checked++;if(v[1]>.1)raised++;
}
}
}
}
assert.ok(raised>0);console.log({checked,raised,maxTriangles});

let generated = 0, shifted = 0, apses = 0, samples = 0;
for (let seed = 1; seed <= 24; seed++) {
  let next = seed;
  for (let floor = 1; floor <= 3; floor++) {
    const rules = L.floorRules(floor);
    const dungeon = L.generateDungeon({ seed: next, floor, minRooms: rules.minRooms, maxRooms: rules.maxRooms, lastFloor: floor === 3 });
    next = (dungeon.seed * 7919 + floor + 1) >>> 0;
    for (const room of dungeon.rooms) {
      if (!L.terracesFor(room).length) continue;
      const watcher = L.sentryFor(room, dungeon.seed, floor);
      if (!watcher) continue;
      generated++;
      if (Object.values(room.wingOffsets ?? {}).some(x => x !== 0)) shifted++;
      if (Object.values(room.wingProfiles ?? {}).includes('apse')) apses++;
      const output = [], project = L.beamProjector(room), origin = watcher.at;
      for (let turn = 0; turn < 36; turn++) {
        project(origin, turn * Math.PI / 18, output);
        for (let i = 0; i < output.length; i += 9) {
          const a = output.slice(i, i + 3), b = output.slice(i + 3, i + 6), c = output.slice(i + 6, i + 9);
          const area = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
          assert.ok(area >= -1e-8);
          if (area < 1e-9) continue;
          for (const w of [[1/3,1/3,1/3],[.8,.1,.1],[.1,.8,.1],[.1,.1,.8]]) {
            const v = a.map((_, k) => a[k]*w[0]+b[k]*w[1]+c[k]*w[2]+origin[k]);
            assert.ok(L.insideRoom(room, v[0], v[2]), 'generated beam remains inside walls');
            assert.ok(Math.abs(v[1]-L.floorHeightAt(room,v[0],v[2])-L.BEAM_LIFT)<1e-6,
              JSON.stringify({seed,floor,room:room.id,v}));
            samples++;
          }
        }
      }
    }
  }
}
assert.ok(generated > 20 && shifted > 0 && apses > 0);
console.log({generated,shifted,apses,samples});


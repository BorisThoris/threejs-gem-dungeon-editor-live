import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
await build({stdin:{contents:`export * from './src/game/sentry/beamProjection'; export * from './src/game/worldbuilding/elevation'; export * from './src/game/dungeon/generate'; export * from './src/game/dungeon/types';`,resolveDir:process.cwd()},define:{'import.meta.env.DEV':'false','import.meta.env':'{}'},bundle:true,platform:'node',format:'esm',outfile:'output/beam-projection-bundle.mjs'});
const L=await import(pathToFileURL(process.cwd()+'/output/beam-projection-bundle.mjs'));
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
const expected=L.floorHeightAt(room,v[0]+origin[0],v[2]+origin[2])+.06;
assert.ok(Math.abs(v[1]-expected)<1e-6,JSON.stringify({dir,shape,v,expected}));checked++;if(v[1]>.1)raised++;
}
}
}
}
assert.ok(raised>0);console.log({checked,raised,maxTriangles});


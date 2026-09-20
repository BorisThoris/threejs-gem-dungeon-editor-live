import assert from 'node:assert/strict';
import {build} from 'esbuild';import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const bundle=join(mkdtempSync(join(tmpdir(),'service-guide-')),'bundle.mjs');
await build({stdin:{contents:`import './src/game/rooms/shipped';export * from './src/game/worldbuilding/serviceTrail';export * from './src/game/rooms/placeName';export * from './src/game/dungeon/generate';export * from './src/game/dungeon/types';`,resolveDir:process.cwd()},define:{'import.meta.env.DEV':'false','import.meta.env':'{}'},bundle:true,platform:'node',format:'esm',outfile:bundle});
const L=await import(pathToFileURL(bundle));
const base=L.generateDungeon({seed:72,floor:2});
const ids=['source','middle','host','detour','a','b','shortcut','secret'];
const rooms=ids.map(id=>({...base.rooms[0],id,kind:'normal',district:'gardens',biome:'mossy',links:{},secret:undefined}));
const room=id=>rooms.find(r=>r.id===id);
function link(a,dir,b){room(a).links[dir]=b;room(b).links[L.OPPOSITE[dir]]=a;}
link('source','north','middle');link('middle','north','host');
link('detour','east','a');link('a','east','b');link('b','east','source');
link('detour','north','shortcut');link('shortcut','east','host');
room('host').secret={dir:'north',to:'secret'};
const d={...base,rooms,vaultId:null,serviceTrail:{route:['source','middle','host'],hostId:'host'}};
const known=['detour','a','b','source','middle','host'];
assert.deepEqual(L.serviceTrailGuide(d,'source'),{status:'follow',dir:'north',destinationId:'middle',doors:2});
assert.deepEqual(L.serviceTrailGuide(d,'host'),{status:'catch',dir:'north',doors:0});
assert.deepEqual(L.serviceTrailGuide(d,'detour',known),{status:'return',dir:'east',destinationId:'a',doors:3},'unexplored shortcut stays private');
assert.deepEqual(L.serviceTrailGuide(d,'detour',[...known,'shortcut']),{status:'return',dir:'north',destinationId:'shortcut',doors:2},'known shortcut can be used');
assert.equal(L.serviceTrailGuide(d,'detour',['detour']).status,'lost');
assert.equal(L.serviceTrailGuide({...d,vaultId:'shortcut'},'detour',[...known,'shortcut']).dir,'east','vault cannot gate recovery');
room('shortcut').kind='end';assert.equal(L.serviceTrailGuide(d,'detour',[...known,'shortcut']).dir,'east','descending stairs cannot gate recovery');
room('host').links.north='secret';assert.equal(L.serviceTrailGuide(d,'detour',known).status,'complete');
let routes=0,legs=0;
for(let seed=1;seed<=120;seed++)for(const floor of [1,2,3]){
const dungeon=L.generateDungeon({seed,floor});if(!dungeon.serviceTrail)continue;routes++;
for(const [i,id] of dungeon.serviceTrail.route.entries()){
const guide=L.serviceTrailGuide(dungeon,id),r=dungeon.rooms.find(r=>r.id===id);
if(id===dungeon.serviceTrail.hostId){assert.equal(guide.status,'catch');assert.equal(guide.dir,r.secret.dir);continue;}
assert.equal(guide.status,'follow');assert.equal(r.links[guide.dir],dungeon.serviceTrail.route[i+1]);
assert.equal(guide.doors,dungeon.serviceTrail.route.length-i-1);
const next=dungeon.rooms.find(r=>r.id===guide.destinationId);
assert.ok(L.serviceTrailText(dungeon,id).includes(L.roomPlaceName(next)));legs++;
}}
assert.ok(routes>200);console.log('PASS service trail guidance: known-route recovery, privacy, vault/stairs avoidance, completion and named generated legs',{routes,legs});

import assert from 'node:assert/strict';
import {build} from 'esbuild';import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const bundle=join(mkdtempSync(join(tmpdir(),'service-guide-')),'bundle.mjs');
await build({stdin:{contents:`import './src/game/rooms/shipped';export * from './src/game/worldbuilding/serviceTrail';export * from './src/game/worldbuilding/secretTrail';export * from './src/game/worldbuilding/trailGuide';export * from './src/game/warden/bars';export * from './src/game/rooms/placeName';export * from './src/game/dungeon/generate';export * from './src/game/dungeon/types';`,resolveDir:process.cwd()},define:{'import.meta.env.DEV':'false','import.meta.env':'{}'},bundle:true,platform:'node',format:'esm',outfile:bundle});
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
room('shortcut').kind='normal';
d.secretTrail={...d.serviceTrail,sourceId:'source',landmark:'rootwell'};
const bar=new Set([L.barKey('source','middle')]);
assert.equal(L.serviceTrailGuide(d,'source',known,bar).status,'blocked','an unseen bypass cannot replace a barred marked door');
assert.match(L.secretTrailText(d,'source',known,bar),/trail blocked.*north passage barred/);
assert.match(L.secretTrailText(d,'detour',known),/rejoin the trail/,'landmark guidance survives leaving the marked route');
assert.equal(L.serviceTrailGuide(d,'source',[...known,'shortcut'],bar).status,'detour');
assert.equal(L.serviceTrailGuide(d,'source',[...known,'shortcut'],new Set([L.barKey('middle','host')])).dir,'west',
  'a known bypass can begin before the blocked leg without bouncing back toward it');
assert.equal(L.serviceTrailGuide(d,'detour',known,new Set([L.barKey('detour','a')])).status,'blocked',
  'a blocked way back is distinct from not knowing one');
assert.equal(L.serviceTrailGuide({...d,vaultId:'shortcut'},'source',[...known,'shortcut'],bar).status,'blocked');
assert.equal(L.serviceTrailGuide({...d,vaultId:'detour'},'detour',known).dir,'east',
  'a delver already inside a vault can recover the trail through its entrance');
assert.equal(L.serviceTrailGuide(d,'source',[...known,'shortcut'],new Set([...bar,L.barKey('detour','shortcut')])).status,'blocked',
  'blocking the bypass as well must not produce an impossible direction');
let at='middle';const walked=new Set();
const downstreamBar=new Set([L.barKey('middle','host')]);
while(at!=='host'){
  assert.ok(!walked.has(at),'guidance cannot loop between the marked trail and a detour');walked.add(at);
  const guide=L.learnedTrailGuide(d,d.secretTrail,at,[...known,'shortcut'],downstreamBar);
  assert.ok(guide.destinationId && room(at).links[guide.dir]===guide.destinationId);
  assert.ok(!downstreamBar.has(L.barKey(at,guide.destinationId)));
  at=guide.destinationId;
}
room('host').links.north='secret';assert.equal(L.serviceTrailGuide(d,'detour',known).status,'complete');
assert.match(L.secretTrailText(d,'source',known,bar),/stands open/,'opening the host finishes the landmark clue everywhere');
let routes=0,legs=0,detours=0;
for(let seed=1;seed<=120;seed++)for(const floor of [1,2,3]){
const dungeon=L.generateDungeon({seed,floor});if(!dungeon.serviceTrail)continue;routes++;
for(const [i,id] of dungeon.serviceTrail.route.entries()){
const guide=L.serviceTrailGuide(dungeon,id),r=dungeon.rooms.find(r=>r.id===id);
if(id===dungeon.serviceTrail.hostId){assert.equal(guide.status,'catch');assert.equal(guide.dir,r.secret.dir);continue;}
assert.equal(guide.status,'follow');assert.equal(r.links[guide.dir],dungeon.serviceTrail.route[i+1]);
assert.equal(guide.doors,dungeon.serviceTrail.route.length-i-1);
const next=dungeon.rooms.find(r=>r.id===guide.destinationId);
assert.ok(L.serviceTrailText(dungeon,id).includes(L.roomPlaceName(next)));legs++;
}
// Independently flood the known playable rooms. Whenever a blocked marked
// leg has a real bypass, repeatedly following the guide must reach the host.
const allowed=new Set(dungeon.rooms.filter(r=>r.id!==dungeon.vaultId&&r.kind!=='end').map(r=>r.id));
const byId=new Map(dungeon.rooms.map(r=>[r.id,r]));
for(let i=0;i<dungeon.serviceTrail.route.length-1;i++){
  const start=dungeon.serviceTrail.route[i],next=dungeon.serviceTrail.route[i+1];
  const blocked=new Set([L.barKey(start,next)]),reachable=new Set([start]);
  for(const id of reachable)for(const to of Object.values(byId.get(id).links))
    if(allowed.has(to)&&!blocked.has(L.barKey(id,to)))reachable.add(to);
  if(!reachable.has(dungeon.serviceTrail.hostId))continue;
  detours++;let current=start;const steps=new Set();
  while(current!==dungeon.serviceTrail.hostId){
    assert.ok(!steps.has(current),`seed ${seed}, floor ${floor}: detour loops`);steps.add(current);
    const guide=L.serviceTrailGuide(dungeon,current,[...allowed],blocked);
    assert.ok(guide.destinationId&&byId.get(current).links[guide.dir]===guide.destinationId,'a reachable host always has a real next door');
    assert.ok(allowed.has(guide.destinationId)&&!blocked.has(L.barKey(current,guide.destinationId)),'guidance respects the same blocked edge from either side');
    current=guide.destinationId;
  }
}}
assert.ok(routes>200&&detours>20);console.log('PASS learned trails: recovery, barrier detours without loops, privacy, vault/stairs avoidance, completion and generated legs',{routes,legs,detours});

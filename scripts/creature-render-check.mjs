import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright-core';
mkdirSync('output/creature-review',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`http://127.0.0.1:${process.env.PORT??5234}/`);
 await page.getByTestId('menu-start').click();
 await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
 const fixtures=await page.evaluate(async()=>{
  const {generateDungeon}=await import('/src/game/dungeon/generate.ts');
  const {croakersFor,ratsFor,roostFor,mothRoom}=await import('/src/game/mobs/ambient.ts');
  const {beetlesFor}=await import('/src/game/mobs/beetleHabitat.ts');
  const {mitesFor}=await import('/src/game/mobs/miteHabitat.ts');
  const {shardbacksFor}=await import('/src/game/mobs/shardbackHabitat.ts');
  const {keeperPostsFor}=await import('/src/game/keeper/posts.ts');
  const found={};
  for(let seed=1;seed<80;seed++){
   const d=generateDungeon({seed,floor:3});
   for(const r of d.rooms){
    const conditions={frog:croakersFor(r,d.seed).length>0,rat:ratsFor(r,d.seed).length>0,bat:!!roostFor(r,d.seed),moth:mothRoom(d)===r.id,beetles:beetlesFor(r).length>0,mites:mitesFor(r).length>0,shardbacks:shardbacksFor(r).length>0,keeper:keeperPostsFor(d,3).some(p=>p.roomId===r.id),actors:r.kind==='normal'};
    for(const [k,v]of Object.entries(conditions))if(v&&!found[k])found[k]={d,r};
   }
   if(Object.keys(found).length===9)return found;
  }throw Error('missing habitat');
 });
 const names={frog:'croaker-0',rat:'rat-0',bat:'ambient-bats',batFlight:'ambient-bats',moth:'creature-moth',beetles:'creature-beetles',mites:'creature-mites',shardbacks:'creature-shardbacks',keeper:'creature-keeper',warden:'creature-warden',cutpurse:'creature-cutpurse',reaper:'creature-reaper',harrier:'creature-harrier',harrierDown:'creature-harrier',wisp:'creature-wisp'};
 for(const [kind,name]of Object.entries(names)){
  if(process.env.CREATURES&&!process.env.CREATURES.split(',').includes(kind))continue;
  await page.evaluate(async({f,kind})=>{
   const {d,r}=f; (await import('/src/game/din/din.ts')).reset();
   window.__run.setState({dungeon:d,currentRoomId:r.id,floor:3,phase:'playing',paused:false,inputLocks:0,transitioning:false,waterOpenedAt:null,glim:['beetles','shardbacks'].includes(kind)?0:90,oil:100,litUntil:kind==='wisp'?1e9:0,wardenRoomId:kind==='warden'?r.id:null,wardenAwake:kind==='warden',harrierAwake:kind.startsWith('harrier'),harrierSlain:!kind.startsWith('harrier'),harrierDownedUntil:kind==='harrierDown'?1e9:0,reaperAwake:kind==='reaper',thiefPhase:kind==='cutpurse'?'stalking':'away',invulnerableUntil:1e9,alarm:0});
   window.__bus.emit('teleport',{position:[0,1.5,0]});
  },{f:fixtures[kind]??(kind==='batFlight'?fixtures.bat:fixtures.actors),kind});
  await page.waitForFunction(name=>!!window.__scene.getObjectByName(name),name);
  if(kind==='batFlight')await page.evaluate(()=>window.__run.getState().rouseBats());
  await page.waitForTimeout(400);
  const result=await page.evaluate(async({name,kind})=>{
   window.__run.getState().pause();
   const T=await import('/node_modules/three/build/three.module.js');
   const scene=window.__scene,obj=scene.getObjectByName(name);
   scene.updateMatrixWorld(true);
   obj.traverse(o=>{if(o.isInstancedMesh)o.computeBoundingBox();});
   const box=new T.Box3().setFromObject(obj),center=box.getCenter(new T.Vector3());
   if(kind==='beetles'){const p=window.__beetles.poses[0];center.set(p.x,p.y,p.z);}
   if(kind==='shardbacks'){const p=window.__shardbacks.poses[0];center.x=p.x;center.z=p.z;}
   if(kind==='bat'){
    const timber=new T.Box3().setFromObject(scene.getObjectByName('bat-roost-timber'));
    if(Math.abs(box.max.y-timber.min.y)>.01)throw Error('roosting bats must hang directly beneath their timber perch');
   }
   const renderer=new T.WebGLRenderer({preserveDrawingBuffer:true});renderer.setSize(640,480);renderer.setPixelRatio(1);
   const camera=new T.PerspectiveCamera(60,640/480,.05,100);
   const distance=['warden','keeper','reaper','bat','batFlight','harrier'].includes(kind)?4:2.3;
   const {floorHeightAt}=await import('/src/game/worldbuilding/elevation.ts');
   const s=window.__run.getState(),r=s.dungeon.rooms.find(r=>r.id===s.currentRoomId);
   const base=floorHeightAt(r,center.x,center.z);
   // Look outward from the room interior at an ordinary standing eye height.
   const len=Math.hypot(center.x,center.z)||1;
   camera.position.set(center.x-center.x/len*distance,base+1.6,center.z-center.z/len*distance);
   if(len<.5)camera.position.z+=distance;
   camera.lookAt(center);camera.updateMatrixWorld();
   renderer.render(scene,camera);
   const gl=renderer.getContext(),a=new Uint8Array(640*480*4),b=new Uint8Array(a.length);
   gl.readPixels(0,0,640,480,gl.RGBA,gl.UNSIGNED_BYTE,a);
   const image=renderer.domElement.toDataURL();
   const visible=obj.visible,meshes=[];
   obj.traverse(o=>{if(o.isMesh){meshes.push([o,o.visible]);o.visible=false;}});
   renderer.render(scene,camera);gl.readPixels(0,0,640,480,gl.RGBA,gl.UNSIGNED_BYTE,b);
   for(const [o,v]of meshes)o.visible=v;
   let pixels=0;for(let i=0;i<a.length;i+=4)if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>3)pixels++;
   renderer.dispose();
   return {pixels,visible,bounds:[...box.min.toArray(),...box.max.toArray()],base,image};
  },{name,kind});
  writeFileSync(`output/creature-review/${kind}.png`,Buffer.from(result.image.split(',')[1],'base64'));delete result.image;
  console.log(kind,result);assert.ok(result.visible&&result.pixels>8,`${kind} must contribute visible pixels in its real room`);
  assert.ok(result.bounds.every(Number.isFinite));
  if(kind==='batFlight'){
   const matrices=await page.evaluate(()=>window.__scene.getObjectByName('ambient-bats').children.map(m=>Array.from(m.instanceMatrix.array)));
   await page.waitForTimeout(300);
   assert.deepEqual(await page.evaluate(()=>window.__scene.getObjectByName('ambient-bats').children.map(m=>Array.from(m.instanceMatrix.array))),matrices,'paused bats freeze their flight and wingbeats');
  }
  if(kind.startsWith('harrier')){
   const pose=()=>{const g=window.__scene.getObjectByName('creature-harrier');return [g.position.toArray(),g.rotation.toArray(),...g.children.map(c=>c.rotation.toArray())];};
   const before=await page.evaluate(pose);await page.waitForTimeout(300);
   assert.deepEqual(await page.evaluate(pose),before,'Harrier pose freezes while paused');
  }
  if(kind==='harrierDown')assert.ok(result.bounds[1]>=result.base,'folded downed Harrier stays above floor');
  if(kind==='frog')assert.ok(result.bounds[1]>=result.base+.04,'frog feet stay above terrain');
  if(kind==='mites'){
   const before=await page.evaluate(()=>{
    window.__miteBurrows=0;window.__bus.on('mitesBurrowed',()=>window.__miteBurrows++);
    const s=window.__run.getState(),visible=window.__mites.visible;
    s.resume();window.__bus.emit('sprinted',{roomId:s.currentRoomId,x:0,z:0,surface:'stone'});
    return visible;
   });
   await page.waitForFunction(before=>window.__mites?.visible<before*.75,before);
   const reaction=await page.evaluate(()=>({visible:window.__mites.visible,burrows:window.__miteBurrows}));
   assert.ok(reaction.visible<before*.75,'a loud footfall sends the visible colony under the ash');
   assert.equal(reaction.burrows,1,'the colony announces one shared burrow response');
   await page.evaluate(()=>window.__run.getState().pause());
  }
  if(kind==='shardbacks'){
   await page.evaluate(()=>{
    window.__shardbackEvents={warning:0,chime:0};
    window.__bus.on('shardbacksWarning',()=>window.__shardbackEvents.warning++);
    window.__bus.on('shardbacksChimed',()=>window.__shardbackEvents.chime++);
    const p=window.__shardbacks.poses[0],s=window.__run.getState();
    window.__bus.emit('teleport',{position:[p.x,1.5,p.z]});
    window.__run.setState({glim:90});s.resume();
   });
   await page.waitForFunction(()=>window.__shardbacks?.charge>.2);
   const frozen=await page.evaluate(()=>{window.__run.getState().pause();return window.__shardbacks.charge;});
   await page.waitForTimeout(300);
   assert.equal(await page.evaluate(()=>window.__shardbacks.charge),frozen,'paused shardbacks freeze their warning charge');
   await page.evaluate(()=>{window.__run.setState({glim:0});window.__run.getState().resume();});
   await page.waitForFunction(()=>window.__shardbacks?.charge===0);
   assert.equal(await page.evaluate(()=>window.__shardbackEvents.chime),0,'lowering the lantern cancels the warning');
   await page.evaluate(()=>window.__run.setState({glim:90}));
   await page.waitForFunction(()=>window.__shardbacks?.cooling===true,null,{timeout:5000});
   const response=await page.evaluate(async()=>{
    const din=await import('/src/game/din/din.ts'),s=window.__run.getState();
    return {events:window.__shardbackEvents,charge:window.__shardbacks.charge,cooling:window.__shardbacks.cooling,
      heard:din.snapshot(s.currentRoomId).some(signal=>signal.source==='shardbacksChimed'&&signal.tags.includes('loud'))};
   });
   assert.deepEqual(response.events,{warning:2,chime:1},'the colony warns once per approach and chimes once after a renewed warning');
   assert.ok(response.cooling&&response.charge===0,'the chime folds the colony into cooldown');
   assert.ok(response.heard,'the shardback chime enters the room Din');
   await page.evaluate(()=>window.__run.getState().pause());
  }
 }
 assert.deepEqual(errors,[]);console.log(process.env.CREATURES?`PASS visible creature states: ${process.env.CREATURES}`:'PASS all 13 creature types contribute visible pixels in native room lighting');
}finally{await browser.close();}

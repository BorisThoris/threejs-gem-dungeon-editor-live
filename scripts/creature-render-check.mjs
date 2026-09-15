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
  const {keeperPostsFor}=await import('/src/game/keeper/posts.ts');
  const found={};
  for(let seed=1;seed<80;seed++){
   const d=generateDungeon({seed,floor:3});
   for(const r of d.rooms){
    const conditions={frog:croakersFor(r,d.seed).length>0,rat:ratsFor(r,d.seed).length>0,bat:!!roostFor(r,d.seed),moth:mothRoom(d)===r.id,beetles:beetlesFor(r).length>0,keeper:keeperPostsFor(d,3).some(p=>p.roomId===r.id),actors:r.kind==='normal'};
    for(const [k,v]of Object.entries(conditions))if(v&&!found[k])found[k]={d,r};
   }
   if(Object.keys(found).length===7)return found;
  }throw Error('missing habitat');
 });
 const names={frog:'croaker-0',rat:'rat-0',bat:'ambient-bats',batFlight:'ambient-bats',moth:'creature-moth',beetles:'creature-beetles',keeper:'creature-keeper',warden:'creature-warden',cutpurse:'creature-cutpurse',reaper:'creature-reaper',harrier:'creature-harrier',harrierDown:'creature-harrier',wisp:'creature-wisp'};
 for(const [kind,name]of Object.entries(names)){
  if(process.env.CREATURES&&!process.env.CREATURES.split(',').includes(kind))continue;
  await page.evaluate(async({f,kind})=>{
   const {d,r}=f; (await import('/src/game/din/din.ts')).reset();
   window.__run.setState({dungeon:d,currentRoomId:r.id,floor:3,phase:'playing',paused:false,inputLocks:0,transitioning:false,waterOpenedAt:null,glim:kind==='beetles'?0:90,oil:100,litUntil:kind==='wisp'?1e9:0,wardenRoomId:kind==='warden'?r.id:null,wardenAwake:kind==='warden',harrierAwake:kind.startsWith('harrier'),harrierSlain:!kind.startsWith('harrier'),harrierDownedUntil:kind==='harrierDown'?1e9:0,reaperAwake:kind==='reaper',thiefPhase:kind==='cutpurse'?'stalking':'away',invulnerableUntil:1e9,alarm:0});
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
 }
 assert.deepEqual(errors,[]);console.log(process.env.CREATURES?`PASS visible creature states: ${process.env.CREATURES}`:'PASS all 11 creature types contribute visible pixels in native room lighting');
}finally{await browser.close();}

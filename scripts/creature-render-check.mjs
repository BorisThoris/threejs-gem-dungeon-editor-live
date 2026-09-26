import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const reviewDir=resolve('output/creature-gallery');
mkdirSync(reviewDir,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 const captures=[];
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
  const {newtsFor}=await import('/src/game/mobs/newtHabitat.ts');
  const {brineCrabsFor}=await import('/src/game/mobs/brineCrabHabitat.ts');
  const {copperbacksFor}=await import('/src/game/mobs/copperbackHabitat.ts');
  const {wicklingsFor}=await import('/src/game/mobs/wicklingHabitat.ts');
  const {keeperPostsFor}=await import('/src/game/keeper/posts.ts');
  const found={};
  for(let seed=1;seed<160;seed++){
   const d=generateDungeon({seed,floor:3});
   for(const r of d.rooms){
    const conditions={frog:croakersFor(r,d.seed).length>0,rat:ratsFor(r,d.seed).length>0,bat:!!roostFor(r,d.seed),moth:mothRoom(d)===r.id,beetles:beetlesFor(r).length>0,mites:mitesFor(r).length>0,shardbacks:shardbacksFor(r).length>0,newts:newtsFor(r).length>0,brinecrabs:brineCrabsFor(r).length>0,copperbacks:copperbacksFor(r).length>0,wicklings:wicklingsFor(r).length>0,keeper:keeperPostsFor(d,3).some(p=>p.roomId===r.id),actors:r.kind==='normal'};
    for(const [k,v]of Object.entries(conditions))if(v&&(!found[k]||(['newts','brinecrabs','copperbacks','wicklings'].includes(k)&&!found[k].r.secret&&r.secret)))found[k]={d,r};
   }
   if(Object.keys(found).length===13&&found.newts.r.secret&&found.brinecrabs.r.secret&&found.copperbacks.r.secret&&found.wicklings.r.secret)return found;
  }throw Error('missing habitat');
 });
 // Habitat reaction checks emit shared Din signals. Run them before the mite
 // and flight fixtures make noise, otherwise an overlapping generated floor
 // can begin a retreat before that habitat's event listener is attached.
 const names={frog:'croaker-0',newts:'creature-newts',brinecrabs:'creature-brine-crabs',copperbacks:'creature-copperbacks',wicklings:'creature-wicklings',rat:'rat-0',bat:'ambient-bats',batFlight:'ambient-bats',moth:'creature-moth',beetles:'creature-beetles',mites:'creature-mites',shardbacks:'creature-shardbacks',keeper:'creature-keeper',warden:'creature-warden',cutpurse:'creature-cutpurse',reaper:'creature-reaper',harrier:'creature-harrier',harrierDown:'creature-harrier',wisp:'creature-wisp'};
 const speciesFor={frog:'croaker',newts:'newt',brinecrabs:'brinecrab',copperbacks:'copperback',wicklings:'wickling',rat:'rat',bat:'bat',batFlight:'bat',moth:'moth',beetles:'beetle',mites:'mite',shardbacks:'shardback',keeper:'keeper',warden:'warden',cutpurse:'cutpurse',reaper:'reaper',harrier:'harrier',harrierDown:'harrier',wisp:'wisp'};
 const declaredSpecies=await page.evaluate(async()=>(await import('/src/game/mobs/contract.ts')).CREATURE_IDS);
 assert.deepEqual(Object.keys(names).sort(),Object.keys(speciesFor).sort(),'every render fixture names a catalog species');
 assert.deepEqual([...new Set(Object.values(speciesFor))].sort(),declaredSpecies.sort(),'every catalog creature has a live render fixture');
 for(const [kind,name]of Object.entries(names)){
  if(process.env.CREATURES&&!process.env.CREATURES.split(',').includes(kind))continue;
  await page.evaluate(async({f,kind})=>{
   const {d,r}=f; (await import('/src/game/din/din.ts')).reset();
   window.__run.setState({dungeon:d,currentRoomId:r.id,floor:3,phase:'playing',paused:false,inputLocks:0,transitioning:false,waterOpenedAt:null,glim:['beetles','shardbacks','brinecrabs'].includes(kind)?0:90,oil:100,litUntil:kind==='wisp'?1e9:0,wardenRoomId:kind==='warden'?r.id:null,wardenAwake:kind==='warden',harrierRoomId:kind.startsWith('harrier')?r.id:null,harrierAwake:kind.startsWith('harrier'),harrierSlain:!kind.startsWith('harrier'),harrierDownedUntil:kind==='harrierDown'?1e9:0,reaperRoomId:kind==='reaper'?r.id:null,reaperAwake:kind==='reaper',thiefRoomId:kind==='cutpurse'?r.id:null,thiefPhase:kind==='cutpurse'?'stalking':'away',wispOut:kind==='wisp',invulnerableUntil:1e9,alarm:0});
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
   if(kind==='mites'){const p=window.__mites.poses[0];center.set(p.x,box.min.y+0.04,p.z);}
   if(kind==='shardbacks'){const p=window.__shardbacks.poses[0];center.x=p.x;center.z=p.z;}
   if(kind==='newts'){const p=window.__newts.poses[0];center.x=p.x;center.z=p.z;}
   if(kind==='brinecrabs'){const p=window.__brineCrabs.poses[0];center.x=p.x;center.z=p.z;}
   if(kind==='copperbacks'){const p=window.__copperbacks.poses[0];center.x=p.x;center.z=p.z;}
   if(kind==='wicklings'){const p=window.__wicklings.poses[0];center.x=p.x;center.z=p.z;}
   if(kind==='bat'){
    const timber=new T.Box3().setFromObject(scene.getObjectByName('bat-roost-timber'));
    if(Math.abs(box.max.y-timber.min.y)>.01)throw Error('roosting bats must hang directly beneath their timber perch');
   }
   const renderer=new T.WebGLRenderer({preserveDrawingBuffer:true});renderer.setSize(640,480);renderer.setPixelRatio(1);
   const camera=new T.PerspectiveCamera(60,640/480,.05,100);
   const distance=kind==='mites'?0.9:['warden','keeper','reaper','bat','batFlight','harrier'].includes(kind)?4:2.3;
   const {floorHeightAt}=await import('/src/game/worldbuilding/elevation.ts');
   const s=window.__run.getState(),r=s.dungeon.rooms.find(r=>r.id===s.currentRoomId);
   const base=floorHeightAt(r,center.x,center.z);
   const gl=renderer.getContext(),a=new Uint8Array(640*480*4),b=new Uint8Array(a.length);
   const visible=obj.visible,meshes=[];
   obj.traverse(o=>{if(o.isMesh)meshes.push([o,o.visible]);});
   const capture=(angle)=>{
    camera.position.set(center.x+Math.cos(angle)*distance,base+(kind==='mites'?0.48:1.6),center.z+Math.sin(angle)*distance);
    camera.lookAt(center);camera.updateMatrixWorld();
    renderer.render(scene,camera);gl.readPixels(0,0,640,480,gl.RGBA,gl.UNSIGNED_BYTE,a);
    const image=renderer.domElement.toDataURL();
    for(const [mesh]of meshes)mesh.visible=false;
    renderer.render(scene,camera);gl.readPixels(0,0,640,480,gl.RGBA,gl.UNSIGNED_BYTE,b);
    for(const [mesh,wasVisible]of meshes)mesh.visible=wasVisible;
    let pixels=0;for(let i=0;i<a.length;i+=4)if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>3)pixels++;
    return {pixels,image,view:camera.position.toArray()};
   };
   // A wall, pillar or shelf may stand between the creature and the first
   // inward-facing review camera. Try neighboring sightlines before failing.
   const inward=Math.atan2(-center.z,-center.x);
   let frame=capture(Math.hypot(center.x,center.z)<.5?Math.PI/2:inward);
   if(frame.pixels<=8)for(const offset of [-Math.PI/3,Math.PI/3,-2*Math.PI/3,2*Math.PI/3]){
    const candidate=capture(inward+offset);
    if(candidate.pixels>frame.pixels)frame=candidate;
   }
   renderer.dispose();
   return {...frame,visible,bounds:[...box.min.toArray(),...box.max.toArray()],base};
  },{name,kind});
  writeFileSync(join(reviewDir,`${kind}.png`),Buffer.from(result.image.split(',')[1],'base64'));delete result.image;
  captures.push({kind,name,pixels:result.pixels,bounds:result.bounds,view:result.view});
  console.log(`${kind}: ${result.pixels} visible pixels`);assert.ok(result.visible&&result.pixels>100,`${kind} must contribute visible pixels in its real room`);
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
  if(kind==='wicklings')assert.ok(result.bounds[1]>=result.base,'wickling bodies stay above their wax beds');
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
  if(kind==='newts'){
   await page.evaluate(()=>{
    window.__newtEvents=[];window.__bus.on('newtsScurried',event=>window.__newtEvents.push(event));
    const s=window.__run.getState();s.resume();window.__bus.emit('sprinted',{roomId:s.currentRoomId,x:0,z:0,surface:'metal'});
   });
   await page.waitForFunction(()=>window.__newts?.retreat>.65);
   const reaction=await page.evaluate(()=>({probe:window.__newts,events:window.__newtEvents}));
   assert.equal(reaction.events.length,1,'the colony announces one shared retreat response');
   assert.ok(reaction.probe.towardSecret&&reaction.events[0].towardSecret,'the secret-host fixture sends the colony toward its cracked wall');
   const before=await page.evaluate(()=>{window.__run.getState().pause();return window.__newts.retreat;});
   await page.waitForTimeout(300);
   assert.equal(await page.evaluate(()=>window.__newts.retreat),before,'paused kiln newts freeze in their retreat');
  }
  if(kind==='brinecrabs'){
   await page.evaluate(()=>{
    window.__brineCrabEvents=[];window.__bus.on('brineCrabsScuttled',event=>window.__brineCrabEvents.push(event));
    const p=window.__brineCrabs.poses[0],s=window.__run.getState();
    window.__bus.emit('teleport',{position:[p.x,1.5,p.z]});
    window.__run.setState({glim:90});s.resume();
   });
   await page.waitForFunction(()=>window.__brineCrabs?.retreat>.65);
   const reaction=await page.evaluate(()=>({probe:window.__brineCrabs,events:window.__brineCrabEvents}));
   assert.equal(reaction.events.length,1,'the salt-shelf colony announces one shared scuttle response');
   assert.ok(reaction.probe.towardSecret&&reaction.events[0].towardSecret,'the secret-host fixture sends brine crabs toward its cracked wall');
   const before=await page.evaluate(()=>{window.__run.getState().pause();return window.__brineCrabs.retreat;});
   await page.waitForTimeout(300);
   assert.equal(await page.evaluate(()=>window.__brineCrabs.retreat),before,'paused brine crabs freeze in their retreat');
  }
  if(kind==='copperbacks'){
   await page.evaluate(()=>{
    window.__copperbackEvents=[];window.__bus.on('copperbacksFolded',event=>window.__copperbackEvents.push(event));
    const s=window.__run.getState();s.resume();window.__bus.emit('sprinted',{roomId:s.currentRoomId,x:0,z:0,surface:'metal'});
   });
   await page.waitForFunction(()=>window.__copperbacks?.fold>.65);
   const reaction=await page.evaluate(()=>({probe:window.__copperbacks,events:window.__copperbackEvents}));
   assert.equal(reaction.events.length,1,'the condenser colony announces one shared fold response');
   assert.ok(reaction.probe.towardSecret&&reaction.events[0].towardSecret,'the secret-host fixture aligns copperbacks with its cracked-wall leak');
   const before=await page.evaluate(()=>{window.__run.getState().pause();return window.__copperbacks.fold;});
   await page.waitForTimeout(300);
   assert.equal(await page.evaluate(()=>window.__copperbacks.fold),before,'paused copperbacks freeze their shell fold');
  }
  if(kind==='wicklings'){
   await page.evaluate(()=>{
    window.__wicklingEvents=[];window.__bus.on('wicklingsSnuffed',event=>window.__wicklingEvents.push(event));
    const s=window.__run.getState();s.resume();window.__bus.emit('sprinted',{roomId:s.currentRoomId,x:0,z:0,surface:'stone'});
   });
   await page.waitForFunction(()=>window.__wicklings?.snuff>.65);
   const reaction=await page.evaluate(()=>({probe:window.__wicklings,events:window.__wicklingEvents}));
   assert.equal(reaction.events.length,1,'the chantry colony announces one shared snuff response');
   assert.ok(reaction.probe.towardSecret&&reaction.events[0].towardSecret,'the secret-host fixture aligns wicklings with its cracked-wall draft');
   const before=await page.evaluate(()=>{window.__run.getState().pause();return window.__wicklings.snuff;});
   await page.waitForTimeout(300);
   assert.equal(await page.evaluate(()=>window.__wicklings.snuff),before,'paused wicklings freeze while hidden in wax');
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
 assert.deepEqual(errors,[]);
 const cards=captures.map(({kind,name,pixels})=>`<article><a href="${kind}.png"><img src="${kind}.png" alt="${kind} in its native room"></a><div><strong>${kind}</strong><span>${name} · ${pixels.toLocaleString()} changed pixels</span></div></article>`).join('');
 const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gem Dungeon · Creature Review</title>
<style>body{margin:0;padding:24px;background:#0a0c12;color:#e4d3b4;font:13px/1.5 system-ui,sans-serif}h1{margin:0;font-size:24px}p{color:#b8b2a8}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:16px;margin-top:20px}article{background:#171512;border:1px solid #50453a;border-radius:8px;overflow:hidden}img{display:block;width:100%;aspect-ratio:4/3;object-fit:contain;background:#000}article div{display:flex;justify-content:space-between;gap:8px;padding:10px}span{color:#b8b2a8;font-size:11px}</style>
<h1>Gem Dungeon · Creature Review</h1><p>${captures.length} live creature states in generated rooms. Click a frame for the full image. Pixel counts measure each creature's visible contribution to its scene.</p><main>${cards}</main></html>\n`;
 writeFileSync(join(reviewDir,'index.html'),html);
 writeFileSync(join(reviewDir,'manifest.json'),JSON.stringify({capturedAt:new Date().toISOString(),creatures:captures},null,2)+'\n');
 const gallery=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
 await gallery.goto(pathToFileURL(join(reviewDir,'index.html')).href);
 await gallery.evaluate(()=>Promise.all([...document.images].map(image=>image.decode())));
 await gallery.screenshot({path:join(reviewDir,'contact.jpg'),type:'jpeg',quality:85,fullPage:true});
 console.log(`Creature review gallery: ${join(reviewDir,'index.html')}`);
 console.log(process.env.CREATURES?`PASS visible creature states: ${process.env.CREATURES}`:`PASS all ${captures.length} creature states contribute visible pixels in native room lighting`);
}finally{await browser.close();}

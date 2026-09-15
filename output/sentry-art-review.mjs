import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage({viewport:{width:800,height:700}});
 await page.goto('http://127.0.0.1:5216/');await page.locator('[data-testid="menu-start"]').click();
 await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
 await page.evaluate(async()=>{
  const {generateDungeon}=await import('/src/game/dungeon/generate.ts');const {sentryFor}=await import('/src/game/sentry/placement.ts');
  for(let seed=1;seed<100;seed++){
   const dungeon=generateDungeon({seed,floor:3});const room=dungeon.rooms.find(r=>sentryFor(r,dungeon.seed,3));if(!room)continue;
   window.__run.setState({dungeon,floor:3,currentRoomId:room.id,transitioning:false,wardenRoomId:null,harrierSlain:true,reaperAwake:false,thiefPhase:'away'});return;
  }
 });await page.waitForFunction(()=>!!window.__sentry);
 await page.waitForTimeout(300);
 if(process.argv[2]==='after'){
  const turn=await page.evaluate(()=>{const post=window.__scene.getObjectByName('sentry-post');const s=window.__sentry;return {x:post.position.x+Math.sin(s.facing)*1.5,z:post.position.z+Math.cos(s.facing)*1.5};});
  await page.evaluate(p=>window.__bus.emit('teleport',{position:[p.x,1.5,p.z]}),turn);
  await page.waitForFunction(()=>window.__sentry.inside&&window.__scene.getObjectByName('sentry-lens').material.color.getHexString()==='ff6a4a');
  await page.evaluate(()=>window.__bus.emit('teleport',{position:[0,1.5,0]}));
  await page.waitForFunction(()=>!window.__sentry.inside&&window.__scene.getObjectByName('sentry-lens').material.color.getHexString()==='8ad4ff');
  console.log('PASS live sentry lens acquisition and release');
 }
 const result=await page.evaluate(async()=>{
  const T=await import('/node_modules/.vite/deps/three.js');let post=window.__scene.getObjectByName('sentry-post');
  if(!post)window.__scene.traverse(o=>{if(o.geometry?.type==='SphereGeometry'&&o.material?.color?.getHexString()==='2a2d34')post=o.parent.parent;});
  if(!post)throw Error('No sentry');window.__run.getState().pause();
  const clone=post.clone(true);clone.position.set(0,0,0);clone.rotation.set(0,0,0);clone.scale.setScalar(1);
  // Reset the rotating head so the lens is presented consistently.
  const head=clone.children.find(c=>c.type==='Group'&&Math.abs(c.position.y-2.3)<.01);head.rotation.set(0,0,0);clone.traverse(o=>o.updateMatrix());
  const scene=new T.Scene();scene.background=new T.Color('#242b2b');scene.add(clone);scene.add(new T.HemisphereLight('#fff4da','#455565',3));
  const light=new T.DirectionalLight('#ffffff',3);light.position.set(3,5,4);scene.add(light);
  const camera=new T.PerspectiveCamera(36,800/700,.01,30);camera.position.set(3,3.2,5);camera.lookAt(0,1.3,0);
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(800,700);renderer.domElement.style.cssText='position:fixed;inset:0;z-index:999999';document.body.append(renderer.domElement);renderer.render(scene,camera);
  const meshes=[];clone.traverse(o=>{if(o.geometry)meshes.push({name:o.name,type:o.geometry.type,triangles:(o.geometry.index?.count??o.geometry.attributes.position.count)/3});});
  return {triangles:renderer.info.render.triangles,meshes};
 });assert.ok(result.meshes.length>=4);await page.screenshot({path:`output/world-review/sentry-${process.argv[2]??'review'}.png`});console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}



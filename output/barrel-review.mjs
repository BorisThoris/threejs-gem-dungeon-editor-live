import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 const page = await browser.newPage({viewport:{width:800,height:700}});
 await page.goto('http://127.0.0.1:5216/');
 await page.locator('[data-testid="menu-start"]').click();
 await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
 await page.evaluate(async()=>{
  const {generateDungeon}=await import('/src/game/dungeon/generate.ts');
  const {placementsFor}=await import('/src/game/rooms/placements.ts');
  for(let seed=1;seed<100;seed++){
   const dungeon=generateDungeon({seed,floor:2});
   const room=dungeon.rooms.find(r=>placementsFor(r,r.seed).some(p=>p.kind==='barrel'));
   if(!room)continue;
   window.__run.setState({dungeon,floor:2,currentRoomId:room.id,transitioning:false,wardenRoomId:null,harrierSlain:true,reaperAwake:false,thiefPhase:'away'});
   return;
  }
 });
 await page.waitForTimeout(1000);
 const result=await page.evaluate(async()=>{
  const T=await import('/node_modules/.vite/deps/three.js');
  let barrel=window.__scene.getObjectByName('handmade-barrel');
  if(!barrel)window.__scene.traverse(o=>{if(!barrel&&o.geometry?.type==='TorusGeometry')barrel=o.parent;});
  if(!barrel)throw Error('Barrel not mounted');
  window.__run.getState().pause();
  const clone=barrel.clone(true);clone.position.set(0,0,0);clone.rotation.set(0,0,0);clone.scale.setScalar(1);
  const scene=new T.Scene();scene.background=new T.Color('#242b2b');scene.add(clone);
  scene.add(new T.HemisphereLight('#fff4da','#455565',3));
  const light=new T.DirectionalLight('#ffffff',3);light.position.set(3,5,4);scene.add(light);
  const camera=new T.PerspectiveCamera(36,800/700,.01,20);camera.position.set(2,1.7,2);camera.lookAt(0,.55,0);
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(800,700);
  renderer.domElement.style.cssText='position:fixed;inset:0;z-index:999999';document.body.append(renderer.domElement);
  renderer.render(scene,camera);
  const meshes=[];clone.traverse(o=>{if(o.geometry)meshes.push({name:o.name,triangles:(o.geometry.index?.count??o.geometry.attributes.position.count)/3,bounds:new T.Box3().setFromObject(o).getSize(new T.Vector3()).toArray()});});
  return {triangles:renderer.info.render.triangles,meshes};
 });
 mkdirSync('output/world-review',{recursive:true});
 await page.screenshot({path:`output/world-review/barrel-${process.argv[2]??'review'}.png`});
 console.log(JSON.stringify(result,null,2));
} finally {await browser.close();}

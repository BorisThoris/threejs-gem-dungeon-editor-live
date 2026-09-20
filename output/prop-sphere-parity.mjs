import assert from 'node:assert/strict';import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5231/');await page.getByTestId('menu-start').click();
 await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
 await page.evaluate(async()=>{
  const {registerTemplate}=await import('/src/game/rooms/templates.ts');
  const props=['potion','statue','urn'].map((kind,i)=>({kind,x:-9+i*7,z:-8,rotation:i*.41,scale:1.3}));
  registerTemplate({id:'sphere-parity',kind:'normal',shape:'square',size:40,props});
  const s=window.__run.getState(),room={...s.dungeon.rooms[0],kind:'normal',shape:'square',size:40,template:'sphere-parity',district:'works',biome:'hewn',waterway:undefined};
  window.__run.setState({dungeon:{...s.dungeon,rooms:[room],vaultId:null,keyRoomId:null},currentRoomId:room.id,paused:true,transitioning:false});window.__sphereProps=props;
 });
 await page.waitForTimeout(1400);
 const result=await page.evaluate(async()=>{
  const T=await import('/node_modules/.vite/deps/three.js');const changes=[];
  window.__scene.traverse(o=>{if(o.geometry?.type==='SphereGeometry'&&o.geometry.parameters.radius===1&&o.geometry.parameters.widthSegments===12&&o.geometry.parameters.heightSegments===10)
   changes.push({o,geometry:o.geometry,scale:o.scale.clone(),old:new T.SphereGeometry(o.scale.x,12,10)});});
  const renderer=new T.WebGLRenderer(),target=new T.WebGLRenderTarget(256,256),camera=new T.PerspectiveCamera(55,1,.05,100);renderer.setRenderTarget(target);
  let max=0,sum=0,n=0;
  for(const p of window.__sphereProps)for(const side of [-1,1]){
   camera.position.set(p.x+side*1.5,1.5,p.z+2.5);camera.lookAt(p.x,p.kind==='statue'?1.6:.55,p.z);const images=[];
   for(const legacy of [false,true]){
    for(const c of changes){c.o.geometry=legacy?c.old:c.geometry;c.o.scale.copy(legacy?new T.Vector3(1,1,1):c.scale);}
    renderer.render(window.__scene,camera);const pixels=new Uint8Array(256*256*4);renderer.readRenderTargetPixels(target,0,0,256,256,pixels);images.push(pixels);
   }
   for(let i=0;i<images[0].length;i++){const d=Math.abs(images[0][i]-images[1][i]);max=Math.max(max,d);sum+=d;n++;}
  }
  return {max,mean:sum/n,meshes:changes.length,unique:new Set(changes.map(c=>c.geometry)).size};
 });
 assert.equal(result.meshes,3);assert.equal(result.unique,1);assert.ok(result.mean<.05,JSON.stringify(result));
 console.log('PASS native sphere sharing across transparent potion, stone statue and clay urn',result);
}finally{await browser.close();}

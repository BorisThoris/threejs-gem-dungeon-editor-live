import assert from 'node:assert/strict';import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5230/');await page.getByTestId('menu-start').click();
 await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
 await page.evaluate(async()=>{
  const {registerTemplate}=await import('/src/game/rooms/templates.ts');
  const props=['bookshelf','chair','chest','table','wall','crate','statue','banner'].map((kind,i)=>({kind,x:(i%4-1.5)*6,z:i<4?-7:7,rotation:i*.31,scale:1.2}));
  registerTemplate({id:'box-parity',kind:'normal',shape:'square',size:40,props});
  const s=window.__run.getState(),room={...s.dungeon.rooms[0],kind:'normal',shape:'square',size:40,template:'box-parity',district:'works',biome:'hewn',waterway:undefined};
  window.__run.setState({dungeon:{...s.dungeon,rooms:[room],vaultId:null,keyRoomId:null},currentRoomId:room.id,paused:true,transitioning:false});
  window.__boxProps=props;
 });
 await page.waitForTimeout(1600);
 const result=await page.evaluate(async()=>{
  const T=await import('/node_modules/.vite/deps/three.js');
  const scene=window.__scene, changes=[],matrix=new T.Matrix4(),originals=new Map();
  scene.traverse(o=>{
   if(o.geometry?.type!=='BoxGeometry'||o.geometry.parameters.width!==1||o.geometry.parameters.height!==1||o.geometry.parameters.depth!==1)return;
   if(o.isInstancedMesh){
    if(o.name!=='shelf-books')return;
    const before=o.instanceMatrix.array.slice(),after=before.slice();
    for(let i=0;i<o.count;i++){matrix.fromArray(before,i*16);matrix.elements[0]/=.22;matrix.elements[5]/=.34;matrix.elements[10]/=.28;matrix.toArray(after,i*16);}
    changes.push({o,geometry:o.geometry,old:new T.BoxGeometry(.22,.34,.28),before,after});
   }else {
    if(o.scale.x===1&&o.scale.y===1&&o.scale.z===1)return;
    const scale=o.scale.clone(),key=scale.toArray().join(',');
    if(!originals.has(key))originals.set(key,new T.BoxGeometry(...scale.toArray()));
    changes.push({o,geometry:o.geometry,old:originals.get(key),scale});
   }
  });
  const renderer=new T.WebGLRenderer(),target=new T.WebGLRenderTarget(256,256),camera=new T.PerspectiveCamera(60,1,.05,100);
  renderer.setRenderTarget(target);let max=0,sum=0,n=0;
  for(const p of window.__boxProps){
   camera.position.set(p.x+2,2.5,p.z+3);camera.lookAt(p.x,1,p.z);
   const pictures=[];
   for(const legacy of [false,true]){
    for(const c of changes){c.o.geometry=legacy?c.old:c.geometry;if(c.scale)c.o.scale.copy(legacy?new T.Vector3(1,1,1):c.scale);else{c.o.instanceMatrix.array.set(legacy?c.after:c.before);c.o.instanceMatrix.needsUpdate=true;}}
    renderer.render(scene,camera);const pixels=new Uint8Array(256*256*4);renderer.readRenderTargetPixels(target,0,0,256,256,pixels);pictures.push(pixels);
   }
   for(let i=0;i<pictures[0].length;i++){const d=Math.abs(pictures[0][i]-pictures[1][i]);max=Math.max(max,d);sum+=d;n++;}
  }
  return {max,mean:sum/n,meshes:changes.length,views:window.__boxProps.length,books:changes.some(c=>c.before)};
 });
 assert.ok(result.meshes>=15&&result.books);assert.ok(result.mean<.05,JSON.stringify(result));
 console.log('PASS native scaled-box versus sized-geometry render parity',result);
}finally{await browser.close();}

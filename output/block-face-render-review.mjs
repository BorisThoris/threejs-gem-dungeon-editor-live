import assert from 'node:assert/strict';import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5217/?editor');
 const result=await page.evaluate(async()=>{
  const T=await import('/node_modules/.vite/deps/three.js');const {blockFaces}=await import('/src/game/rooms/blockFaces.ts');
  const blocks=[{position:[-.5,0,0],size:[1,2,1]},{position:[.5,0,0],size:[1,2,1]},{position:[0,-.5,1.1],size:[.8,.4,1.7],rotationY:.41}];
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d');for(let x=0;x<4;x++)for(let y=0;y<4;y++){ctx.fillStyle=(x+y)%2?'#ba6331':'#416b83';ctx.fillRect(x*8,y*8,8,8);}const map=new T.CanvasTexture(canvas);map.magFilter=T.NearestFilter;map.minFilter=T.NearestFilter;
  const material=new T.MeshStandardMaterial({map,roughness:.9});const old=new T.InstancedMesh(new T.BoxGeometry(1,1,1),material,blocks.length);const m=new T.Matrix4(),v=new T.Vector3();blocks.forEach((b,i)=>old.setMatrixAt(i,m.makeRotationY(b.rotationY??0).scale(v.set(...b.size)).setPosition(...b.position)));
  const faces=blockFaces(blocks),next=new T.InstancedMesh(new T.PlaneGeometry(1,1),material,faces.length),u=new T.Vector3(),n=new T.Vector3();faces.forEach((f,i)=>next.setMatrixAt(i,m.makeBasis(u.set(...f.u),v.set(...f.v),n.set(...f.normal)).setPosition(...f.position)));
  const scene=new T.Scene();scene.background=new T.Color('#152021');scene.add(new T.HemisphereLight('#ffffff','#77634f',2));const light=new T.DirectionalLight('#fff0d0',3);light.position.set(3,6,5);scene.add(light);
  const camera=new T.PerspectiveCamera(45,1,.1,30);const renderer=new T.WebGLRenderer();const target=new T.WebGLRenderTarget(256,256);renderer.setRenderTarget(target);
  let sum=0,max=0,changed=0,count=0;
  for(const at of [[4,3,5],[-4,3,-5],[4,-3,-5]]){
   camera.position.set(...at);camera.lookAt(0,0,0);const a=new Uint8Array(256*256*4),b=new Uint8Array(a.length);scene.add(old);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,256,256,a);scene.remove(old);scene.add(next);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,256,256,b);scene.remove(next);
   for(let i=0;i<a.length;i++)if(i%4!==3){const d=Math.abs(a[i]-b[i]);sum+=d;max=Math.max(max,d);if(d>10)changed++;count++;}
  }
  renderer.dispose();target.dispose();return {mean:sum/count,max,changedFraction:changed/count,before:blocks.length*12,after:faces.length*2};
 });assert.ok(result.mean<.5,JSON.stringify(result));assert.ok(result.changedFraction<.005,JSON.stringify(result));assert.ok(result.after<result.before);console.log('PASS textured block faces match cube rendering across three views',result);
}finally{await browser.close();}

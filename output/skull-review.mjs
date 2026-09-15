import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 const page=await browser.newPage({viewport:{width:1200,height:700}});
 await page.goto('http://127.0.0.1:5228/');
 const result=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js');
  const {skullGeometry,skullSocketsGeometry}=await import('/output/skullGeometry.ts');
  const scene=new T.Scene();scene.background=new T.Color('#22252b');
  scene.add(new T.AmbientLight(0xffffff,1.5));const light=new T.DirectionalLight(0xffedce,3);light.position.set(-2,4,3);scene.add(light);
  const bone=new T.MeshStandardMaterial({color:'#bdb39a',roughness:.9}),dark=new T.MeshStandardMaterial({color:'#1a1417'});
  const old=new T.Group();old.position.x=-.38;
  const head=new T.Mesh(new T.SphereGeometry(.2,12,10),bone);head.position.y=.2;old.add(head);
  for(const x of [-.07,.07]){const eye=new T.Mesh(new T.SphereGeometry(.045,8,6),dark);eye.position.set(x,.22,.17);old.add(eye);}scene.add(old);
  const next=new T.Group();next.position.x=.38;next.add(new T.Mesh(skullGeometry(),bone),new T.Mesh(skullSocketsGeometry(),dark));scene.add(next);
  const camera=new T.PerspectiveCamera(35,1200/700,.01,20);camera.position.set(.55,.6,1.8);camera.lookAt(0,.18,0);
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1200,700);renderer.domElement.style.cssText='position:fixed;inset:0;z-index:999999';document.body.append(renderer.domElement);renderer.render(scene,camera);
  const count=g=>g.children.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0);
  return {old:count(old),next:count(next)};
 });
 await page.screenshot({path:'output/world-review/skull-comparison.png'});console.log(result);
}finally{await browser.close();}

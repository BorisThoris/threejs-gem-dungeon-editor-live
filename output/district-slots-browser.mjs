import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 const page=await browser.newPage({viewport:{width:1300,height:850}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5225/');await page.getByTestId('menu-start').click();
 await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
 for(const district of ['gardens','works','tombs']) {
  const result=await page.evaluate(async district=>{
   const {generateDungeon}=await import('/src/game/dungeon/generate.ts');
   const {authoredProps,allTemplates}=await import('/src/game/rooms/templates.ts');
   const {isRoomTemplate}=await import('/src/editor/drafts.ts');
   const {placementsFor}=await import('/src/game/rooms/placements.ts');
   for(let seed=1;seed<1000;seed++){
    const d=generateDungeon({seed,floor:2});
    const r=d.rooms.find(r=>r.template==='hall-round-workroom'&&r.district===district&&r.id!==d.vaultId);
    if(!r)continue;
    const authored=authoredProps(r),actual=placementsFor(r,d.seed);
    window.__run.setState({dungeon:d,floor:2,currentRoomId:r.id,transitioning:false,wardenRoomId:null,wardenAwake:false,harrierSlain:true,reaperAwake:false,thiefPhase:'away',invulnerableUntil:1e9,glim:90});
    window.__bus.emit('teleport',{position:[0,1.5,0]});
    const target=authored[4];window.__bus.emit('lookSet',{yaw:Math.atan2(-target.x,-target.z),pitch:-.15});
    return {seed,room:r.id,kinds:[4,9,13].map(i=>authored[i].kind),
     kept:authored.every(a=>actual.some(p=>a.kind===p.kind&&a.x===p.x&&a.z===p.z)),
     stable:JSON.stringify(authored)===JSON.stringify(authoredProps(r)),
     imports:allTemplates().every(isRoomTemplate)};
   }
   throw Error('No workroom in '+district);
  },district);
  assert.ok(result.kept&&result.stable&&result.imports);
  assert.equal(new Set(result.kinds).size,1);
  const choices={gardens:['urn','barrel'],works:['crate','barrel'],tombs:['urn']};
  assert.ok(choices[district].includes(result.kinds[0]));
  await page.waitForTimeout(1200);await page.screenshot({path:`output/world-review/workroom-${district}.png`});
  console.log('PASS district workroom',district,result);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}

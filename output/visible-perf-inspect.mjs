import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
const page=await browser.newPage();await page.goto('http://127.0.0.1:5231/');await page.locator('[data-testid="menu-start"]').click();await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
await page.evaluate(async()=>{const run=window.__run;run.getState().startRun(4242);await new Promise(r=>setTimeout(r,1200));for(let f=1;f<3;f++){run.setState({transitioning:true,currentRoomId:run.getState().dungeon.endId});run.getState().roomReady(run.getState().dungeon.endId);await new Promise(r=>setTimeout(r,900));}run.setState({transitioning:false,currentRoomId:'room_6'});window.__bus.emit('teleport',{position:[0,1.5,0]});});
await page.waitForTimeout(1500);
console.log(JSON.stringify(await page.evaluate(()=>{const rows=[];window.__scene.traverse(o=>{if(!o.geometry || o.material?.visible===false)return; let ancestor=o; while(ancestor){if(!ancestor.visible)return;ancestor=ancestor.parent;}let parent=o;while(parent&&!parent.name)parent=parent.parent;rows.push({name:parent?.name,type:o.geometry.type,count:o.count??1,triangles:Math.min(o.geometry.drawRange.count,o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1),color:o.material?.color?.getHexString()});});return {perf:window.__perf, room:window.__run.getState().dungeon.rooms.find(r=>r.id==='room_6'),rows:rows.sort((a,b)=>b.triangles-a.triangles).slice(0,25)};}),null,2));
}finally{await browser.close();}





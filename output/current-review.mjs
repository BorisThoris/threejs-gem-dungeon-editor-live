import { chromium } from 'playwright-core';
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
try {
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.goto('http://127.0.0.1:5212/');
await page.locator('[data-testid="menu-start"]').click();
await page.waitForFunction(()=>window.__run?.getState().phase==='playing'&&!window.__run.getState().transitioning);
await page.evaluate(async()=>{
const {generateDungeon}=await import('/src/game/dungeon/generate.ts');
const {DIR_STEP,DIR_YAW}=await import('/src/game/dungeon/types.ts');
for(let seed=1;seed<100;seed++){
const dungeon=generateDungeon({seed,floor:2});
const room=dungeon.rooms.find(r=>r.kind==='normal'&&r.waterway?.upstream&&r.waterway?.downstream&&DIR_STEP[r.waterway.upstream].x!==-DIR_STEP[r.waterway.downstream].x&&DIR_STEP[r.waterway.upstream].z!==-DIR_STEP[r.waterway.downstream].z);
if(!room)continue;
window.__run.setState({dungeon,floor:2,currentRoomId:room.id,transitioning:false,visited:[room.id],waterOpenedAt:null,wardenRoomId:null,wardenAwake:false,harrierSlain:true,reaperAwake:false,thiefPhase:'away',glim:26,invulnerableUntil:1e9});
const axis=DIR_STEP[room.waterway.upstream];
window.__bus.emit('teleport',{position:[axis.x*3,1.5,axis.z*3]});
window.__bus.emit('lookSet',{yaw:DIR_YAW[room.waterway.upstream]+Math.PI,pitch:-0.5});
return;
}
throw Error('No bend');
});
await page.waitForTimeout(1800);
await page.screenshot({path:'output/world-review/channel-current.png'});
} finally {await browser.close();}

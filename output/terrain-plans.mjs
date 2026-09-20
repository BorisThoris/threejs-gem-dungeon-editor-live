import {build} from 'esbuild';import {mkdtempSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';import {chromium} from 'playwright-core';
const bundle=join(mkdtempSync(join(tmpdir(),'terrain-plans-')),'bundle.mjs');
await build({stdin:{contents:`export * from './src/game/rooms/terrainPattern';export * from './src/game/rooms/mergeTerrainBeds';export * from './src/game/rooms/floorSurfacePattern';export * from './src/game/dungeon/generate';`,resolveDir:process.cwd()},define:{'import.meta.env.DEV':'false','import.meta.env':'{}'},bundle:true,platform:'node',format:'esm',outfile:bundle});
const L=await import(pathToFileURL(bundle)),base=L.generateDungeon({seed:72,floor:2}).rooms[0];let panels='',totalTiles=0,totalBeds=0;
for(const [i,biome] of ['mossy','flooded','fungal','hewn','foundry','timber','catacomb','bone','crystal'].entries()){
const room={...base,biome,size:24,shape:'octagon',wings:{},links:{},secret:undefined},data=L.terrainFor(room),beds=L.mergeTerrainBeds(data.deposits);totalTiles+=data.deposits.length;totalBeds+=beds.length;
const rect=(x,z,w,d,color)=>`<rect x="${x-w/2}" y="${z-d/2}" width="${w}" height="${d}" fill="${color}"/>`;
panels+=`<g transform="translate(${i%3*340+170},${Math.floor(i/3)*340+190})"><text x="-140" y="-135" fill="#d0bd90" font-size="16">${data.grammar.name}</text><g transform="scale(10)">${L.floorSurfaceRects(room).map(r=>rect(r.x,r.z,r.width,r.depth,'#292d28')).join('')}${data.paving.map(t=>rect(t.position[0],t.position[2],t.size[0],t.size[2],L.TERRAIN_COLORS[biome][0])).join('')}${beds.map(t=>rect(t.position[0],t.position[2],t.size[0],t.size[2],L.TERRAIN_COLORS[biome][1])).join('')}</g><text x="-140" y="145" fill="#899a86" font-size="12">${biome} · ${data.deposits.length} cells / ${beds.length} bed faces</text></g>`;
}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1020" height="1070" style="font-family:monospace;background:#121711"><text x="30" y="28" fill="#e3d5b5" font-size="20">THE WORKED FLOOR · shared world and atlas terrain</text>${panels}</svg>`;
writeFileSync('output/world-review/terrain-grammar-plans.svg',svg);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{const page=await browser.newPage({viewport:{width:1020,height:1070}});await page.setContent(`<style>body{margin:0}</style>${svg}`);await page.screenshot({path:'output/world-review/terrain-grammar-plans.png'});}finally{await browser.close();}
console.log({totalTiles,totalBeds});

import {readFileSync,writeFileSync} from 'node:fs';
const path='src/game/props/catalog.tsx';let count=0;
const code=readFileSync(path,'utf8').replace(/geometry=\{geo\("box", ([\d., ]+)\)\}/g,(_,dimensions)=>{
 count++;return `scale={[${dimensions}]} geometry={geo("box", 1, 1, 1)}`;
});
if(count!==15)throw Error(`Expected 15 standalone box meshes, found ${count}`);
writeFileSync(path,code);console.log(`Shared ${count} prop box shapes`);

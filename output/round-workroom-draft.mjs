import { build } from 'esbuild';
import { writeFileSync, readFileSync } from 'node:fs';
const p = (kind,x,z,rotation=0) => ({kind,x,z,rotation});
const template = {
 id:'hall-round-workroom',kind:'normal',shape:'circle',size:28,
 props:[
  p('table',-6,-6),p('chair',-6,-4.4),p('chair',-6,-7.6,Math.PI),
  p('barrel',-8.1,-6),p('crate',-9.3,-6),
  p('table',6,6),p('chair',6,4.4,Math.PI),p('chair',6,7.6),
  p('bookshelf',8.1,6,Math.PI/2),p('crate',9.6,6),
  p('urn',-6,7),p('urn',-7.1,7),p('bookshelf',6,-7),p('crate',6,-9)
 ]
};
await build({stdin:{contents:'export * from "./src/game/rooms/validate"',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:'output/template-validator.mjs',logLevel:'error'});
const {templateProblems}=await import('./template-validator.mjs');
const problems=[];
for(let g=0;g<40;g++) problems.push(...templateProblems(template,60,{x:g%7,z:Math.floor(g/7)}));
console.log([...new Set(problems.map(p=>`${p.index}: ${p.reason}`))]);
if(problems.length) process.exitCode=1;
else {
 const path='src/content/templates.json';
 const templates=JSON.parse(readFileSync(path,'utf8'));
 if(!templates.some(t=>t.id===template.id))templates.push(template);
 writeFileSync(path,JSON.stringify(templates,null,1)+'\n');
 console.log('Added validated round workroom');
}



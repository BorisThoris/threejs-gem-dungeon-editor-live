import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 const page = await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5208/?editor');
 await page.getByRole('button',{name:'WORLD',exact:true}).click();
 for(let i=0;i<20 && !await page.locator('[data-testid="atlas-colony"]').count();i++) await page.getByRole('button',{name:'Next habitat',exact:true}).click();
 assert.ok(await page.locator('[data-testid="atlas-colony"]').count());
 assert.equal(await page.locator('[data-testid="atlas-colony"]').first().getAttribute('data-dormant'),'false');
 await page.screenshot({path:'output/world-review/atlas-ecology-flowing.png'});
 await page.getByLabel('Water preview').selectOption('drained');
 assert.equal(await page.locator('[data-testid="atlas-colony"]').first().getAttribute('data-dormant'),'true');
 await page.screenshot({path:'output/world-review/atlas-ecology-drained.png'});
 await page.getByLabel('Show habitats').uncheck();
 assert.equal(await page.locator('[data-testid="atlas-colony"]').count(),0);
 assert.equal(await page.locator('[data-testid="atlas-toad"]').count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS atlas ecology: habitat navigation, flowing/drained colony state, overlay visibility and clean browser render');
} finally {await browser.close();}

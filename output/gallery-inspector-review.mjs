import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 const page = await browser.newPage({viewport:{width:1600,height:1200}});
 const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5215/?editor');
 await page.getByRole('button',{name:'WORLD',exact:true}).click();
 await page.getByRole('button',{name:'Next gallery',exact:true}).click();
 const section=page.getByRole('region',{name:'Gallery elevation'});
 await section.waitFor();
 assert.ok(await page.locator('[data-testid="atlas-passage-lamp"]').count());
 assert.ok(await page.locator('[data-testid="gallery-section-lamp"]').count());
 await page.getByLabel('Show passage lamps').uncheck();
 assert.equal(await page.locator('[data-testid="atlas-passage-lamp"]').count(),0);
 await page.getByLabel('Show passage lamps').check();
 const slider=page.getByRole('slider',{name:'Distance into gallery'});
 const readout=page.getByTestId('gallery-inspection-readout');
 await slider.fill('0'); assert.match(await readout.innerText(),/0.0 m from mouth · floor \+0.00 m/);
 const max=await slider.getAttribute('max'); await slider.fill(max);
 assert.match(await readout.innerText(),/floor \+(0.80|1.20) m/);
 assert.match(await readout.innerText(),/(4.20|3.80) m to ceiling/);
 await slider.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
 assert.match(await readout.innerText(),/0.1 m from mouth/);
 await slider.fill('2');
 await section.scrollIntoViewIfNeeded();
 await page.screenshot({path:'output/world-review/atlas-gallery-section.png'});
 const directions=await page.getByLabel('Gallery direction').locator('option').evaluateAll(options=>options.map(o=>o.value));
 for(const dir of directions){await page.getByLabel('Gallery direction').selectOption(dir);await page.getByLabel(dir+' gallery side elevation').waitFor();}
 for(let i=0;i<20&&!await page.locator('[data-testid="atlas-channel-direction"]').count();i++) await page.getByRole('button',{name:'Next habitat',exact:true}).click();
 assert.ok(await page.locator('[data-testid="atlas-channel-direction"]').count());
 await page.getByLabel('Water preview').selectOption('drained');
 assert.equal(await page.locator('[data-testid="atlas-channel-direction"]').first().getAttribute('stroke-dasharray'),'2 3');
 await page.getByLabel('Water preview').selectOption('flowing');
 assert.equal(await page.locator('[data-testid="atlas-channel-direction"]').first().getAttribute('stroke-dasharray'),null);
 await page.getByRole('button',{name:'Next seed',exact:true}).click();
 await page.getByLabel('World depth').selectOption('3');
 await page.getByRole('button',{name:'Next gallery',exact:true}).click();
 await section.waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS gallery navigation, physical side section, lamp overlay, flowing/dry arrows, seed and depth changes');
}finally{await browser.close();}


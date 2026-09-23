import assert from "node:assert/strict";
import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH,
  args: ["--autoplay-policy=no-user-gesture-required"] });
try {
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.addInitScript(() => {
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function(destination, ...rest) {
      const result = connect.call(this, destination, ...rest);
      if (destination === destination.context?.destination) {
        window.waterAnalyser ??= destination.context.createAnalyser();
        connect.call(this, window.waterAnalyser);
      }
      return result;
    };
  });
  await page.goto(`http://127.0.0.1:${process.env.PORT ?? 5222}/`);
  await page.locator('[data-testid="menu-start"]').click();
  await page.waitForFunction(() => window.__ambience && window.waterAnalyser && window.__blockLighting);
  const result = await page.evaluate(async () => {
    window.__run.setState({ paused: true, currentRoomId: null });
    window.__music.stop(); window.__ambience.stopCurrent(); window.__ambience.setAir("still");
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const sample = async () => {
      const data = new Float32Array(window.waterAnalyser.fftSize);
      let peak = 0;
      for (let i = 0; i < 80; i++) {
        window.waterAnalyser.getFloatTimeDomainData(data);
        for (const value of data) peak = Math.max(peak, Math.abs(value));
        await wait(15);
      }
      return peak;
    };
    await wait(1600);
    const baseline = await sample();
    window.__ambience.setCurrent(1, 0.2); await wait(150);
    const flowing = await sample();
    window.__ambience.setCurrent(0); await wait(600);
    const drained = await sample(), level = window.__ambience.currentLevel();
    window.__sfx.setMuted(true); window.__ambience.setCurrent(1); await wait(200);
    const muted = await sample();
    return { baseline, flowing, drained, muted, level };
  });
  assert.ok(result.flowing > result.baseline * 1.3, JSON.stringify(result));
  assert.ok(result.drained < result.flowing * 0.85 && result.level === 0, "draining stops the current");
  assert.ok(result.muted < 0.001, "master mute includes water");
  assert.deepEqual(errors, []);
  console.log("PASS live water audibility, drainage, mute and runtime", result);
} finally { await browser.close(); }

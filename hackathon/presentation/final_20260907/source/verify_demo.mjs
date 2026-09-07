import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const ROOT=process.env.PROJECT_ROOT??path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const htmlPath=process.env.DEMO_HTML??path.join(ROOT,'output/final/demo.html');
const out=process.env.DEMO_QA_DIR??path.join(ROOT,'presentation/final_20260907/build/demo-qa');
await fs.mkdir(out,{recursive:true});
const html=await fs.readFile(htmlPath,'utf8');
assert(!html.includes('{{'));assert(!/<script[^>]+src=/i.test(html));assert(!/<link[^>]+href=/i.test(html));
// Use Playwright's installed browser unless an explicit isolated executable is supplied.
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
try{
 const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
 const requests=[];const errors=[];await context.route(/^https?:/,route=>{requests.push(route.request().url());return route.abort();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.clock.install();
 await page.goto(pathToFileURL(htmlPath).href);await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('#progress').textContent(),'Шаг 1 из 6');assert(await page.locator('#prev').isDisabled());
 await page.screenshot({path:path.join(out,'step-01.png'),fullPage:true});
 for(let i=2;i<=6;i++){await page.locator('#next').click();assert.equal(await page.locator('#progress').textContent(),`Шаг ${i} из 6`);await page.screenshot({path:path.join(out,`step-${String(i).padStart(2,'0')}.png`),fullPage:true});}
 assert(await page.locator('#next').isDisabled());assert.equal(await page.locator('#play').textContent(),'Воспроизвести снова');
 await page.locator('#restart').click();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#progress').textContent(),'Шаг 2 из 6');await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('#progress').textContent(),'Шаг 1 из 6');
 await page.keyboard.press('Space');assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'true');await page.keyboard.press('Space');assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
 await page.locator('#play').click();await page.clock.runFor(40100);assert.equal(await page.locator('#progress').textContent(),'Шаг 6 из 6');assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
 await page.locator('#play').click();assert.equal(await page.locator('#progress').textContent(),'Шаг 1 из 6');await page.locator('#play').click();
 const desktop=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));assert(desktop.document<=desktop.viewport);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});const mobile=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));assert(mobile.document<=mobile.viewport);
 assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'qa.json'),JSON.stringify({status:'PASS',browser:'isolated headless Chromium',source:JSON.parse(html.match(/<script id="trace-data" type="application\/json">([\s\S]*?)<\/script>/)[1]).source,steps:6,keyboard:true,play_pause_restart:true,autoplay_stops:true,external_requests:requests,script_errors:errors,desktop,mobile},null,2));
 console.log('PASS: six steps, keyboard, playback, automatic stop, restart, no external requests, no JS errors; desktop/mobile screenshots saved.');
}finally{await browser.close();}

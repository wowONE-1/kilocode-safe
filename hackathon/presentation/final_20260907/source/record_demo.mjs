import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const ROOT=process.env.PROJECT_ROOT??path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const html=path.join(ROOT,'output/final/demo.html');
const out=path.join(ROOT,'output/final/demo.webm');
const qa=path.join(ROOT,'presentation/final_20260907/build/demo-video');
await fs.mkdir(qa,{recursive:true});
// Use Playwright's installed browser unless an explicit isolated executable is supplied.
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
try{
 const ctx=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1,recordVideo:{dir:qa,size:{width:1440,height:960}}});
 const requests=[],errors=[];
 await ctx.route(/^https?:/,route=>{requests.push(route.request().url());return route.abort();});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(pathToFileURL(html).href);
 await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('#progress').textContent(),'Шаг 1 из 6');
 await page.screenshot({path:path.join(qa,'first.png')});
 await page.locator('#play').click();
 await page.waitForTimeout(47500);
 assert.equal(await page.locator('#progress').textContent(),'Шаг 6 из 6');
 assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');
 await page.screenshot({path:path.join(qa,'last.png')});
 assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
 const v=page.video();await ctx.close();await v.saveAs(out);
 const bytes=await fs.readFile(out);
 await fs.writeFile(path.join(qa,'qa.json'),JSON.stringify({status:'PASS',kind:'screen recording of offline saved-trace replay; not live model or GUI execution',width:1440,height:960,playback_wait_ms:47500,final_step:6,source_html_sha256:createHash('sha256').update(await fs.readFile(html)).digest('hex'),video_sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,external_requests:requests,script_errors:errors},null,2));
 console.log(JSON.stringify({path:out,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}));
} finally{await browser.close();}

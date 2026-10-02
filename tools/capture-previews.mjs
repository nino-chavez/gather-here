import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const base = process.env.BASE_URL || 'http://127.0.0.1:8796';
const browser = await chromium.launch();
await mkdir('site/assets', {recursive:true});
for (const item of [
 {name:'guest',width:780,height:1040,url:'/prototype/concepts/combined.html?role=guest&scenario=S2&state=ready&section=weekend'},
 {name:'organizer',width:1200,height:850,url:'/prototype/concepts/combined.html?role=organizer&scenario=S2&state=ready&section=replies'},
 {name:'style',width:1200,height:850,url:'/prototype/concepts/site-style.html'}
]) {
 const page=await browser.newPage({viewport:{width:item.width,height:item.height}});
 await page.goto(base+item.url);await page.locator('h1').waitFor();await page.evaluate(()=>document.fonts.ready);
 // Capture the product; the walkthrough separately supplies the public-demo notice.
 await page.addStyleTag({content:'.public-demo,.review-bar,.demo-note{display:none!important}'});
 await page.screenshot({path:`site/assets/${item.name}.png`});await page.close();
}
await browser.close();

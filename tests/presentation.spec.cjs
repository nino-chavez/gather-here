const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const evidence = path.resolve(__dirname, '../.local-evidence');
fs.mkdirSync(evidence, {recursive:true});
for (const width of [1440, 390]) {
  test(`walkthrough and setup at ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:1000});
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/');
    await expect(page.getByRole('heading', {level:1})).toHaveText('Your wedding.Your people.A clearer plan.');
    await expect(page.locator('img').first()).toHaveJSProperty('naturalWidth',780);
    const overflow = () => page.evaluate(()=>document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(await overflow()).toBe(false);
    // Negative control: prove this check detects horizontal overflow.
    await page.evaluate(()=>{const e=document.createElement('div');e.id='overflow-control';e.style.cssText='position:absolute;left:0;top:0;width:200vw;height:1px';document.body.append(e)});
    expect(await overflow()).toBe(true);
    await page.locator('#overflow-control').evaluate(e=>e.remove());
    await page.screenshot({path:path.join(evidence,`walkthrough-${width}-top.png`)});
    for (const id of ['product','try','plan']) {
      await page.locator('#'+id).scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(evidence,`walkthrough-${width}-${id}.png`)});
    }
    await page.getByRole('tab',{name:'See it as a guest'}).click();
    await expect(page.locator('#panel-guest')).toBeVisible();
    await page.getByRole('tab',{name:'See it as a guest'}).press('ArrowRight');
    await expect(page.getByRole('tab',{name:'Make it yours'})).toBeFocused();
    await expect(page.locator('#panel-style')).toBeVisible();
    await page.goto('/setup.html');
    await expect(page.getByRole('heading',{level:1})).toContainText('Your own accounts.');
    expect(await overflow()).toBe(false);
    await page.screenshot({path:path.join(evidence,`setup-${width}-top.png`)});
    for(const id of ['services','agent']){
      await page.locator('#'+id).scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(evidence,`setup-${width}-${id}.png`)});
    }
    await page.context().grantPermissions(['clipboard-read','clipboard-write']);
    await page.getByRole('button',{name:'Copy agent brief'}).click();
    await expect(page.getByRole('status')).toContainText('Copied.');
    expect(await page.evaluate(()=>navigator.clipboard.readText())).toContain('docs/AGENT-START.md');
    expect(errors).toEqual([]);
  });
}
test('public navigation and asset paths resolve',async({page,request})=>{
 const paths = new Set();
 for(const url of ['/', '/setup.html', '/prototype/concepts/combined.html?role=organizer&scenario=S2', '/prototype/concepts/site-style.html']) {
  await page.goto(url);
  for(const value of await page.locator('a[href],img[src],link[href],script[src],iframe[src]').evaluateAll(nodes=>nodes.map(n=>n.href||n.src))) {
   const u=new URL(value);if(u.origin===new URL(page.url()).origin) paths.add(u.pathname);
  }
 }
 for(const url of paths) expect((await request.get(url)).status(),url).toBe(200);
 await page.goto('/prototype/concepts/combined.html?role=guest&scenario=S2&section=weekend');
 await page.getByRole('link',{name:'Back to walkthrough'}).click();
 await expect(page).toHaveURL(/\/(?:index\.html)?#try$/);
});

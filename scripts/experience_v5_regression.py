"""Torus Experience V5 browser regression: geometry, shell and partner form.

All fixtures use the app's fictional sample data. No customer records or live
Supabase credentials are loaded. Run: python scripts/experience_v5_regression.py
"""
import asyncio
import functools
import http.server
import threading
from pathlib import Path

from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parent.parent
APP=ROOT/'dashboard'
SCREENSHOTS=ROOT/'docs'/'screenshots'
SCREENSHOTS.mkdir(parents=True,exist_ok=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

async def main():
    srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(APP)))
    threading.Thread(target=srv.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{srv.server_address[1]}/index.html'
    errors=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch()
        for width in (320,375,768,1024,1440):
            context=await browser.new_context(viewport={'width':width,'height':900},accept_downloads=True)
            page=await context.new_page()
            page.on('pageerror',lambda exc:errors.append(str(exc)))
            await page.route('**/config.js',lambda req:req.fulfill(body='window.TORUS_CONFIG=null;',content_type='application/javascript'))
            for appearance in ('light','dark'):
                await page.goto(base+'#today')
                await page.evaluate('(value)=>document.documentElement.dataset.appearance=value',appearance)
                await page.wait_for_timeout(120)
                results=await page.evaluate("""() => {
                  const app=document.querySelector('.app');
                  const focus=document.querySelector('.today-focus');
                  const calendar=document.querySelector('.today-mini-calendar');
                  const side=document.querySelector('.side');
                  const style=getComputedStyle(focus);
                  return {
                    appTop:app.getBoundingClientRect().top,
                    bodyText:[...document.body.childNodes].filter(x=>x.nodeType===3).map(x=>x.textContent.trim()).filter(Boolean),
                    width:document.documentElement.scrollWidth,
                    sideHeight:side.getBoundingClientRect().height,
                    focusRepeat:style.backgroundRepeat,
                    focusImage:style.backgroundImage,
                    focusHeight:focus.getBoundingClientRect().height,
                    calendarHeight:calendar.getBoundingClientRect().height
                  };
                }""")
                assert abs(results['appTop'])<1,(width,appearance,'top gap',results['appTop'])
                assert not results['bodyText'],(width,appearance,'stray body text',results['bodyText'])
                assert results['width']<=width+2,(width,appearance,'overflow',results['width'])
                if 'url(' in results['focusImage']:
                    assert 'no-repeat' in results['focusRepeat'],'repeat geometry'
                if width<=860:
                    assert results['sideHeight']<=90,'mobile navigation covers screen'
                assert results['focusHeight']<520,'Needs attention stretched too tall'
                if width==1440 and appearance=='light':
                    await page.screenshot(path=str(SCREENSHOTS/'v5-today-daylight.png'),animations='disabled')
                if width==1440 and appearance=='dark':
                    await page.screenshot(path=str(SCREENSHOTS/'v5-today-night-grove.png'),animations='disabled')
                # Mini agenda opens on Today without regenerating the torus.
                original=page.url
                await page.locator('[data-mini-day]').first.click()
                assert page.url==original,'mini-calendar navigated away'
                if await page.locator('.today-mini-popover').count()!=1:
                    await page.locator('[data-mini-day]').nth(1).click()
                assert await page.locator('.today-mini-popover').count()==1
                before=await page.locator('.today-focus').evaluate('el=>Math.round(el.getBoundingClientRect().height)')
                await page.locator('[data-mini-day]').nth(2).click()
                after=await page.locator('.today-focus').evaluate('el=>Math.round(el.getBoundingClientRect().height)')
                assert after==before,'left card resized when calendar day opened'
                # Mandala still spins/orbits and has a clean, theme-specific gradient.
                await page.locator('.torus-field__mode').nth(1).click()
                field=page.locator('.torus-field')
                assert await field.get_attribute('data-geometry-mode')=='flower'
                background=await field.evaluate('e=>getComputedStyle(e).backgroundImage')
                assert 'linear-gradient' in background and 'brand-torus22' not in background,'photographic texture persists'
                assert await field.locator('canvas').evaluate('e=>e.width')>100
                assert await page.locator('.torus-field__toolbar').count()==1
                if width==1440:
                    await page.locator('.today-hero').screenshot(path=str(SCREENSHOTS/f'v5-mandala-{appearance}.png'),animations='disabled')
                # Drawer keeps the exact 12 original data fields and submit validation.
                await page.locator('.today-hero [data-act="add-partner"]').click()
                drawer=page.locator('[data-drawer]')
                assert await drawer.is_visible()
                assert await page.locator('.partner-form-section').count()==2
                assert await page.locator('.partner-form [name]').count()==12
                assert await page.locator('.partner-form-submit button.primary').count()==1
                assert await drawer.locator('.drawer-panel').get_attribute('data-panel-type')=='partner'
                if width==1440 and appearance=='dark':
                    await page.screenshot(path=str(SCREENSHOTS/'v5-partner-drawer-night.png'),animations='disabled')
                if width==375 and appearance=='light':
                    await page.screenshot(path=str(SCREENSHOTS/'v5-partner-drawer-mobile.png'),animations='disabled')
                await page.locator('.partner-form button.primary').click()
                assert 'required' in (await page.locator('#err-contact').inner_text()).lower() or (await page.locator('#err-contact').inner_text()).strip()
                await page.locator('.partner-form [name="contact"]').fill('Fictional V5 QA Contact')
                await page.locator('.partner-form [name="org"]').fill('Fictional V5 QA Practice')
                await page.locator('.partner-form button.primary').click()
                assert await drawer.is_hidden(),'partner form failed to save/close'
            print('PASS',width,'top shell, nonrepeating geometry, stable Today sizing, mandala, light+dark, partner drawer and save')
            await context.close()
        await browser.close()
    srv.shutdown()
    assert not errors,'Page JS errors: '+str(errors[:8])
    print('PASS all V5 responsive browser checks; no page errors')

if __name__=='__main__':
    asyncio.run(main())


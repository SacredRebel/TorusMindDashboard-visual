"""Torus dashboard visual regression checks. Run: python scripts/visual_regression.py"""
import asyncio, functools, http.server, os, threading
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent
APP=ROOT/'dashboard';OUTPUT=ROOT/'docs'/'screenshots'
ROUTES=['today','partners','patients','pipeline','events','sources','calendar','setup','partner-P-001','event-E-003']
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
async def main():
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(APP)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    errors=[];base=f'http://127.0.0.1:{server.server_address[1]}/index.html'
    executable=os.environ.get('TORUS_BROWSER_BIN')
    async with async_playwright() as p:
        browser=await p.chromium.launch(**({'executable_path':executable} if executable else {}))
        for width in (1280,375):
            page=await browser.new_page(viewport={'width':width,'height':900},device_scale_factor=1)
            page.on('pageerror',lambda exc: errors.append(f'{width} pageerror: {exc}'))
            await page.route('**/config.js',lambda req:req.fulfill(body='window.TORUS_CONFIG=null;',content_type='application/javascript'))
            await page.route('https://fonts.googleapis.com/**',lambda req:req.fulfill(body='',content_type='text/css'))
            await page.route('https://fonts.gstatic.com/**',lambda req:req.abort())
            for route in ROUTES:
                await page.goto(base+'#'+route,wait_until='domcontentloaded')
                await page.wait_for_timeout(180)
                result=await page.evaluate('''() => ({
                    heading:document.querySelector('[data-title]')?.textContent,
                    scrollWidth:document.documentElement.scrollWidth,
                    motif:getComputedStyle(document.querySelector('.top'),'::after').backgroundImage,
                    logo:document.querySelector('.brand-original')?.naturalWidth,
                    main:!!document.querySelector('[data-view]'),
                    geometry:document.querySelector('.torus-field canvas')?.width || 0
                })''')
                if not result['heading'] or not result['main']:errors.append(f'{width} {route}: missing page')
                if result['scrollWidth']>width+2:errors.append(f'{width} {route}: horizontal overflow {result["scrollWidth"]}')
                if result['logo']!=500:errors.append(f'{width} {route}: brand wordmark not loaded')
                if not result['motif'].startswith('url('):errors.append(f'{width} {route}: missing geometry header')
                if route=='today':
                    if result['geometry']<100:errors.append(f'{width} {route}: canvas unavailable')
                    if await page.locator('.torus-field__mode').count()!=3:errors.append(f'{width}: missing geometry modes')
                    if await page.locator('.today-mini-calendar .today-day').count()!=42:errors.append(f'{width}: incomplete calendar')
                    if await page.locator('.torus-field video').count():errors.append(f'{width}: original film should be absent')
                    if 'Torus team' not in await page.locator('.welcome h2').inner_text():errors.append(f'{width}: greeting not team-neutral')
                    if await page.locator('[data-nav] a').nth(3).get_attribute('href')!='#calendar':errors.append(f'{width}: calendar navigation out of order')
                    before=await page.locator('.today-mini-controls b').inner_text()
                    await page.get_by_role('button',name='Next month').click()
                    after=await page.locator('.today-mini-controls b').inner_text()
                    if before==after:errors.append(f'{width}: month navigation did not change')
                    await page.get_by_role('button',name='Back to current month').click()
                    await page.locator('.torus-field__mode').nth(1).click()
                    if await page.locator('.torus-field').get_attribute('data-geometry-mode')!='flower':
                        errors.append(f'{width}: mandala interaction failed')
                    await page.locator('.torus-field__mode').nth(0).click()
                    await page.evaluate('window.TorusVisuals?.setPlaying(false); window.scrollTo(0,0)')
                if route in ('today','partners','pipeline','calendar','setup'):
                    await page.evaluate('window.scrollTo(0,0)')
                    await page.screenshot(path=str(OUTPUT/f'visual-{route}-{width}.jpg'),
                                          type='jpeg',quality=76,animations='disabled',timeout=20000)
                print('PASS',width,route,result['heading'])
            await page.close()
        await browser.close()
    server.shutdown()
    if errors:
        print('\n'.join('FAIL '+e for e in errors))
        raise SystemExit(f'FAIL: {len(errors)} regression issues')
    print(f'PASS: {len(ROUTES)*2} responsive routes, interactive torus, no page errors')
if __name__=='__main__':
    asyncio.run(main())

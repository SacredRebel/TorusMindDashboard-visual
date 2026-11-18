"""V7 visual and workflow regression. Fictional demo data only."""
import sys,asyncio,threading,functools,http.server
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent
SHOTS=ROOT/'docs/screenshots'
SHOTS.mkdir(exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
async def main():
 width=int(sys.argv[1]) if len(sys.argv)>1 else 1440
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dashboard')))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 base=f'http://127.0.0.1:{server.server_address[1]}/index.html'
 async with async_playwright() as p:
  browser=await p.chromium.launch()
  page=await browser.new_page(viewport={'width':width,'height':900},accept_downloads=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.route('**/config.js',lambda req:req.fulfill(body='window.TORUS_CONFIG=null;',content_type='application/javascript'))
  for theme in ('light','dark'):
   await page.goto(base+'#calendar')
   await page.evaluate('(x)=>document.documentElement.dataset.appearance=x',theme)
   await page.wait_for_timeout(280)
   key=await page.locator('.cal-chip.event').first.get_attribute('data-cal-date')
   await page.locator('.cal-date[data-cal-day="'+key+'"]').click()
   await page.locator('.cal-appointment-trigger').first.click()
   assert await page.locator('.cal-record-summary').count()==1
   assert page.url.endswith('#calendar')
   assert await page.locator('.cal-record-link').count()>=1
   if theme=='dark':
    await page.wait_for_timeout(250)
    ring=await page.locator('.cal-cell.is-selected').first.evaluate('el=>getComputedStyle(el).boxShadow')
    assert 'inset' in ring,ring  # V9: selected day = warm gold ring
   if width==1440:
    await page.screenshot(path=str(SHOTS/f'v7-calendar-{theme}.png'),animations='disabled',timeout=12000)
   await page.locator('.cal-appointment-trigger[aria-expanded="true"]').click()
   assert await page.locator('.cal-record-summary').count()==0
   await page.goto(base+'#events')
   if await page.locator('.event-row-toggle').first.get_attribute('aria-expanded')=='true':
    await page.locator('.event-row-toggle').first.click()
   await page.locator('.event-row-toggle').first.click()
   assert await page.locator('.event-detail-row:not([hidden])').count()==1
   assert page.url.endswith('#events')
   await page.locator('.event-detail-row:not([hidden]) [data-act="duplicate-event"]').click()
   assert await page.locator('[data-form="event"]').count()==1
   await page.locator('[data-act="close"]').last.click()
   if width==1440:
    await page.screenshot(path=str(SHOTS/f'v7-events-{theme}.png'),animations='disabled',timeout=12000)
   await page.goto(base+'#pipeline')
   assert await page.locator('.pipeline-overview>div').count()==4
   await page.locator('[data-pipe-filter="activity"]').select_option('A3')
   await page.locator('[data-pipeline-clear]').click()
   await page.locator('[data-pipe-all]').check()
   await page.locator('[data-pipe-bulk-owner]').select_option('Shari')
   assert await page.locator('.pipeline-bulk span').inner_text()=='0 selected'
   await page.locator('.pipeline-tile [data-act="log"]').first.click()
   assert await page.locator('[data-form="touch"]').count()==1
   await page.locator('[data-act="close"]').last.click()
   if width==1440:
    await page.screenshot(path=str(SHOTS/f'v7-pipeline-{theme}.png'),animations='disabled',timeout=12000)
   await page.goto(base+'#setup')
   assert await page.locator('.settings-page-intro .brand-header-triangle').count()==1
   for c in await page.locator('.settings-column>.settings-card').all():
    bg=await c.evaluate('e=>getComputedStyle(e).backgroundImage')
    assert 'geometry-' not in bg,bg
   if width==1440:
    await page.screenshot(path=str(SHOTS/f'v7-settings-{theme}.png'),animations='disabled',timeout=12000)
   for route in ('partners','patients','sources'):
    await page.goto(base+'#'+route)
    assert await page.locator('.top .brand-header-triangle').count()==1
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),width
   assert not errors,errors[:5]
   print('PASS',width,theme,'calendar, events, pipeline, settings, artwork, no JS errors',flush=True)
  await browser.close()
 server.shutdown()
if __name__=='__main__':asyncio.run(main())


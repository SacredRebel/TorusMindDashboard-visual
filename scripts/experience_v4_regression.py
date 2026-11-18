"""V4 Torus UX tests. Fictional data only; no production Supabase keys."""
import asyncio,functools,http.server,threading
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent
APP=ROOT/'dashboard'
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
async def main():
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(APP)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_address[1]}/index.html'
    errors=[]
    async with async_playwright() as p:
      browser=await p.chromium.launch()
      for width in (1440,1024,375):
        context=await browser.new_context(viewport={'width':width,'height':900},accept_downloads=True)
        page=await context.new_page()
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.route('**/config.js',lambda r:r.fulfill(body='window.TORUS_CONFIG=null;',content_type='application/javascript'))
        await page.goto(base+'#today')
        await page.wait_for_timeout(160)
        assert await page.locator('.today-hero h1').count()==1,'Today hero title not present'
        assert await page.locator('.today-hero .torus-field canvas').count()==1,'Torus signature missing'
        assert await page.locator('.today-hero [data-theme-switch]').count()==1,'Theme toggle not on hero'
        assert await page.locator('.top').evaluate("e=>getComputedStyle(e).display")=='none','Today has duplicate top header'
        before=page.url
        await page.locator('[data-mini-day]').first.click()
        assert page.url==before,'Today day selection navigated away'
        assert await page.locator('.today-mini-popover').count()==1,'Inline mini agenda missing'
        assert await page.locator('.today-mini-popover h3').count()==1
        assert await page.locator('.today-hero .torus-field canvas').count()==1
        await page.locator('[data-mini-close]').click()
        assert await page.locator('.today-mini-popover').count()==0
        await page.locator('.torus-field__mode').nth(1).click()
        assert await page.locator('.torus-field').get_attribute('data-geometry-mode')=='flower'
        await page.wait_for_timeout(120)
        assert await page.locator('.torus-field canvas').evaluate('e=>e.width')>100
        await page.goto(base+'#calendar')
        await page.wait_for_timeout(100)
        assert await page.locator('.top').evaluate("e=>getComputedStyle(e).display")=='none','Calendar duplicate top header'
        assert await page.locator('.cal-header h1').count()==1
        assert await page.locator('.cal-header .brand-header-media').count()==1
        assert await page.locator('.cal-header [data-theme-switch]').count()==1
        assert await page.locator('.cal-cell').count()==42
        # The whole cell is interactive. Choose a cell by clicking its lower blank region.
        target=page.locator('.cal-cell[data-cal-cell="2026-11-07"]')
        await target.click(position={'x':12,'y':min(70,await target.evaluate('e=>e.clientHeight')-5)})
        assert await page.locator('.cal-day-panel h3').inner_text()=='Saturday, November 7','Whole-cell selection failed'
        assert await page.locator('.cal-cell.is-selected').count()==1
        # Event chips remain links to the underlying records.
        if width>700:
          event=page.locator('.cal-chip.event').first
          assert await event.count()>0
          await event.click()
          assert page.url.endswith('#calendar') and await page.locator('.cal-record-summary').count()==1,'Appointment should open in day summary'
        await page.goto(base+'#pipeline')
        await page.wait_for_timeout(100)
        expected=1 if width<760 else 2 if width<1190 else 3
        assert await page.locator('.pipeline-board .col').count()==expected,'Bad stage count for viewport'
        assert await page.locator('.pipeline-stage-tab').count()==6,'Missing stage navigation'
        assert await page.locator('.pipeline-board').evaluate('e=>e.scrollWidth<=e.clientWidth+2'),'Pipeline clipped horizontally'
        await page.locator('[data-pipeline-page="1"]').click()
        assert await page.locator('.pipeline-board .col').count()==expected
        assert (await page.locator('.pipeline-controls small').inner_text()).startswith('Stages '+str(expected+1))
        # Each card stays inside its own stage, even for long status chips.
        bounds=await page.evaluate("""() => [...document.querySelectorAll('.pipeline-board .tile')].flatMap(t=>[...t.querySelectorAll('.chip,.field')].map(el=>({overflow:el.getBoundingClientRect().right-t.getBoundingClientRect().right}))).filter(x=>x.overflow>2)""")
        assert not bounds,bounds
        await page.goto(base+'#sources')
        revenue=await page.locator('.roi-revenue').bounding_box()
        score=await page.locator('.roi-scorecard').bounding_box()
        assert revenue and score
        if width>=1190:assert revenue['height']<score['height']+80, 'ROI chart stretched by scorecard'
        assert await page.locator('.roi-summary>div').count()==3
        assert await page.locator('.roi-more').count()==1
        await page.locator('.roi-more summary').click()
        assert await page.locator('.roi-more').get_attribute('open') is not None
        await page.goto(base+'#setup')
        assert await page.locator('.settings-choice').count()==4
        assert await page.locator('.settings-choice[open]').count()==0
        await page.locator('.settings-choice').first.locator('summary').click()
        assert await page.locator('.settings-choice[open] .settings-tokens span').count()==6
        # Appearance is reachable and keeps correct theme across routes.
        await page.locator('.settings-page-intro [data-theme-switch]').click()
        assert await page.evaluate('document.documentElement.dataset.appearance')=='dark'
        await page.goto(base+'#calendar')
        assert await page.evaluate('document.documentElement.dataset.appearance')=='dark'
        await page.locator('.cal-header [data-theme-switch]').click()
        assert await page.evaluate('document.documentElement.dataset.appearance')=='light'
        # All route-specific triangles exist and use independent imagery.
        for slug in ('partners','patients','pipeline','events','sources','setup'):
          await page.goto(base+'#'+slug)
          art=await page.locator('.top .brand-header-media').count()
          assert art==1,(slug,art)
          path=await page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--header-photo')")
          assert 'brand-torus' in path,(slug,path)
        print('PASS',width,'single headers, inline Today agenda, full-cell calendar, complete pipeline stages, compact ROI, settings groups, geometry, themes, unique header art')
        await context.close()
      await browser.close()
    server.shutdown()
    if errors:raise AssertionError('Browser errors: '+str(errors[:8]))
    print('PASS all V4 interaction tests; no JS page errors')
if __name__=='__main__':asyncio.run(main())


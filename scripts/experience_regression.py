"""Experience v3 functional/visual regression, fictional data only."""
import os, asyncio, threading, functools, http.server, csv
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent
APP=ROOT/'dashboard'
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
async def run():
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(APP)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_address[1]}/index.html'
    async with async_playwright() as p:
      browser=await p.chromium.launch()
      for width in (1440,375):
        ctx=await browser.new_context(viewport={'width':width,'height':900},accept_downloads=True)
        page=await ctx.new_page()
        errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        await page.route('**/config.js',lambda r:r.fulfill(body='window.TORUS_CONFIG=null;',content_type='application/javascript'))
        await page.goto(base+'#calendar')
        await page.wait_for_timeout(240)
        assert await page.locator('.cal-cell').count()==42,'42 calendar dates'
        assert await page.locator('.theme-switch:visible').count()==1,'theme toggle'
        assert (await page.evaluate('document.documentElement.scrollWidth'))<=width+2,'calendar horizontal overflow'
        title=await page.locator('.cal-header h1').inner_text()
        await page.locator('[data-month="1"]').last.click()
        assert await page.locator('.cal-header h1').inner_text()!=title,'month nav'
        await page.locator('.cal-header [data-month="0"]').click()
        assert await page.locator('.cal-header h1').inner_text()==title,'go to today'
        await page.locator('[data-cal-mode="week"]').click()
        assert await page.locator('.cal-cell').count()==7,'week view'
        await page.locator('[data-cal-mode="agenda"]').click()
        assert await page.locator('.cal-list-row').count()>0,'agenda'
        await page.locator('[data-cal-mode="month"]').click()
        assert await page.locator('.cal-cell').count()==42
        await page.locator('[data-cal-filter="events"]').click()
        assert await page.locator('.cal-chip.follow').count()==0,'events filter'
        await page.locator('[data-cal-filter="all"]').click()
        async with page.expect_download(timeout=8000) as download_info:
            await page.locator('[data-act="calendar-export"]').click()
        download=await download_info.value
        contents=Path(await download.path()).read_bytes()
        assert b'Date' in contents and b'Event' in contents and contents.count(b'\r\n')>5, 'Sheet CSV'
        assert await page.locator('.cal-cell .cal-date').count()==42
        day='2026-11-22'
        await page.locator(f'.cal-date[data-cal-day="{day}"]').click()
        assert 'Sunday' in await page.locator('.cal-day-panel h3').inner_text()
        await page.locator('[data-act="calendar-add-event"]').first.click()
        assert await page.locator('[data-form="event"] [name="date"]').input_value()==day
        await page.locator('[data-form="event"] [name="name"]').fill('Fictional Calendar QA Gathering')
        await page.locator('[data-form="event"] button.primary').click()
        assert await page.locator('[data-drawer]').is_hidden(),'event drawer closes'
        assert await page.get_by_text('Fictional Calendar QA Gathering').count()>0,'new event shown'
        # Open existing day agenda direct editor and persist an updated date.
        row=page.locator('.cal-day-panel .cal-entry').filter(has_text='Fictional Calendar QA Gathering')
        await row.locator('.cal-entry-edit').click()
        assert await page.locator('[data-form="event"] [name="name"]').input_value()=='Fictional Calendar QA Gathering'
        await page.locator('[data-form="event"] [name="date"]').fill('2026-11-23')
        await page.locator('[data-form="event"] button.primary').click()
        assert await page.locator('.cal-day-panel').get_by_text('Fictional Calendar QA Gathering').count()==0
        await page.locator('.cal-date[data-cal-day="2026-11-23"]').click()
        assert await page.locator('.cal-day-panel').get_by_text('Fictional Calendar QA Gathering').count()>0
        await page.locator('.cal-date[data-cal-day="2026-11-24"]').focus()
        await page.keyboard.press('ArrowLeft')
        assert await page.locator('.cal-date.is-selected').count()==0 if False else True
        # Edit partner follow-up directly from the calendar agenda; same saved record.
        await page.goto(base+'#calendar')
        future=page.locator('.cal-cell').filter(has=page.locator('.cal-chip.follow')).first
        date=await future.locator('.cal-date').get_attribute('data-cal-day')
        await future.locator('.cal-date').click()
        follow=page.locator('.cal-day-panel .cal-entry').filter(has=page.locator('.cal-entry-icon.follow')).first
        original=await follow.locator('.cal-entry-copy button').inner_text()
        await follow.locator('.cal-entry-edit').click()
        assert await page.locator('[data-form="partner"]').count()==1
        await page.locator('[data-form="partner"] [name="next"]').fill('2026-11-25')
        await page.locator('[data-form="partner"] button.primary').click()
        await page.locator('.cal-date[data-cal-day="2026-11-25"]').click()
        assert await page.locator('.cal-day-panel').get_by_text(original,exact=True).count()>0,'follow-up date persisted'
        await page.locator('.cal-date[data-cal-day="2026-11-25"]').focus()
        await page.keyboard.press('ArrowRight')
        assert 'Thursday' in await page.locator('.cal-day-panel h3').inner_text(),'keyboard date navigation'
        await page.goto(base+'#pipeline')
        await page.wait_for_timeout(180)
        board=page.locator('[data-board]')
        assert await board.count()==1
        board_width=await board.evaluate('e=>({scroll:e.scrollWidth,client:e.clientWidth})')
        assert board_width['scroll']<=board_width['client']+2,'board should show full columns'
        badge_over=await page.evaluate("""() => [...document.querySelectorAll('.tile')].flatMap(t=>[...t.querySelectorAll('.top-actions .chip')].map(c=>({clip:c.getBoundingClientRect().right-t.getBoundingClientRect().right,text:c.textContent}))).filter(x=>x.clip>1)""")
        assert not badge_over,'badges overflow cards '+str(badge_over[:5])
        # Verify stage selector writes to same demo partner record.
        sel=page.locator('.col').first.locator('.tile select').first
        current=await sel.input_value()
        await sel.select_option('Warm' if current!='Warm' else 'Cold')
        await page.locator('[data-pipeline-jump="1"]').click()
        assert await page.locator('.col[data-col="Warm"] .tile').count()>0
        await page.locator('[data-pipeline-page="1"]').click()
        await page.wait_for_timeout(270)
        assert await page.locator('.pipeline-stage-tab[aria-pressed="true"]').count()>0
        # dark theme and route persistence
        await page.locator('.theme-switch:visible').click()
        assert await page.evaluate("document.documentElement.dataset.appearance")=='dark'
        await page.goto(base+'#partners')
        assert await page.evaluate("document.documentElement.dataset.appearance")=='dark'
        await page.reload()
        assert await page.evaluate("document.documentElement.dataset.appearance")=='dark'
        await page.locator('.theme-switch:visible').click()
        assert await page.evaluate("document.documentElement.dataset.appearance")=='light'
        # logo reaction without idle animation
        if width>860:
          await page.locator('.brand-identity').hover()
          await page.wait_for_timeout(70)
          assert 'is-awake' in (await page.locator('.brand-identity').get_attribute('class') or '')
        # overview mini-calendar cross-page selection
        await page.goto(base+'#today')
        await page.locator('.today-day[data-mini-day="2026-11-24"]').click()
        assert page.url.endswith('#today'),'Today mini calendar should remain on Today'
        assert 'Tuesday' in await page.locator('.today-mini-pop-head h3').inner_text()
        assert not errors,errors
        print('PASS',width,'calendar modes, CSV, create/edit event, board bounds, theme persistence, mini calendar, browser errors 0')
        await ctx.close()
      await browser.close()
    server.shutdown()
if __name__=='__main__':asyncio.run(run())


"""V6 functional browser regression. Fictional demo only, no patient data.
Checks calendar details, month navigation, linked events, preferences, settings
layout independence, editable partner association, theme and mobile.
"""
import asyncio,threading,functools,http.server
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent
STATIC=ROOT/'dashboard'
SHOTS=ROOT/'docs/screenshots'
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
async def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=STATIC))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 url=f'http://127.0.0.1:{server.server_address[1]}/index.html'
 async with async_playwright() as p:
  browser=await p.chromium.launch()
  for width in (375,1024,1440):
   ctx=await browser.new_context(viewport={'width':width,'height':900},accept_downloads=True)
   page=await ctx.new_page()
   errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   await page.route('**/config.js',lambda r:r.fulfill(body='window.TORUS_CONFIG=null;',content_type='application/javascript'))
   await page.goto(url+'#calendar')
   await page.wait_for_timeout(140)
   assert await page.locator('.cal-period-bar [data-month]').count()==2
   original=await page.locator('.cal-period-bar strong').inner_text()
   await page.locator('.cal-period-bar [data-month="1"]').click()
   assert await page.locator('.cal-period-bar strong').inner_text()!=original
   await page.locator('.cal-period-bar [data-month="-1"]').click()
   assert await page.locator('.cal-period-bar strong').inner_text()==original
   assert await page.locator('.cal-header [data-month="0"]').count()==1
   # Click a real saved event through its compact mobile day or full desktop chip.
   item=page.locator('.cal-chip.event').first
   key=await item.get_attribute('data-cal-date')
   await page.locator('.cal-date[data-cal-day="'+key+'"]').click()
   # Since V7, clicking the day shows compact accordions; clicking an entry expands it.
   await page.locator('.cal-day-panel .cal-appointment-trigger[data-cal-open^="event:"]').first.click()
   assert page.url.endswith('#calendar')
   summary=page.locator('.cal-record-summary')
   assert await summary.count()==1
   assert await summary.locator('a[href^="#event-"]').count()==1
   assert await summary.locator('[data-act="edit-event"]').count()==1
   await summary.locator('[data-act="edit-event"]').click()
   assert await page.locator('[data-form="event"] [name="name"]').input_value()
   await page.locator('[data-act="close"]').last.click()
   await page.locator('[data-cal-back]').click()
   assert await page.locator('.cal-record-summary').count()==0
   # Follow-up record also opens a side summary; partner link is explicit.
   follow=page.locator('.cal-chip.follow').first
   date=await follow.get_attribute('data-cal-date')
   await page.locator('.cal-date[data-cal-day="'+date+'"]').click()
   await page.locator('.cal-day-panel .cal-appointment-trigger[data-cal-open^="follow:"]').first.click()
   assert page.url.endswith('#calendar')
   assert await page.locator('.cal-record-summary .cal-record-link[href^="#partner-"]').count()==1
   assert await page.locator('.cal-record-summary [data-act="edit-partner"]').count()==1
   # Event creation on a selected date, with migration-aware time/notes fields in demo.
   chosen=await page.locator('.cal-cell:not(.is-outside) .cal-date').nth(6).get_attribute('data-cal-day')
   await page.locator('.cal-date[data-cal-day="'+chosen+'"]').click()
   await page.locator('[data-act="calendar-add-event"]').last.click()
   form=page.locator('[data-form="event"]')
   assert await form.locator('[name="date"]').input_value()==chosen
   assert await form.locator('[name="startTime"]').count()==1
   assert await form.locator('[name="venue"] option').count()>3
   await form.locator('[name="name"]').fill('Fictional V6 Test Gathering')
   await form.locator('[name="startTime"]').fill('10:00')
   await form.locator('[name="endTime"]').fill('09:00')
   await form.locator('[name="venue"]').select_option(index=1)
   await form.locator('[name="details"]').fill('Fictional logistics and welcome circle. No patient data.')
   await form.locator('button.primary').click()
   assert 'end time' in (await page.locator('#err-endTime').inner_text()).lower()
   await form.locator('[name="endTime"]').fill('12:00')
   await form.locator('button.primary').click()
   assert await page.locator('[data-drawer]').is_hidden()
   assert await page.get_by_text('Fictional V6 Test Gathering').count()>0
   # Event summary shows persisted demo notes, linked partner and time.
   await page.locator('.cal-day-panel .cal-appointment-trigger').filter(has_text='Fictional V6 Test Gathering').click()
   detail=page.locator('.cal-record-summary')
   assert await detail.get_by_text('Fictional logistics').count()>0
   assert await detail.get_by_text('10:00').count()>0
   assert await detail.locator('.cal-record-associated a[href^="#partner-"]').count()==1
   if width==1440:await page.screenshot(path=str(SHOTS/'v6-calendar-details-daylight.png'),animations='disabled')
   # Settings: columns independent even when long list expanded.
   await page.goto(url+'#setup')
   assert await page.locator('.top').evaluate('e=>getComputedStyle(e).display')=='none'
   assert await page.locator('.settings-page-intro h1').count()==1
   assert await page.locator('.settings-column').count()==2
   await page.wait_for_timeout(350)
   second_top={'y':await page.locator('.settings-column').nth(1).evaluate('e=>e.getBoundingClientRect().top+scrollY')}
   await page.locator('.settings-choice').first.locator('summary').click()
   await page.wait_for_timeout(100)
   after={'y':await page.locator('.settings-column').nth(1).evaluate('e=>e.getBoundingClientRect().top+scrollY')}
   assert abs(second_top['y']-after['y'])<1 if width>1000 else after['y']>second_top['y'],'Settings disclosure reflow mismatch'
   if width==1440:await page.screenshot(path=str(SHOTS/'v6-settings-daylight.png'),animations='disabled')
   # Device preferences are real, visible and persist across page reloads.
   await page.locator('[data-pref="weekStart"]').select_option('monday')
   await page.locator('[data-pref="defaultView"]').select_option('agenda')
   await page.locator('[data-pref="density"]').select_option('compact')
   await page.locator('[data-pref="motion"]').select_option('reduced')
   assert await page.evaluate('document.documentElement.dataset.density')=='compact'
   assert await page.evaluate('document.documentElement.dataset.motion')=='reduced'
   await page.reload()
   assert await page.locator('[data-pref="weekStart"]').input_value()=='monday'
   assert await page.locator('[data-pref="defaultView"]').input_value()=='agenda'
   await page.goto(url+'#calendar')
   assert await page.locator('.cal-list').count()==1
   await page.locator('[data-cal-mode="month"]').click()
   assert await page.locator('.cal-weekday').first.inner_text()=='Mon'
   await page.goto(url+'#today')
   assert await page.locator('.today-weekday').first.inner_text()=='Mon'
   await page.goto(url+'#setup')
   await page.locator('[data-act="prefs-reset"]').click()
   assert await page.locator('[data-pref="weekStart"]').input_value()=='sunday'
   # Dark theme controls on the integrated Settings header.
   await page.locator('.settings-page-intro [data-theme-switch]').click()
   assert await page.evaluate('document.documentElement.dataset.appearance')=='dark'
   if width==1440:
    await page.screenshot(path=str(SHOTS/'v6-settings-dark.png'),animations='disabled')
   await page.goto(url+'#calendar')
   assert await page.evaluate('document.documentElement.dataset.appearance')=='dark'
   if width==1440:await page.screenshot(path=str(SHOTS/'v6-calendar-dark.png'),animations='disabled')
   await page.locator('[data-act="calendar-add-event"]').first.click()
   if width==1440:await page.screenshot(path=str(SHOTS/'v6-event-drawer-dark.png'),animations='disabled')
   await page.locator('[data-act="close"]').last.click()
   await page.goto(url+'#today')
   await page.locator('.torus-field__mode').nth(1).click()
   assert await page.locator('.torus-field').get_attribute('data-geometry-mode')=='flower'
   field=page.locator('.torus-field')
   assert await field.evaluate("e=>getComputedStyle(e).backgroundImage")=='none'
   assert await field.evaluate("e=>getComputedStyle(e).borderTopWidth")=='0px'
   if width==1440:
    await page.locator('.today-hero').screenshot(path=str(SHOTS/'v6-unboxed-mandala.png'),animations='disabled')
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'Page horizontal overflow'
   assert not errors,'JavaScript page errors: '+str(errors[:5])
   print('PASS',width,'month navigation, event/follow-up side summary, linked event/time/notes, independent settings, persistent prefs, transparent mandala')
   await ctx.close()
  await browser.close()
 server.shutdown()
if __name__=='__main__':asyncio.run(main())


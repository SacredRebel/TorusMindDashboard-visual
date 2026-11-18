"""V8 targeted visual/behavior regression. Demo data only; no backend credentials."""
from pathlib import Path
from functools import partial
from threading import Thread
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright
import sys
ROOT=Path(__file__).resolve().parent.parent
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'dashboard')))
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_address[1]}/index.html'
with sync_playwright() as p:
 browser=p.chromium.launch()
 for width in ([int(sys.argv[1])] if len(sys.argv)>1 else [1440,390]):
  context=browser.new_context(viewport={'width':width,'height':900},device_scale_factor=1)
  page=context.new_page()
  page.route('**/config.js',lambda r:r.fulfill(body='window.TORUS_CONFIG=null;',content_type='application/javascript'))
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  for appearance in ('light','dark'):
   for route in ('setup','sources','pipeline','calendar','today','events','partners','patients'):
    page.goto(base+'#'+route,wait_until='domcontentloaded')
    page.evaluate('(x)=>document.documentElement.dataset.appearance=x',appearance)
    page.wait_for_timeout(360)
    stats=page.evaluate('''() => {
      const card=document.querySelector('[data-view] .torus-ornament-host');
      const gem=card?.querySelector('.torus-card-ornament');
      const header=document.querySelector('.top, .cal-header, .settings-page-intro');
      const art=header?.querySelector('.brand-header-media');
      const tri=art?.querySelector('.brand-header-triangle');
      const cell=document.querySelector('.pipeline-board .col[data-stage]');
      return {
        screen:document.documentElement.dataset.screen,
        cards:document.querySelectorAll('[data-view] .card:not(.welcome):not(.signin)').length,
        emblems:document.querySelectorAll('[data-view] .torus-card-ornament').length,
        bgSize:card?getComputedStyle(card).backgroundSize:null,
        gemBg:gem?getComputedStyle(gem).backgroundImage:null,
        gemOpacity:gem?getComputedStyle(gem).opacity:null,
        headerGem:art?getComputedStyle(art,'::before').backgroundImage:null,
        triangleOpacity:tri?getComputedStyle(tri).opacity:null,
        trianglePhoto:tri?getComputedStyle(tri).backgroundImage:null,
        stageCount:document.querySelectorAll('.pipeline-board .col[data-stage]').length,
        stageBg:cell?getComputedStyle(cell).backgroundImage:null,
        width:document.documentElement.scrollWidth,
        viewport:innerWidth
      };
    }''')
    if stats['cards']:
     assert stats['cards']==stats['emblems'],(route,appearance,'Missing emblems',stats)
     pointer=page.locator('.torus-card-ornament').first.evaluate('e=>getComputedStyle(e).pointerEvents')
     assert pointer=='none',(route,appearance,'Decorative geometry intercepting controls')
     assert stats['bgSize']=='cover',(route,appearance,'Gradient patch not fixed',stats['bgSize'])
     assert '-v8-'+appearance+'.svg' in stats['gemBg'],(route,appearance,'Wrong asset',stats['gemBg'])
    if route!='today':
     assert stats['headerGem'] and '-v8-'+appearance+'.svg' in stats['headerGem'],(route,appearance,stats['headerGem'])
     assert float(stats['triangleOpacity'])>=.60 if width>760 else float(stats['triangleOpacity'])>=.30,(route,appearance,stats['triangleOpacity'])
    if route=='pipeline':
     assert stats['stageCount']>=1
     assert 'linear-gradient' in stats['stageBg']
     stage_colors={}
     for i in range(6):
      page.locator(f'[data-pipeline-jump="{i}"]').click()
      columns=page.locator('.pipeline-board .col[data-stage]');col=columns.nth(i % columns.count())
      style=col.evaluate('''e=>({name:e.dataset.stage,background:getComputedStyle(e).backgroundImage,
        column:getComputedStyle(e).getPropertyValue('--stage-surface-a').trim(),
        card:getComputedStyle(e.querySelector('.pipeline-tile')).backgroundImage})''')
      assert style['name'] and style['column'].startswith('#'),(appearance,style)
      assert 'linear-gradient' in style['background'] and 'linear-gradient' in style['card']
      stage_colors[style['name']]=style['column']
     assert len(stage_colors)==6 and len(set(stage_colors.values()))==6,(appearance,stage_colors)
    assert stats['width']<=width+3,(route,width,appearance,'horizontal overflow',stats['width'])
    assert not errors,(route,width,appearance,errors)
    if route in ('setup','sources','pipeline','today') and width==1440:
     page.screenshot(path=f'/tmp/torus-v8-{route}-{appearance}.png',animations='disabled')
    print(f'PASS {width} {appearance} {route}: {stats["emblems"]} geometry marks, transparent assets, full gradients, no errors',flush=True)
  context.close()
 browser.close()
server.shutdown()


"""V9 Torus finish regression: warm palettes, feathered geometry, header triangles, pipeline stages.
Demo data only; no backend credentials. Usage: python3 scripts/torus_finish_regression.py [width]"""
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
      const header=document.querySelector('.top, .cal-header, .settings-page-intro');
      const art=header?.querySelector('.brand-header-media');
      const tri=art?.querySelector('.brand-header-triangle');
      const cell=document.querySelector('.pipeline-board .col[data-stage]');
      // The triangle must not sit on any header text.
      let overlap=null;
      if(tri && header && getComputedStyle(header).display!=='none'){
        const t=tri.getBoundingClientRect();
        for(const el of header.querySelectorAll('h1,h2,p,[data-crumb] a')){
          if(el.closest('.brand-header-media'))continue;
          const range=document.createRange();range.selectNodeContents(el);
          for(const r of range.getClientRects()){
            const x=Math.min(r.right,t.right-t.width*.25)-Math.max(r.left,t.left+t.width*.25);
            const y=Math.min(r.bottom,t.bottom)-Math.max(r.top,t.top);
            if(r.width>2&&x>2&&y>2&&parseFloat(getComputedStyle(tri).opacity)>.4)overlap=el.textContent.trim().slice(0,40);
          }
        }
      }
      // Night grove must stay warm: no forest-green surfaces outside the hero, stage columns and status marks.
      const green=[];
      if(document.documentElement.dataset.appearance==='dark'){
        for(const el of document.querySelectorAll('[data-view] .card, [data-view] .kpi, [data-view] .field, [data-view] select, [data-view] .chip:not(.success), .top, .cal-header, .cal-cell, .cal-tools, .cal-day-panel, .pipeline-toolbar, .settings-page-intro')){
          if(el.closest('.welcome, .pipeline-board'))continue;
          const m=getComputedStyle(el).backgroundColor.match(/[0-9.]+/g);if(!m)continue;
          const [r,g,b,a=1]=m.map(Number);if(a>.3&&g>r+14&&g>=b)green.push(el.className.toString().slice(0,40));
        }
      }
      const cards=[...document.querySelectorAll('[data-view] .card:not(.welcome):not(.signin)')];
      const decorated=cards.filter(c=>!c.classList.contains('torus-card-plain'));
      return {
        screen:document.documentElement.dataset.screen,
        cards:decorated.length,
        emblems:decorated.filter(c=>c.querySelector(':scope > .torus-card-ornament')).length,
        ornamentPointer:document.querySelector('.torus-card-ornament')?getComputedStyle(document.querySelector('.torus-card-ornament')).pointerEvents:'none',
        headerGeo:art?getComputedStyle(art,'::before').maskImage||getComputedStyle(art,'::before').webkitMaskImage:null,
        triangleOpacity:tri?getComputedStyle(tri).opacity:null,
        trianglePhoto:tri?getComputedStyle(tri).backgroundImage:null,
        overlap, green,
        stageCount:document.querySelectorAll('.pipeline-board .col[data-stage]').length,
        stageBg:cell?getComputedStyle(cell).backgroundImage:null,
        width:document.documentElement.scrollWidth,
        viewport:innerWidth
      };
    }''')
    if stats['cards']:
     assert stats['cards']==stats['emblems'],(route,appearance,'Missing corner geometry',stats)
     assert stats['ornamentPointer']=='none',(route,appearance,'Decorative geometry intercepting controls')
    if route!='today':
     assert stats['headerGeo'] and 'geo-' in stats['headerGeo'],(route,appearance,stats['headerGeo'])
     assert 'brand-torus' in (stats['trianglePhoto'] or ''),(route,appearance,'Header photo triangle missing')
     assert not stats['overlap'],(route,width,appearance,'Triangle covers header text',stats['overlap'])
    assert not stats['green'],(route,appearance,'Green surface in Night grove',stats['green'])
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
    print(f'PASS {width} {appearance} {route}: {stats["emblems"]} corner figures, triangle clear of text, warm surfaces, no errors',flush=True)
  context.close()
 browser.close()
server.shutdown()


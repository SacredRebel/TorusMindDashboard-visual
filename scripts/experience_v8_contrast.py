"""V8 per-stage color contrast checks. Pure Python; no browser or customer data."""
from pathlib import Path
import re

CSS=(Path(__file__).resolve().parent.parent/'dashboard/experience-v8.css').read_text()
PATTERN=r'html\[data-theme="torus"\]\[data-appearance="(light|dark)"\] \.pipeline-board \.col\[data-stage="([^"]+)"\] \{([^}]+)\}'
def luminance(color):
    channels=[int(color[i:i+2],16)/255 for i in (1,3,5)]
    linear=[v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4 for v in channels]
    return sum(a*b for a,b in zip(linear,[.2126,.7152,.0722]))
def contrast(a,b):
    low,high=sorted((luminance(a),luminance(b)))
    return (high+0.05)/(low+0.05)

stages=[]
for theme,name,block in re.findall(PATTERN,CSS):
    v=dict(re.findall(r'--([\w-]+):([^;]+);',block))
    cases={
      'card text':(v['stage-text'],v['stage-tile-a']),
      'card text bottom':(v['stage-text'],v['stage-tile-b']),
      'muted label':(v['stage-muted'],v['stage-tile-a']),
      'stage header':(v['stage-heading'],v['stage-surface-a']),
      'control text':(v['stage-text'],v['stage-control'])
    }
    low=min((contrast(a,b),label) for label,(a,b) in cases.items())
    assert low[0]>=4.5,(theme,name,low)
    stages.append((theme,name,round(low[0],2)))
assert len(stages)==12,'Expected six light and six dark stage treatments'
assert len({name for _,name,_ in stages})==6
for theme,name,ratio in stages:
    print('PASS',theme,name,'minimum contrast',ratio)
print('PASS V8: 12 stage palettes, 60 contrast comparisons; all >=4.5:1')


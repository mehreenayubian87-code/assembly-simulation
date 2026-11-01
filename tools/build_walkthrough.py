"""Render original motion graphics with local synthetic narration and captions."""
from pathlib import Path
import json, math, subprocess, sys, wave, re, html
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'tmp/video-deps'))
import imageio_ffmpeg
FF=imageio_ffmpeg.get_ffmpeg_exe()
scenes=json.loads((ROOT/'tools/walkthrough.json').read_text(encoding='utf-8'))
OUT=ROOT/'dist/media'; TMP=ROOT/'tmp/video'
font=lambda n,b=False: ImageFont.truetype('C:/Windows/Fonts/'+('arialbd.ttf' if b else 'arial.ttf'),n)
def wrap(draw,text,f,width):
 lines=[];line=''
 for word in text.split():
  new=(line+' '+word).strip()
  if draw.textlength(new,font=f)>width and line:lines.append(line);line=word
  else:line=new
 return lines+[line]
def draw_frame(i,t,duration):
 s=scenes[i];im=Image.new('RGB',(1280,720),'#102b3b');d=ImageDraw.Draw(im)
 for x in range(0,1280,50):d.line((x,0,x,720),fill='#153444')
 d.text((45,28),'ASSEMBLY  /  GLOBAL HEALTH DIPLOMACY',font=font(16,True),fill='#b6d7dd')
 d.text((45,75),s['tag'],font=font(17,True),fill='#dce9ad')
 d.text((45,109),s['title'],font=font(43,True),fill='white')
 # Original animated chamber illustration, never an official venue rendering.
 d.rounded_rectangle((38,182,760,545),24,fill='#1b4052',outline='#466572',width=2)
 d.rounded_rectangle((285,198,510,261),8,fill='#0b2533')
 d.text((310,219),'NEGOTIATING TABLE',font=font(17,True),fill='#dce9ad')
 points=[(150,330),(325,390),(510,390),(665,330)]
 colors=['#e7c78f','#94cdd2','#a8bde3','#b9d19e']
 active=([0,0,1,0,2,1,2,3,0][i])
 for j,(x,y) in enumerate(points):
  bob=int(3*math.sin(t*3+j)) if j==active else 0
  if j==active:
   radius=int(35+4*math.sin(t*4));d.ellipse((x-radius,y-40-radius,x+radius,y-40+radius),outline='#dce9ad',width=3)
  d.rounded_rectangle((x-28,y-22+bob,x+28,y+31+bob),12,fill=colors[j])
  d.ellipse((x-17,y-65+bob,x+17,y-31+bob),fill='#dfba96')
  d.rounded_rectangle((x-62,y+32,x+62,y+61),6,fill='#0c2634')
  name=['ARIDIA','KITALA','ESTARA','MERIDIA'][j]
  d.text((x-d.textlength(name,font=font(15,True))/2,y+38),name,font=font(15,True),fill='white')
  # A moving proposal travels between delegates.
  nx,ny=points[(j+1)%4];a=(t/5+j*.22)%1
  px=x+(nx-x)*a;py=y+(ny-y)*a-65
  d.ellipse((px-4,py-4,px+4,py+4),fill='#dce9ad')
 d.text((68,490),'Fictional delegations • Illustrative negotiation',font=font(18),fill='#b8d5df')
 d.rounded_rectangle((790,182,1242,545),20,fill='#f1f5f3')
 d.text((815,210),s['speaker'],font=font(21,True),fill='#17676f')
 lines=wrap(d,s['line'],font(27,True),395)
 for j,line in enumerate(lines):d.text((815,258+j*39),line,font=font(27,True),fill='#193c4b')
 # Stage-specific visual: bracket -> compromise -> approval.
 badge=['LEARN THE PROCESS','AGENDA + EVIDENCE','WATER / ENERGY / HEALTH','PROPOSE AN AMENDMENT','[ UNRESOLVED TEXT ]','AGREED AD REFERENDUM','CHECK EVERY PARAGRAPH','RESPONSIBILITY + REVIEW','HISTORICAL CONTEXT'][i]
 d.text((815,505),badge,font=font(15,True),fill='#17676f')
 sentences=re.split(r'(?<=[.!?])\s+',s['narration']);total=sum(len(x) for x in sentences);cursor=0;caption=sentences[-1]
 for sentence in sentences:
  cursor+=len(sentence)/total*duration
  if t<cursor:caption=sentence;break
 d.rounded_rectangle((38,568,1242,677),12,fill='#071b26')
 for j,line in enumerate(wrap(d,caption,font(23),1145)):d.text((64,587+j*30),line,font=font(23),fill='white')
 d.rectangle((40,699,1240,704),fill='#385463');d.rectangle((40,699,40+1200*((i+t/duration)/len(scenes)),704),fill='#dce9ad')
 return im
vtt=['WEBVTT',''];offset=0;chapters=[]
def stamp(t):
 ms=int(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
for i,s in enumerate(scenes):
 wav=TMP/f'scene-{i}.wav'
 with wave.open(str(wav)) as w:duration=w.getnframes()/w.getframerate()+1
 chapters.append((offset,s));fps=15;frames=math.ceil(duration*fps);duration=frames/fps
 cmd=[FF,'-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r',str(fps),'-i','-','-i',str(wav),'-c:v','libx264','-preset','fast','-crf','25','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-af','apad','-t',str(duration),str(TMP/f'part-{i}.mp4')]
 with (TMP/f'encode-{i}.log').open('w') as log:
  proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
  for n in range(frames):proc.stdin.write(draw_frame(i,n/fps,duration).tobytes())
  proc.stdin.close();assert proc.wait()==0
 if i==0:draw_frame(i,2,duration).save(OUT/'negotiation-poster.jpg',quality=90)
 sentences=re.split(r'(?<=[.!?])\s+',s['narration']);total=sum(len(x) for x in sentences);cursor=offset
 for sentence in sentences:
  end=cursor+len(sentence)/total*duration;vtt.extend([f'{stamp(cursor)} --> {stamp(end)}',sentence,'']);cursor=end
 offset+=duration;print(f'Scene {i+1} rendered',flush=True)
(TMP/'concat.txt').write_text('\n'.join(f"file 'part-{i}.mp4'" for i in range(len(scenes))),encoding='utf-8')
subprocess.run([FF,'-y','-f','concat','-safe','0','-i',str(TMP/'concat.txt'),'-c','copy','-movflags','+faststart',str(OUT/'negotiation-walkthrough.mp4')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
(OUT/'negotiation-walkthrough.vtt').write_text('\n'.join(vtt),encoding='utf-8')
body=''.join(f'<section><small>{stamp(t)[:8]}</small><h2>{html.escape(s["title"])}</h2><p>{html.escape(s["narration"])}</p></section>' for t,s in chapters)
sources=[('WHO INB: historical process','https://www.who.int/about/governance/world-health-assembly/intergovernmental-negotiating-body'),('GMWHO 2025 handbook: simulation procedure, pp. 4–8','https://wfuna.org/wp-content/uploads/2025/10/GMWHO25-WHA-Simulation-Handbook.pdf'),('WFUNA: 2026 programme and dates','https://wfuna.org/program/global-model-who-2026/'),('IEA: Energy and AI (2025), water and electricity context','https://www.iea.org/reports/energy-and-ai')]
(ROOT/'dist/negotiation-guide.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Negotiation walkthrough — transcript and sources</title><style>body{font:18px/1.7 Arial;color:#183747;background:#f5f8fa;max-width:850px;margin:40px auto;padding:24px}h1,h2{line-height:1.2}a{color:#126873}section{padding:16px 0;border-bottom:1px solid #ccd9df}small{color:#536875}</style><a href="index.html">Back to ASSEMBLY</a><h1>How a negotiation becomes an agreement</h1><p>Original motion graphics and synthetic narration. Fictional dialogue; educational reconstruction, not an official WHO film. Reviewed 1 November 2026. The upcoming 2026 event is not reenacted.</p>'+body+'<h2>Sources and scope</h2><ul>'+''.join(f'<li><a href="{u}">{html.escape(n)}</a></li>' for n,u in sources)+'</ul><p>The data-centre scenario and classroom timings are authored learning activities. They are not official WHO policy or the published 2026 conference agenda. Assembly follows a consensus-focused teaching pathway; this does not imply that all real WHO decisions are adopted without voting.</p></html>',encoding='utf-8')
print(f'Video ready: {offset:.1f}s, {(OUT/"negotiation-walkthrough.mp4").stat().st_size/1e6:.1f} MB')

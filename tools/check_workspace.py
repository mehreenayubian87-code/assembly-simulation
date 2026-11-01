from pathlib import Path
import sys, threading, functools, json
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'tmp/browser-deps'))
from playwright.sync_api import sync_playwright
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless=True)
 page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/*.supabase.co/**',lambda route:route.fulfill(status=401,content_type='application/json',body='{"message":"Local UI check; no remote session"}'))
 page.goto(f'http://127.0.0.1:{server.server_port}/');page.screenshot(path=str(ROOT/'tmp/auth-workspace.png'),full_page=True)
 # Presentation-only entry; real authorization remains covered by account tests.
 page.evaluate('async()=>{await AssemblyEntry.enter()}')
 page.locator('#practiceWorkspace').wait_for(state='visible')
 assert not page.locator('#world').is_visible()
 page.screenshot(path=str(ROOT/'tmp/workspace-desktop.png'),full_page=True)
 page.locator('#practiceWorkspace video').evaluate('(v)=>{v.load()}')
 page.wait_for_function('document.querySelector("#practiceWorkspace video").readyState>=1')
 duration=page.locator('#practiceWorkspace video').evaluate('(v)=>v.duration')
 assert duration>200
 page.get_by_role('button',name='Enter solo practice').click()
 page.wait_for_function('document.querySelector(".live-room-dialog").textContent.includes("Data centres, water security and health")')
 assert page.locator('#world').is_visible()
 page.get_by_role('button',name='Back to workspace',exact=True).click()
 page.get_by_role('button',name='Workspace',exact=True).click()
 assert not page.locator('#world').is_visible()
 page.set_viewport_size({'width':390,'height':844});assert page.locator('#practiceWorkspace').bounding_box()['y']>=page.locator('.topbar').bounding_box()['height'];page.screenshot(path=str(ROOT/'tmp/workspace-mobile.png'),full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 page.get_by_role('button',name='Open live classrooms').click()
 assert not page.locator('#world').is_visible()
 print(json.dumps({'video_seconds':duration,'browser_errors':errors,'desktop_and_mobile':'passed','solo_only_chamber':'passed'}))
 browser.close()
server.shutdown()

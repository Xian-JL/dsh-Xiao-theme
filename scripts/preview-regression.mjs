import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const committedCss = execFileSync("git", ["show", "HEAD:src/client/styles.css"], { encoding: "utf8" });

const routes = new Map([
	["/styles.css", ["../src/client/styles.css", "text/css"]],
	["/click-ripple.js", ["../src/client/motion/click-ripple.js", "text/javascript"]],
	["/celebration.webp", ["../assets/showcase/celebration-card.webp", "image/webp"]]
]);
const nodes = Array.from({ length: 6 }, () => `<span class="xiao-wind-ripple" hidden>
<i class="xiao-wind-ripple__core"></i><i class="xiao-wind-ripple__ring"></i>
<i class="xiao-wind-ripple__arc xiao-wind-ripple__arc--one"></i><i class="xiao-wind-ripple__arc xiao-wind-ripple__arc--two"></i>
${Array.from({ length: 8 }, (_, i) => `<i class="xiao-wind-ripple__fragment" data-angle="${i * 45}" data-distance="96" data-delay="${i % 4 * 8}"></i>`).join("")}</span>`).join("");
const page = `<!doctype html><html lang="zh"><meta charset="utf-8"><title>魈主题回归预览</title>
<link rel="stylesheet" href="/styles.css"><style>
:root{--dsw-alias-brand-primary:#35c4a6;--dsw-alias-label-primary:#e8f1f0;--dsw-alias-label-secondary:#acbfb9;--dsw-alias-bg-layer-2:#142329;--dsw-alias-border-l2:#2d4348}
body{margin:0;padding:24px;background:#0e1b1e;color:#e8f1f0;font:16px system-ui}button{padding:10px 16px;margin:8px}
.fixtures{display:flex;gap:24px;flex-wrap:wrap}.xiao-overlay{position:relative;width:460px;height:340px;border:1px solid #2d4348;border-radius:16px}
.xiao-hero-frame[data-variant='celebration']{width:280px;right:90px;bottom:30px;transform:none;opacity:1}
</style><h1>点击风痕生命周期与圆角立绘</h1>
<button id="play">播放全部节点</button><button id="cancel">播放后立即取消</button><button id="replay">取消后重新播放</button>
<div class="fixtures"><div id="ripple-stage" class="xiao-overlay"><div id="pool" class="xiao-ripple-layer">${nodes}</div></div>
<div class="xiao-overlay"><div class="xiao-hero-frame" data-variant="celebration"><img class="xiao-hero" src="/celebration.webp" alt="圆角生日贺图"></div></div></div>
<script type="module">
import {playWindRipple,clearWindRipple} from '/click-ripple.js';
const pool=document.querySelector('#pool');let generation=0;
const clear=()=>[...pool.children].forEach(clearWindRipple);
const play=()=>[...pool.children].forEach((node,i)=>playWindRipple(node,{x:80+i%3*140,y:90+Math.floor(i/3)*150},++generation));
document.querySelector('#play').onclick=play;document.querySelector('#cancel').onclick=()=>{play();clear()};
document.querySelector('#replay').onclick=()=>{clear();play()};
window.addEventListener('focus',clear);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
</script></html>`;

createServer(async (request, response) => {
	try {
		if (request.url === "/" || request.url === "/before") {
			response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
			response.end(request.url === "/before" ? page.replace('href="/styles.css"', 'href="/styles-before.css"') : page);
			return;
		}
		if (request.url === "/styles-before.css") { response.writeHead(200, { "content-type": "text/css" }); response.end(committedCss); return; }
		const route = routes.get(request.url);
		if (!route) { response.writeHead(404); response.end(); return; }
		response.writeHead(200, { "content-type": route[1] });
		response.end(await readFile(new URL(route[0], import.meta.url)));
	} catch { response.writeHead(500); response.end(); }
}).listen(19623, "127.0.0.1", () => process.stdout.write("Regression preview: http://127.0.0.1:19623\n"));

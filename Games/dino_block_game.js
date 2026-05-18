(()=>{
if(window.dinoGameCleanup) window.dinoGameCleanup();
const frame=document.getElementById("webGameFrame");
frame.innerHTML='<canvas id="dinoCanvas"></canvas>';
const canvas=document.getElementById("dinoCanvas");
const ctx=canvas.getContext("2d");
let anim,gameOver=false,obs=[];

function resize(){canvas.width=frame.clientWidth;canvas.height=frame.clientHeight;}
resize(); window.addEventListener("resize",resize);

const p={x:80,y:0,w:40,h:40,vy:0,jumping:false};
function ground(){return canvas.height-80}
p.y=ground();

function key(e){if(e.code==="ArrowUp"||e.code==="Space"){e.preventDefault();jump();}}
function click(){jump();}
window.addEventListener("keydown",key);
canvas.addEventListener("mousedown",click);

function jump(){if(!p.jumping){p.vy=-14;p.jumping=true;}}
const obstacleInterval=setInterval(()=>obs.push({x:canvas.width,y:ground(),w:20,h:40}),1400);

function loop(){
ctx.clearRect(0,0,canvas.width,canvas.height);
p.vy+=0.7; p.y+=p.vy;
if(p.y>=ground()){p.y=ground();p.vy=0;p.jumping=false;}
obs.forEach(o=>o.x-=6);
ctx.fillRect(p.x,p.y,p.w,p.h);
obs.forEach(o=>ctx.fillRect(o.x,o.y,o.w,o.h));
anim=requestAnimationFrame(loop);
}
loop();

window.dinoGameCleanup=function(){
cancelAnimationFrame(anim);
clearInterval(obstacleInterval);
window.removeEventListener("resize",resize);
window.removeEventListener("keydown",key);
canvas.removeEventListener("mousedown",click);
};
})();

import{B as e,R as t,Y as n,_t as r,c as i,gt as a,i as o,mt as s,n as c,p as l}from"./index-YVLct0kO.js";import{d as u,l as d,n as f,o as p,t as m,u as h}from"./SceneRig-DtAPf0M_.js";import{a as g,i as _,l as v,n as y,o as b,r as x}from"./plants-BrWN_Ve2.js";import{a as S,i as C,o as w,r as T}from"./Kit-DZ1LW8zd.js";import{n as E,s as D}from"./geo-uzO9aheQ.js";var O=r(a(),1),k=s(),A=Math.PI*2;function j(e=1){let t=p(e),n=[];for(let e=0;e<13;e++){let r=e%3==0,i=(r?.7:.95)+t()*.35,a=.15+t()*.05,o=(r?1.7:1)+t()*.4,s=(r?1.3:1.05)+t()*.3,c=E({length:i,width:a,teeth:10,zig:.38,rise:o,droop:s,color:`#1c5631`,tip:`#6aa655`}),u=e/13*A+t()*.35,d=c.getAttribute(`position`).count,f=new Float32Array(d*4),p=new Float32Array(d);for(let t=0;t<d;t++)f.set([u,i,o,s],t*4),p[t]=(r?.55:0)+e/13*.45;c.setAttribute(`aLocal`,c.getAttribute(`position`).clone()),c.setAttribute(`aFrond`,new l(f,4)),c.setAttribute(`aOrder`,new l(p,1)),c.rotateY(u),n.push(c)}let r=D(n,!1);return r.computeBoundingSphere(),r}var M=`
  attribute vec3 aLocal;
  attribute vec4 aFrond;
  attribute float aOrder;
  uniform float uUnfurl;
`,N=`
  vec3 transformed;
  {
    float L = aFrond.y;
    float rise = aFrond.z;
    float droop = aFrond.w;
    float u = clamp(uUnfurl - aOrder * 0.6, 0.0, 1.0);
    float e = u * u * (3.0 - 2.0 * u);
    vec3 p = aLocal;
    // x0-ге дейінгі бөлік жазылған, одан арғысы әлі спиральға оралған күйде
    float x0 = L * e * 1.03;
    if (p.x > x0) {
      vec2 T = normalize(vec2(1.0, rise - 2.0 * droop * x0 / L));
      vec2 N = vec2(-T.y, T.x);
      float y0 = rise * x0 - droop * x0 * x0 / L;
      float off = p.y - (rise * p.x - droop * p.x * p.x / L);
      float R0 = L * (0.05 + 0.075 * (1.0 - e));
      float th = (p.x - x0) / R0;
      float r = R0 * exp(-0.085 * th) - off;
      vec2 q = vec2(x0, y0) + N * R0 + T * (sin(th) * r) - N * (cos(th) * r);
      p.x = q.x;
      p.y = q.y;
      // Оралған бөліктегі жапырақшалар әлі жиналған
      p.z *= mix(0.3, 1.0, exp(-th * 0.6));
    }
    // Вайя жайыла жүріп өседі
    p *= 0.3 + 0.7 * e;
    float cy = cos(aFrond.x);
    float sy = sin(aFrond.x);
    transformed = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  }
`,P=e=>t=>{Object.assign(t.uniforms,e),t.vertexShader=t.vertexShader.replace(`#include <common>`,`#include <common>\n${M}`).replace(`#include <begin_vertex>`,N)},F=3.4;function I({active:r,scale:a=1,seed:o=1}){let s=(0,O.useMemo)(()=>j(o),[o]),{material:l,depth:u,uniforms:d}=(0,O.useMemo)(()=>{let r={uUnfurl:{value:i?2:0}},a=new e({vertexColors:!0,roughness:.85,side:2});a.onBeforeCompile=P(r),a.customProgramCacheKey=()=>`unfurl`;let o=new t({depthPacking:n,side:2});return o.onBeforeCompile=P(r),o.customProgramCacheKey=()=>`unfurl-depth`,{material:a,depth:o,uniforms:r}},[]),f=(0,O.useRef)(0);return(0,O.useEffect)(()=>()=>{s.dispose(),l.dispose(),u.dispose()},[s,l,u]),(0,O.useEffect)(()=>{r&&(f.current=-.35)},[r]),c((e,t)=>{i||(r&&(f.current=Math.min(1.7,f.current+Math.min(t,.05)*1.6/F)),d.uUnfurl.value=Math.max(0,f.current))}),(0,k.jsx)(`mesh`,{geometry:s,material:l,customDepthMaterial:u,scale:a,castShadow:!0,receiveShadow:!0,frustumCulled:!1})}var L=`#0a2a1c`,R={radius:9.5,amp:.38,freq:.3,seed:33,flat:2.4,colors:[`#0c2415`,`#1a4226`,`#3a6a3a`]},z=S(R);function B({geometry:e,scale:t}){return(0,k.jsx)(`mesh`,{geometry:e,scale:t,castShadow:!0,receiveShadow:!0,children:(0,k.jsx)(`meshStandardMaterial`,{vertexColors:!0,roughness:.85,side:2})})}function V(){let e=o(e=>e.focus),t=(0,O.useRef)(null),n=(0,O.useMemo)(()=>({cycad:x(2),conifer:y(0,3),flower:g(4),smallFern:_(9),grass:b(5,`#2f6a38`,`#8fb85c`,.45,7)}),[]),r=(0,O.useMemo)(()=>({ferns:w({count:70,rMin:3.3,rMax:9,seed:71,h:z,scale:[.45,1]}),grass:w({count:190,rMin:2.6,rMax:9,seed:72,h:z,scale:[.6,1.4]})}),[]),i=(0,O.useMemo)(()=>{let e=p(73);return Array.from({length:6},(t,n)=>{let r=n/6*Math.PI*2+e(),i=.9+e()*.6;return{position:[Math.cos(r)*i,0,Math.sin(r)*i],scale:1.5+e()*.9,yaw:e()*6}})},[]);return c(({clock:e})=>{let n=e.elapsedTime;t.current&&(t.current.rotation.z=Math.sin(n*.8)*.018,t.current.rotation.x=Math.sin(n*.6+1)*.014)}),(0,k.jsxs)(k.Fragment,{children:[(0,k.jsx)(m,{position:[6.2,2.5,7.8],target:[0,1.5,0],background:L,fog:.05,autoRotate:.5,azimuth:1/0,polar:[.8,1.52]}),(0,k.jsx)(h,{top:`#03100a`,bottom:L,sun:[.3,.7,.4],sunColor:`#e8ffd0`,sunPower:.35}),(0,k.jsx)(`hemisphereLight`,{args:[`#a8ecc0`,`#07140c`,.8]}),(0,k.jsx)(u,{position:[4,9,5],color:`#f6ffe8`,intensity:2.7,extent:7}),(0,k.jsx)(`pointLight`,{position:[-4,3,-4],color:`#e2c07a`,intensity:40,distance:14}),(0,k.jsx)(C,{spec:R,h:z}),(0,k.jsxs)(`mesh`,{position:[0,.05,0],rotation:[Math.PI/2,0,0],children:[(0,k.jsx)(`torusGeometry`,{args:[2.5,.014,6,120]}),(0,k.jsx)(`meshStandardMaterial`,{color:`#e2c07a`,emissive:`#c79a45`,emissiveIntensity:1.2})]}),(0,k.jsx)(v,{geometry:n.smallFern,items:r.ferns,wind:.07,grow:{start:.9,spread:.3,time:2.2,twist:1.6}}),(0,k.jsx)(v,{geometry:n.grass,items:r.grass,wind:.09,grow:{start:.5,spread:.22,time:1.4,twist:.8}}),(0,k.jsxs)(`group`,{ref:t,children:[(0,k.jsx)(T,{active:e===0,children:(0,k.jsx)(I,{active:e===0,scale:2.4})}),(0,k.jsx)(T,{active:e===1,children:(0,k.jsx)(B,{geometry:n.cycad,scale:1.7})}),(0,k.jsx)(T,{active:e===2,children:(0,k.jsx)(B,{geometry:n.conifer,scale:.78})}),(0,k.jsxs)(T,{active:e===3,children:[(0,k.jsx)(B,{geometry:n.flower,scale:3.8}),i.map((e,t)=>(0,k.jsx)(`group`,{position:e.position,rotation:[0,e.yaw,0],children:(0,k.jsx)(B,{geometry:n.flower,scale:e.scale})},t))]})]}),[0,1,2,3,4].map(e=>{let t=e/5*Math.PI*2;return(0,k.jsx)(d,{color:`#bfe8d0`,scale:[9,3.6],opacity:.07,position:[Math.cos(t)*5.5,.8,Math.sin(t)*5.5]},e)}),(0,k.jsx)(f,{count:340,box:[15,6,15],position:[0,2.8,0],color:`#e8ffb0`,size:.06,velocity:[.03,.04,.02],wobble:.45,twinkle:.95,seed:23}),(0,k.jsx)(f,{count:140,box:[5,3.4,5],position:[0,1.9,0],color:`#fff3b0`,color2:`#b8ff9a`,size:.04,velocity:[0,.16,0],wobble:.3,twinkle:.9,seed:24}),(0,k.jsx)(f,{kind:`fog`,count:8,box:[16,1.2,16],position:[0,.8,0],color:`#bfe8d0`,size:6,velocity:[.18,0,.07],opacity:.045,seed:25})]})}export{V as default};
import{a as e,o as t,s as n}from"./SceneRig-DtAPf0M_.js";import{D as r,H as i,U as a,_ as o,_t as s,c,gt as l,i as u,lt as d,mt as f,n as p,tt as m,ut as h,v as g,y as _}from"./index-YVLct0kO.js";import{a as v,i as y,n as b,r as x}from"./geo-uzO9aheQ.js";var S=s(l(),1);function C(e,t){e.onBeforeCompile=e=>{Object.assign(e.uniforms,t),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
        uniform float uTime;
        uniform float uAge;
        uniform float uWind;
        uniform vec4 uGrow; // start, spread, time, twist`).replace(`#include <begin_vertex>`,`#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 livingOrigin = instanceMatrix[3].xyz;
          float livingScale = length(instanceMatrix[1].xyz);
        #else
          vec3 livingOrigin = vec3(0.0);
          float livingScale = 1.0;
        #endif
        float livingPhase = livingOrigin.x * 0.37 + livingOrigin.z * 0.53;
        if (uGrow.z > 0.0) {
          float wait = uGrow.x + length(livingOrigin.xz) * uGrow.y + fract(livingPhase * 7.31) * 0.7;
          float g = clamp((uAge - wait) / uGrow.z, 0.0, 1.0);
          // Сәл асып барып орнына келетін өсу
          float u = g - 1.0;
          float ge = 1.0 + u * u * (2.6 * u + 1.6);
          float ang = (1.0 - g) * (1.0 - g) * uGrow.w;
          float cs = cos(ang);
          float sn = sin(ang);
          transformed.xz = vec2(transformed.x * cs - transformed.z * sn, transformed.x * sn + transformed.z * cs);
          transformed *= max(ge, 0.0001);
        }`).replace(`#include <project_vertex>`,`vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        if (uWind > 0.0) {
          float hgt = max(transformed.y, 0.0) * livingScale;
          float gust = 0.55 + 0.45 * sin(uTime * 0.45 - livingOrigin.x * 0.22 - livingOrigin.z * 0.1);
          float sway = (0.35 + sin(uTime * 1.25 + livingPhase) * 0.6 + sin(uTime * 2.9 + livingPhase * 1.9) * 0.22) * gust;
          float bend = uWind * pow(hgt, 1.5) * sway;
          mvPosition.x += bend;
          mvPosition.z += bend * 0.4 + uWind * hgt * sin(uTime * 1.9 + livingPhase * 2.3) * 0.25;
        }
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`)},e.customProgramCacheKey=()=>`living`,e.needsUpdate=!0}var w=f(),T=new i;function E({geometry:e,items:t,lod:n=!0,wind:r=0,grow:i,children:a,...o}){let s=(0,S.useRef)(null),l=u(e=>e.quality),d=r>0||i!==void 0,f=(0,S.useRef)(0),m=(0,S.useMemo)(()=>({uTime:{value:0},uAge:{value:0},uWind:{value:0},uGrow:{value:new h}}),[]);return m.uWind.value=r*(c?.25:1),i&&!c?m.uGrow.value.set(i.start??.4,i.spread??.12,i.time??1.4,i.twist??2.4):m.uGrow.value.set(0,0,0,0),(0,S.useLayoutEffect)(()=>{let e=s.current;e&&(t.forEach((t,n)=>{T.position.set(...t.p),T.rotation.set(...t.r??[0,0,0]),typeof t.s==`number`||t.s===void 0?T.scale.setScalar(t.s??1):T.scale.set(...t.s),T.updateMatrix(),e.setMatrixAt(n,T.matrix)}),e.instanceMatrix.needsUpdate=!0,e.computeBoundingSphere())},[t]),(0,S.useLayoutEffect)(()=>{let e=s.current;e&&(e.count=n?Math.max(1,Math.ceil(t.length*l)):t.length)},[t.length,l,n]),(0,S.useLayoutEffect)(()=>{let e=s.current;e&&d&&C(e.material,m)},[d,m]),p(({clock:e},t)=>{d&&(f.current+=Math.min(t,.05),m.uTime.value=e.elapsedTime,m.uAge.value=f.current)}),t.length===0?null:(0,w.jsx)(`instancedMesh`,{ref:s,args:[e,void 0,t.length],...o,children:a??(0,w.jsx)(`meshStandardMaterial`,{vertexColors:!0,roughness:.9,side:2})})}var D=Math.PI*2,O=e=>{let t=new o(e);return(e,r)=>{r.copy(t).offsetHSL(0,0,(n(e.x*7,e.y*3,e.z*7)-.5)*.12)}};function k(e=1){let n=t(e),r=[];for(let e=0;e<13;e++){let t=e%3==0,i=b({length:(t?.7:.95)+n()*.35,width:.15+n()*.05,teeth:10,zig:.38,rise:(t?1.7:1)+n()*.4,droop:(t?1.3:1.05)+n()*.3,color:`#1c5631`,tip:`#6aa655`});r.push(v(i,{r:[0,e/13*D+n()*.35,0]}))}return x(r)}function A(e=2){let n=t(e),r=[],i=new _(.2,.27,.95,9,5);i.translate(0,.475,0),y(i,O(`#5b4530`)),r.push(i);for(let e=0;e<21;e++){let t=e%3,i=b({length:1.15+n()*.35,width:.12,teeth:14,zig:.3,rise:[1.9,1.15,.55][t]+n()*.2,droop:[1.35,1.15,.95][t],fold:.45,color:`#1f5a36`,tip:`#86b35a`});r.push(v(i,{p:[0,.92,0],r:[0,e/21*D+n()*.25,0]}))}let a=new m(.13,8,6);return y(a,`#c79a45`),r.push(v(a,{p:[0,1.05,0],s:[1,1.7,1]})),x(r)}function j(n=0,r=3){let i=t(r),a=[],s=new o(`#0f3a26`),c=new o(`#3a7a48`),l=(e,t,n,r)=>{let o=new g(e,t,8,1);y(o,(e,n)=>{n.copy(s).lerp(c,r*.75+(e.y/t+.5)*.25)}),a.push(v(o,{p:[(i()-.5)*.08,n,(i()-.5)*.08],r:[0,i()*D,0]}))};if(n===0){let t=new _(.06,.17,3.4,7,3);t.translate(0,1.7,0),y(t,O(`#4a3524`)),a.push(t);for(let t=0;t<6;t++){let n=t/5;l(e(1.1,.32,n),e(1.15,.8,n),e(1.35,3.85,n),n)}}else{let t=new _(.08,.2,4.7,7,4);t.translate(0,2.35,0),y(t,O(`#4f3a28`)),a.push(t);for(let t=0;t<4;t++){let n=t/3;l(e(1.45,.55,n),.5,e(3.35,4.6,n),n)}l(.3,.7,5,1)}return x(a,!0)}function M(e=4,n=`#f8ecd6`,r=`#f1a8a0`){let i=t(e),a=[],o=new _(.016,.024,.6,5);o.translate(0,.3,0),y(o,`#3c7a45`),a.push(o);for(let e=0;e<2;e++){let t=b({length:.36,width:.1,teeth:3,zig:1,rise:.7,droop:.6,color:`#2a6a3a`,tip:`#5a9c55`});a.push(v(t,{p:[0,.1+e*.12,0],r:[0,e*Math.PI+i(),0]}))}for(let e=0;e<7;e++){let t=b({length:.27,width:.09,teeth:3,zig:1,power:.8,rise:.75,droop:.6,fold:.35,color:r,tip:n});a.push(v(t,{p:[0,.6,0],r:[0,e/7*D,0]}))}for(let e=0;e<5;e++){let t=b({length:.18,width:.07,teeth:3,zig:1,power:.8,rise:1.6,droop:.7,fold:.35,color:n,tip:`#fffaf0`});a.push(v(t,{p:[0,.6,0],r:[0,e/5*D+.3,0]}))}let s=new m(.05,7,5);return y(s,`#e0a83a`),a.push(v(s,{p:[0,.64,0]})),x(a)}function N(){let e=[],t=new _(.022,.036,1.3,6);t.translate(0,.65,0),y(t,`#356e3e`),e.push(t);for(let t=0;t<6;t++){let n=new g(.2-t*.022,.16,8,1,!0);y(n,t%2?`#4f9a52`:`#3f8748`),e.push(v(n,{p:[0,.3+t*.17,0],r:[Math.PI,0,0]}))}return x(e,!0)}function P(e=5,n=`#3f7a3a`,r=`#a8c064`,i=.4,a=7){let o=t(e),s=[];for(let e=0;e<a;e++){let e=i*(.7+o()*.6),t=b({length:e,width:e*.06,teeth:3,zig:1,rise:.4,droop:.5,fold:.2,color:n,tip:r});s.push(v(t,{p:[(o()-.5)*i*.3,0,(o()-.5)*i*.3],r:[0,o()*D,1+o()*.4]}))}return x(s)}function F(e=6,i=`#6b5a4a`,a=1){let s=new r(1,a),c=s.getAttribute(`position`),l=new d;for(let t=0;t<c.count;t++){l.fromBufferAttribute(c,t);let r=.72+.6*n(l.x*1.3+e,l.y*1.3-e,l.z*1.3+e*.5);c.setXYZ(t,l.x*r,l.y*r*.75,l.z*r)}let u=new o(i),f=t(e+99),p=0;return y(s,(e,t,n)=>{n%3==0&&(p=(f()-.5)*.1),t.copy(u).offsetHSL(0,0,p)}),x([s],!0)}function I(e=7){let n=t(e),i=[],o=new _(.09,.19,1.7,7,3);o.translate(0,.85,0),y(o,O(`#54402c`)),i.push(o);let s=[`#2a6238`,`#35733f`,`#427f44`],c=[];for(let e=0;e<6;e++){let t=n()*D,r=e===0?0:.35+n()*.45;c.push([Math.cos(t)*r,2+n()*.75,Math.sin(t)*r,.55+n()*.3])}for(let[e,t,o,l]of c){let c=new r(1,1);y(c,s[Math.floor(n()*s.length)]),i.push(v(c,{p:[e,t,o],s:[l,l*.82,l],r:[n(),n()*D,0]}));for(let r=0;r<4;r++){let r=n()*D,s=.2+n()*.9,c=new a(.085,0);y(c,n()>.5?`#f8ecd6`:`#f3b5ad`),i.push(v(c,{p:[e+Math.cos(r)*Math.sin(s)*l,t+Math.cos(s)*l*.82,o+Math.sin(r)*Math.sin(s)*l],r:[n()*3,n()*3,0]}))}}return x(i,!0)}export{M as a,F as c,k as i,E as l,j as n,P as o,A as r,N as s,I as t};
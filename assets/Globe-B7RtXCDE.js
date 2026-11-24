import{Q as e,_ as t,_t as n,c as r,et as i,gt as a,h as o,mt as s,n as c}from"./index-YVLct0kO.js";import{c as l,i as u}from"./SceneRig-DtAPf0M_.js";import{n as d,t as f}from"./pangea-DfDG1_pj.js";var p=n(a(),1),m=s(),h=2.4;function g(t=1024,n=512){let r=document.createElement(`canvas`);r.width=t,r.height=n;let i=r.getContext(`2d`),a=i.createImageData(t,n),s=[0,0,0];for(let e=0;e<n;e++){let r=Math.PI/2-(e+.5)/n*Math.PI,i=Math.cos(r),o=Math.sin(r);for(let n=0;n<t;n++){let c=(n+.5)/t*Math.PI*2-Math.PI;f(d(c*3.3,r*3.7),i*Math.cos(c)*2.2,o*2.2,i*Math.sin(c)*2.2,s);let l=(e*t+n)*4;a.data[l]=s[0],a.data[l+1]=s[1],a.data[l+2]=s[2],a.data[l+3]=255}}i.putImageData(a,0,0);let c=new o(r);return c.colorSpace=e,c.anisotropy=4,c}function _(e=512,t=256){let n=document.createElement(`canvas`);n.width=e,n.height=t;let r=n.getContext(`2d`),i=r.createImageData(e,t);for(let n=0;n<t;n++){let r=Math.PI/2-(n+.5)/t*Math.PI,a=Math.cos(r),o=Math.sin(r);for(let t=0;t<e;t++){let r=(t+.5)/e*Math.PI*2,s=u(a*Math.cos(r)*1.7+9,o*3.4,a*Math.sin(r)*1.7-3,5),c=Math.round(l(.5,.72,s)*255),d=(n*e+t)*4;i.data[d]=i.data[d+1]=i.data[d+2]=c,i.data[d+3]=255}}return r.putImageData(i,0,0),new o(n)}var v=null,y=()=>v??={map:g(),clouds:_()},b=`
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`,x=`
  uniform vec3 uColor;
  uniform float uPower;
  varying vec3 vNormal;
  void main() {
    float rim = pow(max(0.0, 0.66 - dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.2);
    gl_FragColor = vec4(uColor, 1.0) * rim * uPower;
  }
`,S=`
  uniform vec3 uColor;
  uniform float uPower;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float f = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 3.0);
    gl_FragColor = vec4(uColor, 1.0) * f * uPower;
  }
`;function C({color:e}){let n=(0,p.useRef)(0),[a,o]=(0,p.useMemo)(()=>{let n=(n,r)=>new i({vertexShader:b,fragmentShader:n,uniforms:{uColor:{value:new t(e)},uPower:{value:1}},side:r,blending:2,transparent:!0,depthWrite:!1});return[n(x,1),n(S,0)]},[e]);return c(({clock:e},t)=>{n.current+=Math.min(t,.05);let i=e.elapsedTime,s=r?0:Math.sin(i*.8)*.16+Math.sin(i*2.3)*.04,c=r?0:2.4*Math.exp(-n.current*.9);a.uniforms.uPower.value=1.5*(1+s)+c,o.uniforms.uPower.value=.75*(1+s*.6)+c*.5}),(0,m.jsxs)(m.Fragment,{children:[(0,m.jsx)(`mesh`,{material:a,scale:1.14,children:(0,m.jsx)(`sphereGeometry`,{args:[h,64,48]})}),(0,m.jsx)(`mesh`,{material:o,scale:1.022,children:(0,m.jsx)(`sphereGeometry`,{args:[h,64,48]})})]})}function w({speed:e=1,atmosphere:t=`#4fb8c4`}){let n=(0,p.useRef)(null),r=(0,p.useRef)(null),i=(0,p.useMemo)(y,[]);return c((t,i)=>{n.current&&(n.current.rotation.y+=i*.055*e),r.current&&(r.current.rotation.y+=i*.075*e)}),(0,m.jsxs)(`group`,{rotation:[0,0,.41],children:[(0,m.jsxs)(`mesh`,{ref:n,rotation:[0,-Math.PI/2-.35,0],children:[(0,m.jsx)(`sphereGeometry`,{args:[h,96,64]}),(0,m.jsx)(`meshStandardMaterial`,{map:i.map,roughness:.82,metalness:.04})]}),(0,m.jsxs)(`mesh`,{ref:r,children:[(0,m.jsx)(`sphereGeometry`,{args:[h*1.014,64,48]}),(0,m.jsx)(`meshStandardMaterial`,{color:`#ffffff`,alphaMap:i.clouds,transparent:!0,opacity:.42,depthWrite:!1,roughness:1})]}),(0,m.jsx)(C,{color:t})]})}export{w as t};
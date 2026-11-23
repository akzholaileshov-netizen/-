import{a as e,c as t,i as n,r,s as i}from"./SceneRig-BPc5LBV-.js";import{B as a,O as o,P as s,V as c,c as l,j as u,t as d}from"./index-PKaI5gil.js";var f=c(a()),p=parseInt(`187`.replace(/\D+/g,``)),m=class extends o{constructor(){super({uniforms:{time:{value:0},fade:{value:1}},vertexShader:`
      uniform float time;
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 0.5);
        gl_PointSize = size * (30.0 / -mvPosition.z) * (3.0 + sin(time + 100.0));
        gl_Position = projectionMatrix * mvPosition;
      }`,fragmentShader:`
      uniform sampler2D pointTexture;
      uniform float fade;
      varying vec3 vColor;
      void main() {
        float opacity = 1.0;
        if (fade == 1.0) {
          float d = distance(gl_PointCoord, vec2(0.5, 0.5));
          opacity = 1.0 / (1.0 + exp(16.0 * (d - 0.25)));
        }
        gl_FragColor = vec4(vColor, opacity);

        #include <tonemapping_fragment>
	      #include <${p>=154?`colorspace_fragment`:`encodings_fragment`}>
      }`})}},h=e=>new s().setFromSpherical(new u(e,Math.acos(1-Math.random()*2),Math.random()*2*Math.PI)),g=f.forwardRef(({radius:e=100,depth:t=50,count:n=5e3,saturation:r=0,factor:i=4,fade:a=!1,speed:o=1},s)=>{let c=f.useRef(null),[u,p,g]=f.useMemo(()=>{let a=[],o=[],s=Array.from({length:n},()=>(.5+.5*Math.random())*i),c=new l,u=e+t,d=t/n;for(let e=0;e<n;e++)u-=d*Math.random(),a.push(...h(u).toArray()),c.setHSL(e/n,r,.9),o.push(c.r,c.g,c.b);return[new Float32Array(a),new Float32Array(o),new Float32Array(s)]},[n,t,i,e,r]);d(e=>c.current&&(c.current.uniforms.time.value=e.clock.elapsedTime*o));let[_]=f.useState(()=>new m);return f.createElement(`points`,{ref:s},f.createElement(`bufferGeometry`,null,f.createElement(`bufferAttribute`,{attach:`attributes-position`,args:[u,3]}),f.createElement(`bufferAttribute`,{attach:`attributes-color`,args:[p,3]}),f.createElement(`bufferAttribute`,{attach:`attributes-size`,args:[g,1]})),f.createElement(`primitive`,{ref:c,object:_,attach:`material`,blending:2,"uniforms-fade-value":a,depthWrite:!1,transparent:!0,vertexColors:!0}))}),_=[[-1.5,2.1,1.7,1.25],[1.3,2.7,2.6,1.15],[-1.2,.5,1.5,1.4],[-1.5,-1.5,1.35,1.8],[.5,-.9,1.7,1.7],[1.6,-3,2.7,1.15]];function v(e,t){let r=-4;for(let[n,i,a,o]of _){let s=(e-n)/a,c=(t-i)/o;r=Math.max(r,1-(s*s+c*c))}let i=(e-3.5)/3,a=(t-.55)/.95,o=1-(i*i+a*a);return o>0&&(r-=o*1.7),r+(n(e*.9+11.3,t*.9-4.2,3.7,4)-.5)*.75}var y=(t,n,r,i)=>{i[0]=e(t[0],n[0],r),i[1]=e(t[1],n[1],r),i[2]=e(t[2],n[2],r)},b=[34,142,140],x=[13,78,104],S=[5,32,54],C=[217,186,112],w=[52,110,62],T=[178,126,68],E=[150,78,44],D=[122,104,88];function O(e,r,i,a){let o=1-Math.abs(n(r*1.15+7.7,i*1.15,a*1.15-3.1,3)*2-1);return t(.84,.995,o)*t(.12,.35,e)}function k(e,n,a,o,s){let c=i(n*3.1,a*3.1,o*3.1);if(e<=0){let t=r(-e/.9);t<.3?y(b,x,t/.3,s):y(x,S,(t-.3)/.7,s);let n=.92+c*.16;s[0]*=n,s[1]*=n,s[2]*=n;return}y(C,w,t(0,.08,e),s),y(s,T,t(.2,.6,e),s),y(s,E,t(.6,1.15,e)*.65,s),y(s,D,O(e,n,a,o)*.7,s);let l=.86+c*.28;s[0]*=l,s[1]*=l,s[2]*=l}export{g as i,v as n,O as r,k as t};
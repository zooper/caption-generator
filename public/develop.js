/* ============================================================================
   Darkroom develop engine v2 — non-destructive WebGL adjustments, B&W-first.

   Multi-pass pipeline (WebGL1 + FBOs):
     prog1  source -> FBO_A   tone, WB, B&W channel-mix, split-tone, curve LUT,
                              and geometry (crop / straighten / rotate / flip)
     blur   FBO_A  -> FBO_C   separable Gaussian (for clarity / texture / sharpen)
     final  FBO_A+FBO_C -> canvas   clarity, texture, sharpen, grain, vignette

   window.drDevelop: load({src,fileId}), getEdited(), reset(), set(name,val),
   getAdjustments(), applyAdjustments(obj). Edited pixels are pushed to the page
   via window.setEditedImage (debounced) and per-file edits persist in edit_stacks.
   ============================================================================ */
(function () {
  'use strict';

  // numeric adjustment keys (slider data-adj names) + their defaults
  var DEFAULTS = {
    exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
    temp: 0, tint: 0, vibrance: 0, saturation: 0,
    bwRed: 0, bwOrange: 0, bwYellow: 0, bwGreen: 0, bwAqua: 0, bwBlue: 0, bwPurple: 0, bwMagenta: 0,
    mixHueRed: 0, mixHueOrange: 0, mixHueYellow: 0, mixHueGreen: 0, mixHueAqua: 0, mixHueBlue: 0, mixHuePurple: 0, mixHueMagenta: 0,
    mixSatRed: 0, mixSatOrange: 0, mixSatYellow: 0, mixSatGreen: 0, mixSatAqua: 0, mixSatBlue: 0, mixSatPurple: 0, mixSatMagenta: 0,
    mixLumRed: 0, mixLumOrange: 0, mixLumYellow: 0, mixLumGreen: 0, mixLumAqua: 0, mixLumBlue: 0, mixLumPurple: 0, mixLumMagenta: 0,
    clarity: 0, texture: 0, sharpen: 0, grain: 0, grainSize: 40, dehaze: 0, noise: 0,
    splitShadowHue: 210, splitShadowSat: 0, splitMidHue: 280, splitMidSat: 0, splitHighlightHue: 40, splitHighlightSat: 0,
    vignette: 0,
    // geometry
    cropX: 0, cropY: 0, cropW: 1, cropH: 1, straighten: 0, rotate90: 0, flipH: 0, flipV: 0,
  };
  var NUM_KEYS = Object.keys(DEFAULTS);
  // Colour Mixer hue bands, in the same order as the shader's hue-weight centres.
  var MIX_BANDS = ['Red', 'Orange', 'Yellow', 'Green', 'Aqua', 'Blue', 'Purple', 'Magenta'];

  function defaults() {
    var a = {}; NUM_KEYS.forEach(function (k) { a[k] = DEFAULTS[k]; });
    a.bw = 0; a.curve = [[0, 0], [1, 1]];
    a.curveR = [[0, 0], [1, 1]]; a.curveG = [[0, 0], [1, 1]]; a.curveB = [[0, 0], [1, 1]];
    return a;
  }

  var VERT = 'attribute vec2 p; varying vec2 v_uv; void main(){ v_uv=(p+1.0)*0.5; gl_Position=vec4(p,0.0,1.0); }';

  // ---- Pass 1: tone / colour / B&W / split-tone / curve / geometry ----
  var FRAG1 = [
    'precision highp float;',
    'varying vec2 v_uv;',
    'uniform sampler2D u_img; uniform sampler2D u_lut;',
    'uniform float exposure,contrast,highlights,shadows,whites,blacks,temp,tint,vibrance,saturation;',
    'uniform float bw,bwRed,bwOrange,bwYellow,bwGreen,bwAqua,bwBlue,bwPurple,bwMagenta;',
    'uniform float mixHue[8],mixSat[8],mixLum[8];',   // per-hue Colour Mixer (HSL)
    'uniform float ssHue,ssSat,mtHue,mtSat,shHue,shSat;',   // colour grading: shadows / midtones / highlights
    'uniform vec4 uCrop; uniform float uStraighten,uRot,uInAspect; uniform vec2 uFlip;',
    'const vec3 LUM=vec3(0.2126,0.7152,0.0722);',  // Rec.709 luma
    'vec2 rot2(vec2 c,float a){ float s=sin(a),co=cos(a); return mat2(co,-s,s,co)*c; }',
    'vec2 srcUV(vec2 uv){',
    '  vec2 p = uCrop.xy + uv*uCrop.zw;',           // into the (possibly rotated) frame
    '  vec2 c = p-0.5; c.x*=uInAspect; c=rot2(c,uStraighten); c.x/=uInAspect; p=c+0.5;',
    '  if(uFlip.x>0.5) p.x=1.0-p.x; if(uFlip.y>0.5) p.y=1.0-p.y;',
    '  if(uRot>0.5){ vec2 q=p-0.5; if(uRot<1.5)q=vec2(q.y,-q.x); else if(uRot<2.5)q=-q; else q=vec2(-q.y,q.x); p=q+0.5; }',
    '  return p;',
    '}',
    'float hueOf(vec3 c){ float mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b)),d=mx-mn; if(d<1e-4)return 0.0;',
    '  float h; if(mx==c.r)h=mod((c.g-c.b)/d,6.0); else if(mx==c.g)h=(c.b-c.r)/d+2.0; else h=(c.r-c.g)/d+4.0; return h/6.0; }',
    'float hw(float h,float c){ float d=abs(fract(h-c+0.5)-0.5); return max(0.0,1.0-d/0.0833); }',
    'vec3 hue2rgb(float h){ return clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0); }',
    'vec3 rgb2hsl(vec3 c){ float mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b)),d=mx-mn; float L=(mx+mn)*0.5; float H=0.0,S=0.0;',
    '  if(d>1e-5){ S = L>0.5 ? d/(2.0-mx-mn) : d/(mx+mn); if(mx==c.r)H=mod((c.g-c.b)/d,6.0); else if(mx==c.g)H=(c.b-c.r)/d+2.0; else H=(c.r-c.g)/d+4.0; H/=6.0; } return vec3(H,S,L); }',
    'float h2c(float p,float q,float t){ if(t<0.0)t+=1.0; if(t>1.0)t-=1.0; if(t<0.16667)return p+(q-p)*6.0*t; if(t<0.5)return q; if(t<0.66667)return p+(q-p)*(0.66667-t)*6.0; return p; }',
    'vec3 hsl2rgb(vec3 hsl){ float H=hsl.x,S=hsl.y,L=hsl.z; if(S<1e-5)return vec3(L); float q=L<0.5?L*(1.0+S):L+S-L*S; float p=2.0*L-q; return vec3(h2c(p,q,H+0.33333),h2c(p,q,H),h2c(p,q,H-0.33333)); }',
    'void main(){',
    '  vec3 c = texture2D(u_img, srcUV(v_uv)).rgb;',
    '  c = pow(pow(c,vec3(2.2))*pow(2.0,exposure*0.02),vec3(1.0/2.2));',  // exposure
    '  c.r += temp*0.0016; c.b -= temp*0.0016;',
    '  c.r -= tint*0.0006; c.g += tint*0.0012; c.b -= tint*0.0006;',
    '  float bp=blacks*0.0012, wp=max(1.0+whites*0.0016, bp+0.05); c=(c-bp)/(wp-bp);',  // guard: wp>bp so this can never blow up
    '  float l=dot(clamp(c,0.0,1.0),LUM);',
    '  c += shadows*0.0016*(1.0-smoothstep(0.0,0.5,l)) + highlights*0.0016*smoothstep(0.5,1.0,l);',
    '  c = (c-0.5)*(1.0+contrast*0.01)+0.5;',
    '  c = clamp(c,0.0,1.0);',  // settle to display range before colour grading so saturation/hue/split-tone work on sane values
    '  if(bw>0.5){',
    '    float mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b)); float s=mx<=0.0?0.0:(mx-mn)/mx; float h=hueOf(c);',
    '    float g=dot(clamp(c,0.0,1.0),LUM);',
    '    float adj=bwRed*hw(h,0.0)+bwOrange*hw(h,0.083)+bwYellow*hw(h,0.166)+bwGreen*hw(h,0.333)+bwAqua*hw(h,0.5)+bwBlue*hw(h,0.666)+bwPurple*hw(h,0.78)+bwMagenta*hw(h,0.888);',
    '    g *= (1.0+(adj*0.01)*s); c=vec3(clamp(g,0.0,1.0));',
    '  } else {',
    '    float lum=dot(clamp(c,0.0,1.0),LUM); c=mix(vec3(lum),c,1.0+saturation*0.01);',
    '    float mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b)); c=mix(vec3(lum),c,1.0+(vibrance*0.012)*(1.0-(mx-mn)));',
    '    vec3 hsl=rgb2hsl(clamp(c,0.0,1.0)); float hh=hsl.x;',  // per-hue Colour Mixer
    '    float w0=hw(hh,0.0),w1=hw(hh,0.083),w2=hw(hh,0.166),w3=hw(hh,0.333),w4=hw(hh,0.5),w5=hw(hh,0.666),w6=hw(hh,0.78),w7=hw(hh,0.888);',
    '    float wH=mixHue[0]*w0+mixHue[1]*w1+mixHue[2]*w2+mixHue[3]*w3+mixHue[4]*w4+mixHue[5]*w5+mixHue[6]*w6+mixHue[7]*w7;',
    '    float wS=mixSat[0]*w0+mixSat[1]*w1+mixSat[2]*w2+mixSat[3]*w3+mixSat[4]*w4+mixSat[5]*w5+mixSat[6]*w6+mixSat[7]*w7;',
    '    float wL=mixLum[0]*w0+mixLum[1]*w1+mixLum[2]*w2+mixLum[3]*w3+mixLum[4]*w4+mixLum[5]*w5+mixLum[6]*w6+mixLum[7]*w7;',
    '    hsl.x=fract(hsl.x+wH*0.0009); hsl.y=clamp(hsl.y*(1.0+wS*0.01),0.0,1.0); hsl.z=clamp(hsl.z*(1.0+wL*0.006),0.0,1.0);',
    '    c=hsl2rgb(hsl);',
    '  }',
    '  float lum2=dot(clamp(c,0.0,1.0),LUM);',                          // colour grading (shadows/mid/highlights)
    '  c += (hue2rgb(ssHue/360.0)-0.5)*(ssSat*0.006)*(1.0-smoothstep(0.0,0.6,lum2));',
    '  c += (hue2rgb(mtHue/360.0)-0.5)*(mtSat*0.006)*(1.0-smoothstep(0.0,0.5,abs(lum2-0.5)));',
    '  c += (hue2rgb(shHue/360.0)-0.5)*(shSat*0.006)*smoothstep(0.4,1.0,lum2);',
    '  c = clamp(c,0.0,1.0);',
    '  c = vec3(texture2D(u_lut,vec2(c.r,0.5)).r, texture2D(u_lut,vec2(c.g,0.5)).g, texture2D(u_lut,vec2(c.b,0.5)).b);', // tone curve: R/G/B columns hold master->per-channel composite
    '  gl_FragColor = vec4(c,1.0);',
    '}',
  ].join('\n');

  // ---- separable Gaussian blur ----
  var FRAGBLUR = [
    'precision highp float; varying vec2 v_uv; uniform sampler2D u_img; uniform vec2 u_dir;',
    'void main(){ vec3 s=texture2D(u_img,v_uv).rgb*0.227;',
    '  s+=texture2D(u_img,v_uv+u_dir*1.385).rgb*0.316; s+=texture2D(u_img,v_uv-u_dir*1.385).rgb*0.316;',
    '  s+=texture2D(u_img,v_uv+u_dir*3.231).rgb*0.070; s+=texture2D(u_img,v_uv-u_dir*3.231).rgb*0.070;',
    '  gl_FragColor=vec4(s,1.0); }',
  ].join('\n');

  // ---- Final: clarity / texture / sharpen / grain / vignette ----
  var FRAGFINAL = [
    'precision highp float; varying vec2 v_uv;',
    'uniform sampler2D u_base; uniform sampler2D u_blur;',
    'uniform float clarity,texture_,sharpen,grain,grainSize,vignette,dehaze,noise,seed,uAspect;',
    'const vec3 LUM=vec3(0.2126,0.7152,0.0722);',  // Rec.709 luma
    'float rnd(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }',
    'void main(){',
    '  vec3 base=texture2D(u_base,v_uv).rgb; vec3 blur=texture2D(u_blur,v_uv).rgb;',
    '  vec3 detail=base-blur;',
    '  vec3 c = base + detail*(clarity*0.012) + detail*(texture_*0.010) + detail*(sharpen*0.02);',
    '  float nrf = 1.0 - smoothstep(0.0, 0.07, length(detail));',                  // flat (low-detail) regions
    '  c = mix(c, blur, clamp(noise*0.01,0.0,1.0)*nrf);',                          // luminance noise reduction (preview-grade)
    '  float dz = dehaze*0.01;',                                                   // dehaze: local contrast + saturation + gentle black pull
    '  c += detail*(dz*1.6); float lz=dot(clamp(c,0.0,1.0),LUM); c=mix(vec3(lz),c,1.0+dz*0.7); c-=dz*0.018*(1.0-smoothstep(0.0,0.35,lz));',
    '  c = clamp(c,0.0,1.0);',  // clamp detail boost before grain/vignette so noise + darkening act on display-range signal
    '  if(grain>0.0){ float n=rnd(v_uv*grainSize*6.0+seed)-0.5; c += n*(grain*0.0032); }',
    '  if(abs(vignette)>0.0){ vec2 q=(v_uv-0.5)*vec2(uAspect,1.0); float d=length(q)/(0.5*sqrt(uAspect*uAspect+1.0)); c *= 1.0 - (vignette*0.006)*smoothstep(0.35,1.0,d); }',  // aspect-correct: circular in pixels, reaches all corners evenly
    '  gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);',
    '}',
  ].join('\n');

  var canvas, gl, baseImage = null, ready = false, fileId = null;
  var adj = defaults();
  var prog1, progBlur, progFinal, srcTex, lutTex, fboA, fboB, fboC, quad;
  var pushTimer = null, saveTimer = null, seed = 0.137, cropMode = false, pendCrop = null, exporting = false, comparing = false;
  var history = [], headSeq = -1, lastLabel = 'Adjust';  // edit history (undo/redo + History panel)
  var clipboard = null, compareSaved = null;             // copy/paste settings + before/after compare

  // Pretty label for a history step, from the control that changed.
  var ADJ_LABELS = {
    exposure: 'Exposure', contrast: 'Contrast', highlights: 'Highlights', shadows: 'Shadows',
    whites: 'Whites', blacks: 'Blacks', temp: 'Temp', tint: 'Tint', vibrance: 'Vibrance',
    saturation: 'Saturation', clarity: 'Clarity', texture: 'Texture', sharpen: 'Sharpen',
    grain: 'Grain', grainSize: 'Grain Size', vignette: 'Vignette', straighten: 'Straighten',
    dehaze: 'Dehaze', noise: 'Noise Reduction',
    splitShadowHue: 'Color Grading', splitShadowSat: 'Color Grading', splitMidHue: 'Color Grading', splitMidSat: 'Color Grading',
    splitHighlightHue: 'Color Grading', splitHighlightSat: 'Color Grading',
  };
  function labelFor(k) { return (k && k.indexOf('bw') === 0) ? 'B&W Mix' : (ADJ_LABELS[k] || 'Adjust'); }

  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('develop shader:', gl.getShaderInfoLog(s), src); return null; } return s; }
  function prog(fs) { var v = sh(gl.VERTEX_SHADER, VERT), f = sh(gl.FRAGMENT_SHADER, fs); if (!v || !f) return null; var p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error('develop link:', gl.getProgramInfoLog(p)); return null; } return p; }
  function newTex() { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); return t; }
  function makeFBO(w, h) { var t = newTex(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { fb: f, tex: t, w: w, h: h }; }

  function initGL() {
    canvas = document.getElementById('developCanvas'); if (!canvas) return false;
    var opts = { preserveDrawingBuffer: true }; // so toDataURL/drawImage capture reliably after a debounce
    gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts); if (!gl) { console.warn('develop: no WebGL'); return false; }
    prog1 = prog(FRAG1); progBlur = prog(FRAGBLUR); progFinal = prog(FRAGFINAL);
    if (!prog1 || !progBlur || !progFinal) return false;
    quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    srcTex = newTex();
    lutTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, lutTex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return true;
  }

  // Sort curve points by x (a valid [[0,0],[1,1]] line if missing/short).
  function sortCurve(c) { return (c && c.length >= 2) ? c.slice().sort(function (a, b) { return a[0] - b[0]; }) : [[0, 0], [1, 1]]; }
  // Piecewise-linear sample of a sorted curve at x in [0,1].
  function sampleCurve(p, x) {
    var y = p[0][1];
    for (var j = 0; j < p.length - 1; j++) {
      if (x >= p[j][0] && x <= p[j + 1][0]) {
        var t = (p[j + 1][0] - p[j][0]) > 1e-6 ? (x - p[j][0]) / (p[j + 1][0] - p[j][0]) : 0;
        return p[j][1] + t * (p[j + 1][1] - p[j][1]);
      }
      if (x > p[j + 1][0]) y = p[j + 1][1];
    }
    return y;
  }
  function uploadLUT() {
    // One 256x1 RGBA LUT whose R/G/B columns each hold the master curve composed
    // with that channel's curve: out = channel(master(x)). Identity channel curves
    // make all three columns equal (= the old single-curve behaviour).
    var M = sortCurve(adj.curve), R = sortCurve(adj.curveR), G = sortCurve(adj.curveG), B = sortCurve(adj.curveB);
    var clamp8 = function (y) { return Math.max(0, Math.min(255, Math.round(y * 255))); };
    var lut = new Uint8Array(256 * 4);
    for (var i = 0; i < 256; i++) {
      var m = sampleCurve(M, i / 255);
      lut[i * 4] = clamp8(sampleCurve(R, m));
      lut[i * 4 + 1] = clamp8(sampleCurve(G, m));
      lut[i * 4 + 2] = clamp8(sampleCurve(B, m));
      lut[i * 4 + 3] = 255;
    }
    gl.bindTexture(gl.TEXTURE_2D, lutTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, lut);
  }

  function drawQuad() { gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
  function u(p, n) { return gl.getUniformLocation(p, n); }

  function render() {
    if (!ready || !baseImage) return;
    var W = canvas.width, H = canvas.height;
    // pass 1 -> A
    gl.useProgram(prog1);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboA.fb); gl.viewport(0, 0, W, H);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, srcTex); gl.uniform1i(u(prog1, 'u_img'), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, lutTex); gl.uniform1i(u(prog1, 'u_lut'), 1);
    ['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks', 'temp', 'tint', 'vibrance', 'saturation',
      'bwRed', 'bwOrange', 'bwYellow', 'bwGreen', 'bwAqua', 'bwBlue', 'bwPurple', 'bwMagenta']
      .forEach(function (k) { gl.uniform1f(u(prog1, k), adj[k] || 0); });
    gl.uniform1f(u(prog1, 'bw'), adj.bw ? 1 : 0);
    // per-hue Colour Mixer arrays (8 bands, in shader band order)
    gl.uniform1fv(u(prog1, 'mixHue[0]'), new Float32Array(MIX_BANDS.map(function (b) { return adj['mixHue' + b] || 0; })));
    gl.uniform1fv(u(prog1, 'mixSat[0]'), new Float32Array(MIX_BANDS.map(function (b) { return adj['mixSat' + b] || 0; })));
    gl.uniform1fv(u(prog1, 'mixLum[0]'), new Float32Array(MIX_BANDS.map(function (b) { return adj['mixLum' + b] || 0; })));
    gl.uniform1f(u(prog1, 'ssHue'), adj.splitShadowHue); gl.uniform1f(u(prog1, 'ssSat'), adj.splitShadowSat);
    gl.uniform1f(u(prog1, 'mtHue'), adj.splitMidHue); gl.uniform1f(u(prog1, 'mtSat'), adj.splitMidSat);
    gl.uniform1f(u(prog1, 'shHue'), adj.splitHighlightHue); gl.uniform1f(u(prog1, 'shSat'), adj.splitHighlightSat);
    if (cropMode) gl.uniform4f(u(prog1, 'uCrop'), 0, 0, 1, 1); // crop mode previews the full frame
    else gl.uniform4f(u(prog1, 'uCrop'), adj.cropX, adj.cropY, adj.cropW, adj.cropH);
    gl.uniform1f(u(prog1, 'uStraighten'), (adj.straighten || 0) * Math.PI / 180);
    gl.uniform1f(u(prog1, 'uRot'), adj.rotate90 || 0);
    gl.uniform1f(u(prog1, 'uInAspect'), (baseImage.naturalWidth || baseImage.width) / (baseImage.naturalHeight || baseImage.height));
    gl.uniform2f(u(prog1, 'uFlip'), adj.flipH ? 1 : 0, adj.flipV ? 1 : 0);
    drawQuad();
    // blur A -> B (H) -> C (V)
    gl.useProgram(progBlur);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboB.fb); gl.viewport(0, 0, W, H);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fboA.tex); gl.uniform1i(u(progBlur, 'u_img'), 0);
    gl.uniform2f(u(progBlur, 'u_dir'), 1.4 / W, 0); drawQuad();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboC.fb);
    gl.bindTexture(gl.TEXTURE_2D, fboB.tex); gl.uniform2f(u(progBlur, 'u_dir'), 0, 1.4 / H); drawQuad();
    // final A + C -> canvas
    gl.useProgram(progFinal);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fboA.tex); gl.uniform1i(u(progFinal, 'u_base'), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, fboC.tex); gl.uniform1i(u(progFinal, 'u_blur'), 1);
    gl.uniform1f(u(progFinal, 'clarity'), adj.clarity); gl.uniform1f(u(progFinal, 'texture_'), adj.texture);
    gl.uniform1f(u(progFinal, 'sharpen'), adj.sharpen); gl.uniform1f(u(progFinal, 'grain'), adj.grain);
    gl.uniform1f(u(progFinal, 'grainSize'), adj.grainSize); gl.uniform1f(u(progFinal, 'vignette'), adj.vignette);
    gl.uniform1f(u(progFinal, 'dehaze'), adj.dehaze || 0); gl.uniform1f(u(progFinal, 'noise'), adj.noise || 0);
    gl.uniform1f(u(progFinal, 'seed'), seed);
    gl.uniform1f(u(progFinal, 'uAspect'), W / H);
    drawQuad();
    schedulePush();
  }

  function outDims(max) {
    max = max || 2048;
    var iw = baseImage.naturalWidth || baseImage.width, ih = baseImage.naturalHeight || baseImage.height;
    var cw = iw * (cropMode ? 1 : (adj.cropW || 1)), ch = ih * (cropMode ? 1 : (adj.cropH || 1));
    if ((adj.rotate90 || 0) % 2 === 1) { var t = cw; cw = ch; ch = t; }
    var scale = Math.min(1, max / Math.max(cw, ch));
    return { w: Math.max(1, Math.round(cw * scale)), h: Math.max(1, Math.round(ch * scale)) };
  }
  function uploadTex(img) { gl.bindTexture(gl.TEXTURE_2D, srcTex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); }
  function allocFBOs(w, h) { fboA = makeFBO(w, h); fboB = makeFBO(w, h); fboC = makeFBO(w, h); }
  function loadImg(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }

  function setBaseImage(img) {
    baseImage = img;
    gl.bindTexture(gl.TEXTURE_2D, srcTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    sizeCanvas();
    var pv = document.getElementById('previewImage'); if (pv) pv.classList.add('hidden');
    canvas.classList.remove('hidden');
    uploadLUT(); render();
  }
  function sizeCanvas() {
    if (!baseImage) return;
    var d = outDims();
    if (canvas.width !== d.w || canvas.height !== d.h || !fboA) {
      canvas.width = d.w; canvas.height = d.h;
      fboA = makeFBO(d.w, d.h); fboB = makeFBO(d.w, d.h); fboC = makeFBO(d.w, d.h);
    }
  }

  /* ---- push edited pixels + persist ---- */
  function authHeaders() { var t = localStorage.getItem('auth_token'); var h = { 'Content-Type': 'application/json' }; if (t) h.Authorization = 'Bearer ' + t; return h; }
  function schedulePush() {
    if (exporting || comparing) return; // don't push transient export/compare frames
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { try { if (window.setEditedImage) window.setEditedImage(canvas.toDataURL('image/jpeg', 0.92).split(',')[1]); } catch (e) {} }, 220);
  }
  // Record a history step for a USER edit (debounced; rapid moves coalesce under
  // one label). Programmatic renders (load, undo/redo, jump) never call this.
  function scheduleSave(label) {
    if (!fileId) return;
    if (label) lastLabel = label;
    clearTimeout(saveTimer); saveTimer = setTimeout(saveEdits, 600);
  }
  function adjIsDefault() {
    var d = defaults();
    for (var k in d) {
      if (k.indexOf('curve') === 0) { if (JSON.stringify(adj[k]) !== JSON.stringify(d[k])) return false; }
      else if (adj[k] !== d[k]) return false;
    }
    return true;
  }
  function makeThumbB64() {
    var w = canvas.width, h = canvas.height, s = Math.min(1, 480 / Math.max(w, h));
    var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
    c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82).split(',')[1];
  }
  function pushThumb(id) {
    try { fetch('/api/library/' + id + '/thumb', { method: 'PUT', headers: authHeaders(), credentials: 'include', body: JSON.stringify({ imageData: makeThumbB64() }) }).catch(function () {}); } catch (e) {}
  }
  // Persist the current edit as a new history step (server maintains HEAD,
  // edit_stacks and the XMP sidecar). Appends after the current head, dropping
  // any redo tail.
  function saveEdits() {
    if (!fileId) return;
    var id = fileId;
    fetch('/api/library/' + id + '/history', {
      method: 'POST', headers: authHeaders(), credentials: 'include',
      body: JSON.stringify({ adjustments: adj, label: lastLabel, baseSeq: headSeq }),
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (h) {
        if (!h || fileId !== id) return;
        history = h.steps || []; headSeq = (h.head != null ? h.head : -1);
        renderHistory();
        pushThumb(id);
      }).catch(function () {});
  }

  /* ---- edit history (undo / redo / jump) ---- */
  function loadHistory() {
    var id = fileId;
    fetch('/api/library/' + id + '/history', { headers: authHeaders(), credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (h) {
        if (!h || fileId !== id) return;
        history = h.steps || []; headSeq = (h.head != null ? h.head : -1);
        var cur = null; for (var i = 0; i < history.length; i++) if (history[i].seq === headSeq) cur = history[i];
        api.applyAdjustments(cur && cur.adjustments ? cur.adjustments : {});
        renderHistory();
        // Keep the grid thumbnail in sync with the actual develop: if this image
        // has edits, regenerate the edited thumbnail now (otherwise the grid can
        // show the un-edited embedded preview while Develop shows the edit).
        if (!adjIsDefault()) pushThumb(id);
      }).catch(function () {});
  }
  function gotoSeq(seq) {
    if (!fileId || seq === headSeq) return;
    var id = fileId;
    fetch('/api/library/' + id + '/history/head', { method: 'PUT', headers: authHeaders(), credentials: 'include', body: JSON.stringify({ seq: seq }) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || fileId !== id) return;
        headSeq = d.head;
        api.applyAdjustments(d.adjustments || {});
        renderHistory();
        pushThumb(id);
      }).catch(function () {});
  }
  function headIndex() { for (var i = 0; i < history.length; i++) if (history[i].seq === headSeq) return i; return -1; }
  function undo() { var i = headIndex(); if (i > 0) gotoSeq(history[i - 1].seq); }
  function redo() { var i = headIndex(); if (i >= 0 && i < history.length - 1) gotoSeq(history[i + 1].seq); }
  function renderHistory() {
    var el = document.getElementById('devHistory');
    if (el) {
      el.innerHTML = '';
      for (var i = history.length - 1; i >= 0; i--) { // newest first (LR-style)
        var s = history[i];
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'dr-hist' + (s.seq === headSeq ? ' active' : '');
        b.textContent = s.label || 'Edit';
        (function (seq) { b.addEventListener('click', function () { gotoSeq(seq); }); })(s.seq);
        el.appendChild(b);
      }
    }
    var i2 = headIndex();
    var u = document.getElementById('devUndo'), r = document.getElementById('devRedo');
    if (u) u.disabled = !(i2 > 0);
    if (r) r.disabled = !(i2 >= 0 && i2 < history.length - 1);
  }

  /* ---- controls <-> adjustments ---- */
  function syncControls() {
    document.querySelectorAll('#developBody input[data-adj]').forEach(function (inp) {
      var k = inp.getAttribute('data-adj'); inp.value = adj[k] != null ? adj[k] : (DEFAULTS[k] || 0);
      var out = document.getElementById(inp.id + 'Out'); if (out) out.textContent = inp.value;
    });
    var bwBtn = document.getElementById('devBW');
    if (bwBtn) { bwBtn.setAttribute('aria-checked', adj.bw ? 'true' : 'false'); bwBtn.classList.toggle('on', !!adj.bw); }
    var body = document.getElementById('developBody'); if (body) body.classList.toggle('is-bw', !!adj.bw);
    var fh = document.getElementById('devFlipH'); if (fh) fh.classList.toggle('on', !!adj.flipH);
    var fv = document.getElementById('devFlipV'); if (fv) fv.classList.toggle('on', !!adj.flipV);
    if (window.drCurve) window.drCurve.setPoints(adj.curve);
  }

  var api = {
    load: function (opts) {
      opts = opts || {}; fileId = opts.fileId || null; adj = defaults();
      history = []; headSeq = -1; renderHistory();
      seed = 0.05 + ((opts.fileId || '').length % 13) * 0.07;
      syncControls();
      var img = new Image();
      img.onload = function () { setBaseImage(img); if (fileId) loadHistory(); };
      img.onerror = function () { console.warn('develop: image load failed'); };
      img.src = opts.src;
    },
    getEdited: function () { try { return ready && baseImage ? canvas.toDataURL('image/jpeg', 0.92) : null; } catch (e) { return null; } },
    getAdjustments: function () { return JSON.parse(JSON.stringify(adj)); },
    reset: function () {
      // Clear adjustments immediately for snappy feedback…
      adj = defaults(); syncControls(); sizeCanvas(); uploadLUT(); render();
      if (!fileId) return;
      var id = fileId;
      // …then persist the reset: clears edits/history and switches this raw to
      // the flat COLOUR demosaic on the server, and reload the colour base.
      fetch('/api/library/' + id + '/reset', { method: 'POST', headers: authHeaders(), credentials: 'include' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (ok) {
          if (!ok || fileId !== id) return;
          history = []; headSeq = -1; renderHistory();
          return fetch('/api/library/' + id + '/proxy?v=' + Date.now(), { headers: authHeaders(), credentials: 'include' })
            .then(function (r) { return r.ok ? r.blob() : null; })
            .then(function (b) {
              if (!b || fileId !== id) return;
              var url = URL.createObjectURL(b);
              var img = new Image();
              img.onload = function () { setBaseImage(img); try { URL.revokeObjectURL(url); } catch (e) {} };
              img.src = url;
            });
        }).catch(function () {});
    },
    set: function (k, v) { adj[k] = v; if (k === 'cropW' || k === 'cropH' || k === 'rotate90') sizeCanvas(); render(); },
    applyAdjustments: function (obj) {
      adj = defaults();
      Object.keys(obj || {}).forEach(function (k) { if (k in adj || k === 'bw' || k === 'curve') adj[k] = obj[k]; });
      ['curve', 'curveR', 'curveG', 'curveB'].forEach(function (k) { if (!adj[k] || adj[k].length < 2) adj[k] = [[0, 0], [1, 1]]; });
      syncControls(); sizeCanvas(); uploadLUT(); render();
    },
    undo: undo, redo: redo,
  };

  // Re-run the exact edit pipeline at a higher resolution, then restore the proxy.
  function renderAt(srcImg, target) {
    exporting = true;
    var savedBase = baseImage, savedW = canvas.width, savedH = canvas.height;
    baseImage = srcImg; uploadTex(srcImg);
    var d = outDims(target); canvas.width = d.w; canvas.height = d.h; allocFBOs(d.w, d.h); render();
    var out = canvas.toDataURL('image/jpeg', 0.92);
    baseImage = savedBase; uploadTex(savedBase); canvas.width = savedW; canvas.height = savedH; allocFBOs(savedW, savedH); render();
    exporting = false;
    return out;
  }

  window.exportImage = async function () {
    if (!ready || !baseImage) {
      var pv = document.getElementById('previewImage'); var s = pv && pv.getAttribute('src');
      if (!s) { if (window.showError) showError('Load a photo first', 'Export'); return; }
    }
    var sel = document.getElementById('exportSize');
    var choice = sel ? sel.value : '2048';
    var target = choice === 'full' ? 8192 : parseInt(choice, 10) || 2048;
    var id = window.getLibraryFileId && window.getLibraryFileId();
    var curLong = Math.max(canvas.width, canvas.height);
    var dataUrl;
    try {
      if (target <= curLong || !baseImage) {
        dataUrl = api.getEdited();
      } else if (id) {
        // library file: fetch a higher-res decode and render the edit at that size
        var blob = await fetch('/api/library/' + id + '/full?size=' + target, { headers: authHeaders(), credentials: 'include' }).then(function (r) { return r.ok ? r.blob() : null; });
        dataUrl = blob ? renderAt(await loadImg(URL.createObjectURL(blob)), target) : api.getEdited();
      } else {
        // uploaded image: the loaded source is already full-res — just re-render bigger
        dataUrl = renderAt(baseImage, target);
      }
    } catch (e) { dataUrl = api.getEdited(); }
    if (!dataUrl) { if (window.showError) showError('Could not export', 'Export'); return; }

    var name = (window.getCurrentFilename && window.getCurrentFilename()) || 'caption-studio';
    var a = document.createElement('a'); a.href = dataUrl; a.download = name.replace(/\.[^.]+$/, '') + '_edited.jpg';
    document.body.appendChild(a); a.click(); a.remove();
    if (id) {
      fetch('/api/library/' + id + '/export', { method: 'POST', headers: authHeaders(), credentials: 'include', body: JSON.stringify({ imageData: dataUrl.split(',')[1] }) })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j && window.showSuccess) showSuccess('Saved ' + j.filename + ' to exports', 'Export'); }).catch(function () {});
    } else if (window.showSuccess) { showSuccess('Downloaded edited image', 'Export'); }
  };

  /* ---- before/after compare + copy/paste settings ---- */
  // Hold to show the unedited image (adjustments off + default curve), release
  // to return to the edited result. comparing=true suppresses the page preview push.
  function showBefore() {
    if (!baseImage || comparing) return;
    comparing = true; compareSaved = adj; adj = defaults(); uploadLUT(); render(); adj = compareSaved;
  }
  function showAfter() {
    if (!comparing) return;
    comparing = false; uploadLUT(); render();
  }
  function copySettings() {
    clipboard = JSON.parse(JSON.stringify(adj));
    try { localStorage.setItem('dr_clipboard', JSON.stringify(clipboard)); } catch (e) {}
    var pb = document.getElementById('devPaste'); if (pb) pb.disabled = false;
    if (window.showSuccess) showSuccess('Settings copied', 'Develop');
  }
  function pasteSettings() {
    if (!clipboard || !fileId) return;
    api.applyAdjustments(clipboard);
    scheduleSave('Paste settings');
    if (window.showSuccess) showSuccess('Settings pasted', 'Develop');
  }

  /* ---- Auto tone ---- */
  // Analyse the (unedited) base image's luminance and set exposure + black/white
  // points for a balanced result — a starting point, like Lightroom's Auto.
  // Reads the source image directly (independent of the live edit), so it's
  // stable regardless of current adjustments.
  function autoTone() {
    if (!baseImage) return;
    var iw = baseImage.naturalWidth || baseImage.width, ih = baseImage.naturalHeight || baseImage.height;
    if (!iw || !ih) return;
    var sw = 200, sh = Math.max(1, Math.round(sw * ih / iw));
    var cv = document.createElement('canvas'); cv.width = sw; cv.height = sh;
    var ctx = cv.getContext('2d'); ctx.drawImage(baseImage, 0, 0, sw, sh);
    var data;
    try { data = ctx.getImageData(0, 0, sw, sh).data; } catch (e) { return; }
    var n = sw * sh, hist = new Array(256);
    for (var i = 0; i < 256; i++) hist[i] = 0;
    for (var p = 0; p < n; p++) {
      var L = Math.round(0.2126 * data[p * 4] + 0.7152 * data[p * 4 + 1] + 0.0722 * data[p * 4 + 2]);
      hist[L < 0 ? 0 : L > 255 ? 255 : L]++;
    }
    function pct(q) { var t = n * q, acc = 0; for (var k = 0; k < 256; k++) { acc += hist[k]; if (acc >= t) return k; } return 255; }
    var lo = pct(0.005), hi = pct(0.995), med = pct(0.5);
    var clamp = function (v) { return Math.max(-100, Math.min(100, Math.round(v))); };
    // Stretch endpoints (shader: bp=blacks*0.0012, wp=1+whites*0.0016).
    var blacks = clamp((lo / 255) / 0.0012);
    var whites = clamp(((hi / 255) - 1) / 0.0016);
    // Nudge midtone toward ~0.46 (half strength so Auto stays gentle).
    var m = Math.max(1, med) / 255;
    var exposure = clamp((Math.log(0.46 / m) / Math.log(2)) / 0.02 * 0.6);
    // Set only the tone values; leave colour/crop/detail edits intact.
    adj.exposure = exposure; adj.blacks = blacks; adj.whites = whites;
    syncControls(); render(); scheduleSave('Auto tone');
  }

  function wireControls() {
    document.querySelectorAll('#developBody input[data-adj]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var k = inp.getAttribute('data-adj'); adj[k] = +inp.value;
        var out = document.getElementById(inp.id + 'Out'); if (out) out.textContent = inp.value;
        render(); scheduleSave(labelFor(k));
      });
    });
    var bwBtn = document.getElementById('devBW');
    if (bwBtn) bwBtn.addEventListener('click', function () { adj.bw = adj.bw ? 0 : 1; syncControls(); render(); scheduleSave('Black & White'); });
    var reset = document.getElementById('devReset');
    if (reset) reset.addEventListener('click', function (e) { e.stopPropagation(); api.reset(); });
    var undoBtn = document.getElementById('devUndo'); if (undoBtn) undoBtn.addEventListener('click', undo);
    var redoBtn = document.getElementById('devRedo'); if (redoBtn) redoBtn.addEventListener('click', redo);
    // before/after (hold) + copy/paste
    try { var cb = localStorage.getItem('dr_clipboard'); if (cb) clipboard = JSON.parse(cb); } catch (e) {}
    var beforeBtn = document.getElementById('devBefore');
    if (beforeBtn) {
      beforeBtn.addEventListener('mousedown', showBefore);
      beforeBtn.addEventListener('mouseup', showAfter);
      beforeBtn.addEventListener('mouseleave', showAfter);
      beforeBtn.addEventListener('touchstart', function (e) { e.preventDefault(); showBefore(); }, { passive: false });
      beforeBtn.addEventListener('touchend', showAfter);
    }
    var autoBtn = document.getElementById('devAuto'); if (autoBtn) autoBtn.addEventListener('click', autoTone);
    var copyBtn = document.getElementById('devCopy'); if (copyBtn) copyBtn.addEventListener('click', copySettings);
    var pasteBtn = document.getElementById('devPaste'); if (pasteBtn) { pasteBtn.addEventListener('click', pasteSettings); pasteBtn.disabled = !clipboard; }
    // foldable develop sections
    document.querySelectorAll('#developBody .dr-subhead').forEach(function (h) {
      h.addEventListener('click', function () { h.parentElement.classList.toggle('collapsed'); });
    });
    // Undo/redo keyboard shortcuts (only while the Develop view is visible and
    // not typing in a field).
    document.addEventListener('keydown', function (e) {
      if (!fileId) return;
      var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      var key = (e.key || '').toLowerCase(); if (key !== 'z' && key !== 'y') return;
      var body = document.getElementById('developBody'); if (body && body.offsetParent === null) return;
      e.preventDefault();
      if (key === 'y' || e.shiftKey) redo(); else undo();
    });
    initCurveWidget();
  }

  /* ---- interactive tone-curve widget ---- */
  function initCurveWidget() {
    var cv = document.getElementById('devCurve'); if (!cv) return;
    var ctx = cv.getContext('2d'); var W = cv.width, H = cv.height, drag = -1;
    var curveKey = 'curve';                                  // active channel: curve|curveR|curveG|curveB
    var STROKE = { curve: '#9B7BFF', curveR: '#ff5b5b', curveG: '#54cc6a', curveB: '#5b9bff' };
    function pts() { if (!adj[curveKey] || adj[curveKey].length < 2) adj[curveKey] = [[0, 0], [1, 1]]; return adj[curveKey]; }
    function toPx(p) { return [p[0] * W, H - p[1] * H]; }
    function toNorm(x, y) { return [Math.max(0, Math.min(1, x / W)), Math.max(0, Math.min(1, 1 - y / H))]; }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
      for (var i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(W * i / 4, 0); ctx.lineTo(W * i / 4, H); ctx.moveTo(0, H * i / 4); ctx.lineTo(W, H * i / 4); ctx.stroke(); }
      var p = pts().slice().sort(function (a, b) { return a[0] - b[0]; });
      ctx.strokeStyle = STROKE[curveKey] || '#9B7BFF'; ctx.lineWidth = 2; ctx.beginPath();
      for (var x = 0; x <= W; x += 3) { var nx = x / W, ny = p[0][1]; for (var j = 0; j < p.length - 1; j++) { if (nx >= p[j][0] && nx <= p[j + 1][0]) { var t = (p[j + 1][0] - p[j][0]) > 1e-6 ? (nx - p[j][0]) / (p[j + 1][0] - p[j][0]) : 0; ny = p[j][1] + t * (p[j + 1][1] - p[j][1]); break; } if (nx > p[j + 1][0]) ny = p[j + 1][1]; } if (x === 0) ctx.moveTo(0, H - ny * H); else ctx.lineTo(x, H - ny * H); }
      ctx.stroke();
      ctx.fillStyle = '#fff'; pts().forEach(function (pt) { var px = toPx(pt); ctx.beginPath(); ctx.arc(px[0], px[1], 4, 0, 6.29); ctx.fill(); });
    }
    function hit(x, y) { for (var i = 0; i < pts().length; i++) { var px = toPx(pts()[i]); if (Math.abs(px[0] - x) < 9 && Math.abs(px[1] - y) < 9) return i; } return -1; }
    function pos(e) { var r = cv.getBoundingClientRect(); var t = e.touches ? e.touches[0] : e; return [(t.clientX - r.left) * W / r.width, (t.clientY - r.top) * H / r.height]; }
    function changed() { uploadLUT(); render(); draw(); scheduleSave(curveKey === 'curve' ? 'Tone Curve' : 'Curve ' + curveKey.slice(5)); }
    cv.addEventListener('mousedown', function (e) { var c = pts(); var pp = pos(e); drag = hit(pp[0], pp[1]); if (drag < 0) { var n = toNorm(pp[0], pp[1]); c.push(n); c.sort(function (a, b) { return a[0] - b[0]; }); drag = c.indexOf(n); changed(); } });
    window.addEventListener('mousemove', function (e) { if (drag < 0) return; var c = pts(); var pp = pos(e); var n = toNorm(pp[0], pp[1]); if (drag > 0 && drag < c.length - 1) c[drag] = n; else c[drag] = [c[drag][0], n[1]]; changed(); });
    window.addEventListener('mouseup', function () { drag = -1; });
    cv.addEventListener('dblclick', function (e) { var c = pts(); var pp = pos(e); var i = hit(pp[0], pp[1]); if (i > 0 && i < c.length - 1) { c.splice(i, 1); changed(); } });
    // channel tabs (RGB master + R/G/B)
    var tabs = document.querySelectorAll('#devCurveTabs [data-curve]');
    tabs.forEach(function (b) {
      b.addEventListener('click', function () {
        curveKey = b.getAttribute('data-curve');
        tabs.forEach(function (x) { x.classList.toggle('active', x === b); });
        draw();
      });
    });
    // setPoints() is called on load/undo/reset — return the widget to the master
    // channel and redraw against the freshly-applied adj.
    window.drCurve = { setPoints: function () { curveKey = 'curve'; tabs.forEach(function (x) { x.classList.toggle('active', x.getAttribute('data-curve') === 'curve'); }); draw(); }, redraw: draw };
    draw();
  }

  /* ---- geometry: rotate / flip / aspect + interactive crop overlay ---- */
  function wireGeometry() {
    var stage = document.querySelector('.dr-stage');
    var overlay = document.getElementById('cropOverlay'), box = document.getElementById('cropBox');
    if (!stage || !overlay || !box) return;
    var aspect = null; // null=free else pixel w/h

    function imgA() { return (baseImage.naturalWidth || baseImage.width) / (baseImage.naturalHeight || baseImage.height); }
    function centeredRect(A) { var r = A / imgA(), nW, nH; if (r <= 1) { nH = 1; nW = r; } else { nW = 1; nH = 1 / r; } return [(1 - nW) / 2, (1 - nH) / 2, nW, nH]; }
    function constrainAspect(rect, A) { var r = A / imgA(), cx = rect[0] + rect[2] / 2, cy = rect[1] + rect[3] / 2; var nW = rect[2], nH = nW / r; if (nH > 1) { nH = 1; nW = r; } if (nW > 1) { nW = 1; nH = 1 / r; } return [Math.min(Math.max(cx - nW / 2, 0), 1 - nW), Math.min(Math.max(cy - nH / 2, 0), 1 - nH), nW, nH]; }
    function canvasRect() { var cr = canvas.getBoundingClientRect(), sr = stage.getBoundingClientRect(); return { l: cr.left - sr.left, t: cr.top - sr.top, w: cr.width, h: cr.height }; }
    function positionBox() { var c = canvasRect(); box.style.left = (c.l + pendCrop[0] * c.w) + 'px'; box.style.top = (c.t + pendCrop[1] * c.h) + 'px'; box.style.width = (pendCrop[2] * c.w) + 'px'; box.style.height = (pendCrop[3] * c.h) + 'px'; }

    function on(id, ev, fn) { var el = document.getElementById(id); if (el) el.addEventListener(ev, fn); }
    on('devRotate', 'click', function () { if (!baseImage) return; adj.rotate90 = ((adj.rotate90 || 0) + 1) % 4; sizeCanvas(); render(); scheduleSave('Rotate'); });
    on('devFlipH', 'click', function (e) { adj.flipH = adj.flipH ? 0 : 1; e.currentTarget.classList.toggle('on', !!adj.flipH); render(); scheduleSave('Flip'); });
    on('devFlipV', 'click', function (e) { adj.flipV = adj.flipV ? 0 : 1; e.currentTarget.classList.toggle('on', !!adj.flipV); render(); scheduleSave('Flip'); });

    document.querySelectorAll('#devAspect .dr-aspect-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('#devAspect .dr-aspect-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        var v = b.getAttribute('data-aspect'); aspect = v === 'free' ? null : parseFloat(v);
        if (!baseImage) return;
        if (cropMode) { if (aspect) { pendCrop = constrainAspect(pendCrop, aspect); positionBox(); } }
        else if (aspect) { var r = centeredRect(aspect); adj.cropX = r[0]; adj.cropY = r[1]; adj.cropW = r[2]; adj.cropH = r[3]; sizeCanvas(); render(); scheduleSave('Crop'); }
        else { adj.cropX = 0; adj.cropY = 0; adj.cropW = 1; adj.cropH = 1; sizeCanvas(); render(); scheduleSave('Crop'); }
      });
    });

    function enterCrop() {
      cropMode = true;
      // start from the current crop (the full frame when uncropped), so "Free" begins uncropped
      pendCrop = [adj.cropX || 0, adj.cropY || 0, adj.cropW || 1, adj.cropH || 1];
      document.getElementById('devCropToggle').classList.add('on');
      overlay.classList.remove('hidden'); sizeCanvas(); render(); setTimeout(positionBox, 40);
    }
    function exitCrop(apply) {
      if (apply) { adj.cropX = pendCrop[0]; adj.cropY = pendCrop[1]; adj.cropW = pendCrop[2]; adj.cropH = pendCrop[3]; }
      cropMode = false; document.getElementById('devCropToggle').classList.remove('on');
      overlay.classList.add('hidden'); sizeCanvas(); render(); if (apply) scheduleSave('Crop');
    }
    on('devCropToggle', 'click', function () { if (cropMode) exitCrop(false); else if (baseImage) enterCrop(); });
    on('cropDone', 'click', function () { exitCrop(true); });
    on('cropCancel', 'click', function () { exitCrop(false); });

    var drag = null;
    function beginDrag(e, kind) { e.preventDefault(); var t = e.touches ? e.touches[0] : e; drag = { kind: kind, c: canvasRect(), sx: t.clientX, sy: t.clientY, rect: pendCrop.slice() }; }
    function moveDrag(e) {
      if (!drag) return; var t = e.touches ? e.touches[0] : e;
      var dx = (t.clientX - drag.sx) / drag.c.w, dy = (t.clientY - drag.sy) / drag.c.h, r = drag.rect.slice();
      if (drag.kind === 'move') { r[0] = Math.min(Math.max(r[0] + dx, 0), 1 - r[2]); r[1] = Math.min(Math.max(r[1] + dy, 0), 1 - r[3]); }
      else {
        var x0 = r[0], y0 = r[1], x1 = r[0] + r[2], y1 = r[1] + r[3];
        if (drag.kind.indexOf('w') >= 0) x0 = Math.min(Math.max(x0 + dx, 0), x1 - 0.05);
        if (drag.kind.indexOf('e') >= 0) x1 = Math.min(Math.max(x1 + dx, x0 + 0.05), 1);
        if (drag.kind.indexOf('n') >= 0) y0 = Math.min(Math.max(y0 + dy, 0), y1 - 0.05);
        if (drag.kind.indexOf('s') >= 0) y1 = Math.min(Math.max(y1 + dy, y0 + 0.05), 1);
        r = [x0, y0, x1 - x0, y1 - y0];
        if (aspect) r = constrainAspect(r, aspect);
      }
      pendCrop = r; positionBox();
    }
    box.addEventListener('mousedown', function (e) { if (e.target === box) beginDrag(e, 'move'); });
    box.querySelectorAll('.dr-crop-h').forEach(function (h) { h.addEventListener('mousedown', function (e) { e.stopPropagation(); beginDrag(e, h.getAttribute('data-h')); }); });
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', function () { drag = null; });
    window.addEventListener('resize', function () { if (cropMode) positionBox(); });
  }

  /* ---- develop presets (built-in B&W looks + saved) ---- */
  var GEOM_KEYS = ['cropX', 'cropY', 'cropW', 'cropH', 'straighten', 'rotate90', 'flipH', 'flipV'];
  var BUILTIN = [
    { name: 'B&W High Contrast', builtin: true, adjustments: { bw: 1, contrast: 35, blacks: -25, whites: 20, clarity: 35, bwRed: 20, bwBlue: -30, curve: [[0, 0], [0.25, 0.12], [0.75, 0.88], [1, 1]] } },
    { name: 'B&W Soft', builtin: true, adjustments: { bw: 1, contrast: -8, highlights: -20, shadows: 25, clarity: -10, curve: [[0, 0.08], [1, 0.92]] } },
    { name: 'B&W Film + Grain', builtin: true, adjustments: { bw: 1, contrast: 20, clarity: 18, grain: 45, grainSize: 55, vignette: 25, bwOrange: 15 } },
    { name: 'Selenium Tone', builtin: true, adjustments: { bw: 1, contrast: 18, splitShadowHue: 265, splitShadowSat: 28, splitHighlightHue: 35, splitHighlightSat: 12 } },
    { name: 'Warm Film', builtin: true, adjustments: { bw: 0, temp: 14, contrast: 12, highlights: -14, shadows: 12, vibrance: 16, splitShadowHue: 40, splitShadowSat: 14, splitHighlightHue: 50, splitHighlightSat: 10, curve: [[0, 0.06], [0.75, 0.8], [1, 0.96]] } },
    { name: 'Cool Matte', builtin: true, adjustments: { bw: 0, temp: -10, contrast: -10, blacks: 14, vibrance: -8, saturation: -6, splitShadowHue: 210, splitShadowSat: 16, curve: [[0, 0.1], [1, 0.92]] } },
    { name: 'Punchy', builtin: true, adjustments: { bw: 0, contrast: 22, clarity: 18, vibrance: 24, saturation: 6, blacks: -16, whites: 12, dehaze: 14 } },
    { name: 'Faded', builtin: true, adjustments: { bw: 0, contrast: -16, blacks: 20, highlights: -10, vibrance: -10, splitHighlightHue: 45, splitHighlightSat: 10, curve: [[0, 0.14], [1, 0.88]] } },
  ];
  var savedPresets = [];

  function lookOnly(a) { var o = {}; Object.keys(a).forEach(function (k) { if (GEOM_KEYS.indexOf(k) < 0) o[k] = a[k]; }); return o; }
  function applyPresetLook(p, name) {
    var look = p || {};
    Object.keys(look).forEach(function (k) { if (GEOM_KEYS.indexOf(k) < 0) adj[k] = (k === 'curve') ? JSON.parse(JSON.stringify(look[k])) : look[k]; });
    if (!adj.curve || adj.curve.length < 2) adj.curve = [[0, 0], [1, 1]];
    syncControls(); uploadLUT(); render(); scheduleSave(name ? ('Preset: ' + name) : 'Preset');
  }
  function renderPresets() {
    var el = document.getElementById('devPresets'); if (!el) return;
    el.innerHTML = '';
    BUILTIN.concat(savedPresets).forEach(function (p) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'dr-preset'; b.textContent = p.name;
      b.addEventListener('click', function () { applyPresetLook(p.adjustments, p.name); });
      if (!p.builtin) {
        var x = document.createElement('span'); x.textContent = ' ✕'; x.style.opacity = '.6';
        x.addEventListener('click', function (e) { e.stopPropagation(); deletePreset(p.id); });
        b.appendChild(x);
      }
      el.appendChild(b);
    });
    var add = document.createElement('button'); add.type = 'button'; add.className = 'dr-preset add'; add.textContent = '+ Save';
    add.addEventListener('click', saveCurrentPreset); el.appendChild(add);
  }
  function loadPresets() {
    fetch('/api/develop-presets', { headers: authHeaders(), credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.presets) savedPresets = d.presets; renderPresets(); })
      .catch(function () { renderPresets(); });
  }
  function saveCurrentPreset() {
    var name = window.prompt('Preset name'); if (!name) return;
    fetch('/api/develop-presets', { method: 'POST', headers: authHeaders(), credentials: 'include', body: JSON.stringify({ name: name, adjustments: lookOnly(adj) }) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && j.success) { loadPresets(); if (window.showSuccess) showSuccess('Saved preset “' + name + '”', 'Develop'); } })
      .catch(function () {});
  }
  function deletePreset(id) {
    fetch('/api/develop-presets/' + id, { method: 'DELETE', headers: authHeaders(), credentials: 'include' })
      .then(function () { loadPresets(); }).catch(function () {});
  }

  // Build the Colour Mixer sliders (Hue/Saturation/Luminance × 8 bands) into the
  // page so wireControls()/syncControls() pick them up like the static sliders.
  function buildColorMixer() {
    var host = document.getElementById('devColorMix'); if (!host) return;
    host.innerHTML = '';
    [['Hue', 'mixHue'], ['Saturation', 'mixSat'], ['Luminance', 'mixLum']].forEach(function (g) {
      var label = document.createElement('div'); label.className = 'dr-mix-grouplabel'; label.textContent = g[0];
      host.appendChild(label);
      var wrap = document.createElement('div'); wrap.className = 'dr-sliders';
      MIX_BANDS.forEach(function (band) {
        var adjKey = g[1] + band;
        var id = 'dev' + g[1].charAt(0).toUpperCase() + g[1].slice(1) + band;
        var row = document.createElement('div'); row.className = 'dr-slider-row';
        row.innerHTML = '<div class="dr-slider-label"><span>' + band + '</span><span class="dr-readout" id="' + id + 'Out">0</span></div>' +
          '<input type="range" class="dr-range" id="' + id + '" data-adj="' + adjKey + '" min="-100" max="100" value="0">';
        wrap.appendChild(row);
      });
      host.appendChild(wrap);
    });
  }

  function start() { if (!initGL()) { window.drDevelop = null; return; } ready = true; buildColorMixer(); wireControls(); wireGeometry(); renderPresets(); loadPresets(); window.drDevelop = api; }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

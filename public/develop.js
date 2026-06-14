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
    clarity: 0, texture: 0, sharpen: 0, grain: 0, grainSize: 40,
    splitShadowHue: 210, splitShadowSat: 0, splitHighlightHue: 40, splitHighlightSat: 0,
    vignette: 0,
    // geometry
    cropX: 0, cropY: 0, cropW: 1, cropH: 1, straighten: 0, rotate90: 0, flipH: 0, flipV: 0,
  };
  var NUM_KEYS = Object.keys(DEFAULTS);

  function defaults() {
    var a = {}; NUM_KEYS.forEach(function (k) { a[k] = DEFAULTS[k]; });
    a.bw = 0; a.curve = [[0, 0], [1, 1]];
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
    'uniform float ssHue,ssSat,shHue,shSat;',
    'uniform vec4 uCrop; uniform float uStraighten,uRot,uInAspect; uniform vec2 uFlip;',
    'const vec3 LUM=vec3(0.299,0.587,0.114);',
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
    'void main(){',
    '  vec3 c = texture2D(u_img, srcUV(v_uv)).rgb;',
    '  c = pow(pow(c,vec3(2.2))*pow(2.0,exposure*0.02),vec3(1.0/2.2));',  // exposure
    '  c.r += temp*0.0016; c.b -= temp*0.0016;',
    '  c.r -= tint*0.0006; c.g += tint*0.0012; c.b -= tint*0.0006;',
    '  float bp=blacks*0.0012, wp=1.0+whites*0.0016; c=(c-bp)/max(0.0001,(wp-bp));',
    '  float l=dot(clamp(c,0.0,1.0),LUM);',
    '  c += shadows*0.0016*(1.0-smoothstep(0.0,0.5,l)) + highlights*0.0016*smoothstep(0.5,1.0,l);',
    '  c = (c-0.5)*(1.0+contrast*0.01)+0.5;',
    '  if(bw>0.5){',
    '    float mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b)); float s=mx<=0.0?0.0:(mx-mn)/mx; float h=hueOf(c);',
    '    float g=dot(clamp(c,0.0,1.0),LUM);',
    '    float adj=bwRed*hw(h,0.0)+bwOrange*hw(h,0.083)+bwYellow*hw(h,0.166)+bwGreen*hw(h,0.333)+bwAqua*hw(h,0.5)+bwBlue*hw(h,0.666)+bwPurple*hw(h,0.78)+bwMagenta*hw(h,0.888);',
    '    g *= (1.0+(adj*0.01)*s); c=vec3(clamp(g,0.0,1.0));',
    '  } else {',
    '    float lum=dot(clamp(c,0.0,1.0),LUM); c=mix(vec3(lum),c,1.0+saturation*0.01);',
    '    float mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b)); c=mix(vec3(lum),c,1.0+(vibrance*0.012)*(1.0-(mx-mn)));',
    '  }',
    '  float lum2=dot(clamp(c,0.0,1.0),LUM);',                          // split tone
    '  c += (hue2rgb(ssHue/360.0)-0.5)*(ssSat*0.006)*(1.0-smoothstep(0.0,0.6,lum2));',
    '  c += (hue2rgb(shHue/360.0)-0.5)*(shSat*0.006)*smoothstep(0.4,1.0,lum2);',
    '  c = clamp(c,0.0,1.0);',
    '  c = vec3(texture2D(u_lut,vec2(c.r,0.5)).r, texture2D(u_lut,vec2(c.g,0.5)).r, texture2D(u_lut,vec2(c.b,0.5)).r);', // curve
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
    'uniform float clarity,texture_,sharpen,grain,grainSize,vignette,seed;',
    'const vec3 LUM=vec3(0.299,0.587,0.114);',
    'float rnd(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }',
    'void main(){',
    '  vec3 base=texture2D(u_base,v_uv).rgb; vec3 blur=texture2D(u_blur,v_uv).rgb;',
    '  vec3 detail=base-blur;',
    '  vec3 c = base + detail*(clarity*0.012) + detail*(texture_*0.010) + detail*(sharpen*0.02);',
    '  if(grain>0.0){ float n=rnd(v_uv*grainSize*6.0+seed)-0.5; c += n*(grain*0.0032); }',
    '  if(abs(vignette)>0.0){ float d=distance(v_uv,vec2(0.5))*1.41421; c *= 1.0 - (vignette*0.006)*smoothstep(0.35,1.0,d); }',
    '  gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);',
    '}',
  ].join('\n');

  var canvas, gl, baseImage = null, ready = false, fileId = null;
  var adj = defaults();
  var prog1, progBlur, progFinal, srcTex, lutTex, fboA, fboB, fboC, quad;
  var pushTimer = null, saveTimer = null, seed = 0.137, cropMode = false, pendCrop = null;

  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('develop shader:', gl.getShaderInfoLog(s), src); return null; } return s; }
  function prog(fs) { var v = sh(gl.VERTEX_SHADER, VERT), f = sh(gl.FRAGMENT_SHADER, fs); if (!v || !f) return null; var p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error('develop link:', gl.getProgramInfoLog(p)); return null; } return p; }
  function newTex() { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); return t; }
  function makeFBO(w, h) { var t = newTex(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { fb: f, tex: t, w: w, h: h }; }

  function initGL() {
    canvas = document.getElementById('developCanvas'); if (!canvas) return false;
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl'); if (!gl) { console.warn('develop: no WebGL'); return false; }
    prog1 = prog(FRAG1); progBlur = prog(FRAGBLUR); progFinal = prog(FRAGFINAL);
    if (!prog1 || !progBlur || !progFinal) return false;
    quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    srcTex = newTex();
    lutTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, lutTex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return true;
  }

  function uploadLUT() {
    // monotone-ish piecewise-linear curve through sorted points -> 256 LUT
    var pts = (adj.curve && adj.curve.length >= 2) ? adj.curve.slice().sort(function (a, b) { return a[0] - b[0]; }) : [[0, 0], [1, 1]];
    var lut = new Uint8Array(256 * 4);
    for (var i = 0; i < 256; i++) {
      var x = i / 255, y = pts[0][1];
      for (var j = 0; j < pts.length - 1; j++) {
        if (x >= pts[j][0] && x <= pts[j + 1][0]) {
          var t = (pts[j + 1][0] - pts[j][0]) > 1e-6 ? (x - pts[j][0]) / (pts[j + 1][0] - pts[j][0]) : 0;
          y = pts[j][1] + t * (pts[j + 1][1] - pts[j][1]); break;
        }
        if (x > pts[j + 1][0]) y = pts[j + 1][1];
      }
      var v = Math.max(0, Math.min(255, Math.round(y * 255)));
      lut[i * 4] = lut[i * 4 + 1] = lut[i * 4 + 2] = v; lut[i * 4 + 3] = 255;
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
    gl.uniform1f(u(prog1, 'ssHue'), adj.splitShadowHue); gl.uniform1f(u(prog1, 'ssSat'), adj.splitShadowSat);
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
    gl.uniform1f(u(progFinal, 'seed'), seed);
    drawQuad();
    schedulePush();
  }

  function outDims() {
    var iw = baseImage.naturalWidth || baseImage.width, ih = baseImage.naturalHeight || baseImage.height;
    var cw = iw * (cropMode ? 1 : (adj.cropW || 1)), ch = ih * (cropMode ? 1 : (adj.cropH || 1));
    if ((adj.rotate90 || 0) % 2 === 1) { var t = cw; cw = ch; ch = t; }
    var max = 2048, scale = Math.min(1, max / Math.max(cw, ch));
    return { w: Math.max(1, Math.round(cw * scale)), h: Math.max(1, Math.round(ch * scale)) };
  }

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
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { try { if (window.setEditedImage) window.setEditedImage(canvas.toDataURL('image/jpeg', 0.92).split(',')[1]); } catch (e) {} }, 220);
    if (fileId) { clearTimeout(saveTimer); saveTimer = setTimeout(saveEdits, 600); }
  }
  function saveEdits() { if (!fileId) return; fetch('/api/library/' + fileId + '/edits', { method: 'PUT', headers: authHeaders(), credentials: 'include', body: JSON.stringify({ adjustments: adj }) }).catch(function () {}); }

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
      seed = 0.05 + ((opts.fileId || '').length % 13) * 0.07;
      syncControls();
      var img = new Image();
      img.onload = function () { setBaseImage(img); if (fileId) loadSavedEdits(); };
      img.onerror = function () { console.warn('develop: image load failed'); };
      img.src = opts.src;
    },
    getEdited: function () { try { return ready && baseImage ? canvas.toDataURL('image/jpeg', 0.92) : null; } catch (e) { return null; } },
    getAdjustments: function () { return JSON.parse(JSON.stringify(adj)); },
    reset: function () { adj = defaults(); syncControls(); sizeCanvas(); uploadLUT(); render(); },
    set: function (k, v) { adj[k] = v; if (k === 'cropW' || k === 'cropH' || k === 'rotate90') sizeCanvas(); render(); },
    applyAdjustments: function (obj) {
      adj = defaults();
      Object.keys(obj || {}).forEach(function (k) { if (k in adj || k === 'bw' || k === 'curve') adj[k] = obj[k]; });
      if (!adj.curve || adj.curve.length < 2) adj.curve = [[0, 0], [1, 1]];
      syncControls(); sizeCanvas(); uploadLUT(); render();
    },
  };

  function loadSavedEdits() {
    var id = fileId;
    fetch('/api/library/' + id + '/edits', { headers: authHeaders(), credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (!data || !data.adjustments || fileId !== id) return; api.applyAdjustments(data.adjustments); })
      .catch(function () {});
  }

  window.exportImage = function () {
    var dataUrl = (api.getEdited && api.getEdited()) || null;
    if (!dataUrl) { var pv = document.getElementById('previewImage'); dataUrl = pv && pv.getAttribute('src'); }
    if (!dataUrl) { if (window.showError) showError('Load a photo first', 'Export'); return; }
    var name = (window.getCurrentFilename && window.getCurrentFilename()) || 'caption-studio';
    var a = document.createElement('a'); a.href = dataUrl; a.download = name.replace(/\.[^.]+$/, '') + '_edited.jpg';
    document.body.appendChild(a); a.click(); a.remove();
    var id = window.getLibraryFileId && window.getLibraryFileId();
    if (id) {
      fetch('/api/library/' + id + '/export', { method: 'POST', headers: authHeaders(), credentials: 'include', body: JSON.stringify({ imageData: dataUrl.split(',')[1] }) })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j && window.showSuccess) showSuccess('Saved ' + j.filename + ' to exports', 'Export'); }).catch(function () {});
    } else if (window.showSuccess) { showSuccess('Downloaded edited image', 'Export'); }
  };

  function wireControls() {
    document.querySelectorAll('#developBody input[data-adj]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var k = inp.getAttribute('data-adj'); adj[k] = +inp.value;
        var out = document.getElementById(inp.id + 'Out'); if (out) out.textContent = inp.value;
        render();
      });
    });
    var bwBtn = document.getElementById('devBW');
    if (bwBtn) bwBtn.addEventListener('click', function () { adj.bw = adj.bw ? 0 : 1; syncControls(); render(); });
    var reset = document.getElementById('devReset');
    if (reset) reset.addEventListener('click', function (e) { e.stopPropagation(); api.reset(); });
    initCurveWidget();
  }

  /* ---- interactive tone-curve widget ---- */
  function initCurveWidget() {
    var cv = document.getElementById('devCurve'); if (!cv) return;
    var ctx = cv.getContext('2d'); var W = cv.width, H = cv.height, drag = -1;
    function pts() { return adj.curve; }
    function toPx(p) { return [p[0] * W, H - p[1] * H]; }
    function toNorm(x, y) { return [Math.max(0, Math.min(1, x / W)), Math.max(0, Math.min(1, 1 - y / H))]; }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
      for (var i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(W * i / 4, 0); ctx.lineTo(W * i / 4, H); ctx.moveTo(0, H * i / 4); ctx.lineTo(W, H * i / 4); ctx.stroke(); }
      var p = pts().slice().sort(function (a, b) { return a[0] - b[0]; });
      ctx.strokeStyle = '#9B7BFF'; ctx.lineWidth = 2; ctx.beginPath();
      for (var x = 0; x <= W; x += 3) { var nx = x / W, ny = p[0][1]; for (var j = 0; j < p.length - 1; j++) { if (nx >= p[j][0] && nx <= p[j + 1][0]) { var t = (p[j + 1][0] - p[j][0]) > 1e-6 ? (nx - p[j][0]) / (p[j + 1][0] - p[j][0]) : 0; ny = p[j][1] + t * (p[j + 1][1] - p[j][1]); break; } if (nx > p[j + 1][0]) ny = p[j + 1][1]; } if (x === 0) ctx.moveTo(0, H - ny * H); else ctx.lineTo(x, H - ny * H); }
      ctx.stroke();
      ctx.fillStyle = '#fff'; pts().forEach(function (pt) { var px = toPx(pt); ctx.beginPath(); ctx.arc(px[0], px[1], 4, 0, 6.29); ctx.fill(); });
    }
    function hit(x, y) { for (var i = 0; i < pts().length; i++) { var px = toPx(pts()[i]); if (Math.abs(px[0] - x) < 9 && Math.abs(px[1] - y) < 9) return i; } return -1; }
    function pos(e) { var r = cv.getBoundingClientRect(); var t = e.touches ? e.touches[0] : e; return [(t.clientX - r.left) * W / r.width, (t.clientY - r.top) * H / r.height]; }
    function changed() { adj.curve = pts(); uploadLUT(); render(); draw(); }
    cv.addEventListener('mousedown', function (e) { var pp = pos(e); drag = hit(pp[0], pp[1]); if (drag < 0) { var n = toNorm(pp[0], pp[1]); adj.curve.push(n); adj.curve.sort(function (a, b) { return a[0] - b[0]; }); drag = adj.curve.indexOf(n); changed(); } });
    window.addEventListener('mousemove', function (e) { if (drag < 0) return; var pp = pos(e); var n = toNorm(pp[0], pp[1]); if (drag > 0 && drag < adj.curve.length - 1) adj.curve[drag] = n; else adj.curve[drag] = [adj.curve[drag][0], n[1]]; changed(); });
    window.addEventListener('mouseup', function () { drag = -1; });
    cv.addEventListener('dblclick', function (e) { var pp = pos(e); var i = hit(pp[0], pp[1]); if (i > 0 && i < adj.curve.length - 1) { adj.curve.splice(i, 1); changed(); } });
    window.drCurve = { setPoints: function (p) { adj.curve = (p && p.length >= 2) ? p : [[0, 0], [1, 1]]; draw(); }, redraw: draw };
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
    on('devRotate', 'click', function () { if (!baseImage) return; adj.rotate90 = ((adj.rotate90 || 0) + 1) % 4; sizeCanvas(); render(); });
    on('devFlipH', 'click', function (e) { adj.flipH = adj.flipH ? 0 : 1; e.currentTarget.classList.toggle('on', !!adj.flipH); render(); });
    on('devFlipV', 'click', function (e) { adj.flipV = adj.flipV ? 0 : 1; e.currentTarget.classList.toggle('on', !!adj.flipV); render(); });

    document.querySelectorAll('#devAspect .dr-aspect-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('#devAspect .dr-aspect-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        var v = b.getAttribute('data-aspect'); aspect = v === 'free' ? null : parseFloat(v);
        if (!baseImage) return;
        if (cropMode) { if (aspect) { pendCrop = constrainAspect(pendCrop, aspect); positionBox(); } }
        else if (aspect) { var r = centeredRect(aspect); adj.cropX = r[0]; adj.cropY = r[1]; adj.cropW = r[2]; adj.cropH = r[3]; sizeCanvas(); render(); }
        else { adj.cropX = 0; adj.cropY = 0; adj.cropW = 1; adj.cropH = 1; sizeCanvas(); render(); }
      });
    });

    function enterCrop() {
      cropMode = true; pendCrop = [adj.cropX || 0, adj.cropY || 0, adj.cropW || 1, adj.cropH || 1];
      if (pendCrop[2] >= 0.999 && pendCrop[3] >= 0.999) pendCrop = [0.06, 0.06, 0.88, 0.88];
      document.getElementById('devCropToggle').classList.add('on');
      overlay.classList.remove('hidden'); sizeCanvas(); render(); setTimeout(positionBox, 40);
    }
    function exitCrop(apply) {
      if (apply) { adj.cropX = pendCrop[0]; adj.cropY = pendCrop[1]; adj.cropW = pendCrop[2]; adj.cropH = pendCrop[3]; }
      cropMode = false; document.getElementById('devCropToggle').classList.remove('on');
      overlay.classList.add('hidden'); sizeCanvas(); render(); if (apply) schedulePush();
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

  function start() { if (!initGL()) { window.drDevelop = null; return; } ready = true; wireControls(); wireGeometry(); window.drDevelop = api; }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

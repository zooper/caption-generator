/* ============================================================================
   Darkroom develop engine — non-destructive WebGL adjustments.

   Exposes window.drDevelop:
     load({ src, fileId })  load a base image into the canvas; for library files
                            also fetch + apply the saved edit stack
     getEdited()            current edited image as a JPEG data URL
     reset()               clear all adjustments

   The engine renders the base image through a single fragment shader on every
   adjustment change (real-time). Edited pixels are pushed back into the page's
   `uploadedImage` (via window.setEditedImage) on a short debounce so caption /
   post use the developed result. Edits persist per library file in edit_stacks.
   ============================================================================ */
(function () {
  'use strict';

  var ADJ_KEYS = ['exposure', 'contrast', 'highlights', 'shadows', 'whites',
    'blacks', 'temp', 'tint', 'vibrance', 'saturation'];

  function zeroAdj() {
    var a = {};
    ADJ_KEYS.forEach(function (k) { a[k] = 0; });
    return a;
  }

  var VERT = 'attribute vec2 p; varying vec2 v_uv; void main(){ v_uv = vec2((p.x+1.0)/2.0, (1.0-p.y)/2.0); gl_Position = vec4(p,0.0,1.0); }';

  var FRAG = [
    'precision highp float;',
    'uniform sampler2D u_img;',
    'uniform float exposure, contrast, highlights, shadows, whites, blacks, temp, tint, vibrance, saturation;',
    'varying vec2 v_uv;',
    'vec3 toLin(vec3 c){ return pow(c, vec3(2.2)); }',
    'vec3 toSrgb(vec3 c){ return pow(max(c,0.0), vec3(1.0/2.2)); }',
    'void main(){',
    '  vec3 c = texture2D(u_img, v_uv).rgb;',
    '  c = toSrgb(toLin(c) * pow(2.0, exposure*0.02));',           // exposure (~±2 stops)
    '  c.r += temp*0.0016; c.b -= temp*0.0016;',                   // temperature
    '  c.r -= tint*0.0006; c.g += tint*0.0012; c.b -= tint*0.0006;', // tint
    '  float bp = blacks*0.0012; float wp = 1.0 + whites*0.0016;',
    '  c = (c - bp) / max(0.0001, (wp - bp));',                    // black/white point
    '  float l = dot(clamp(c,0.0,1.0), vec3(0.299,0.587,0.114));',
    '  c += shadows*0.0016 * (1.0 - smoothstep(0.0,0.5,l));',      // shadows lift
    '  c += highlights*0.0016 * smoothstep(0.5,1.0,l);',           // highlights
    '  c = (c - 0.5) * (1.0 + contrast*0.01) + 0.5;',              // contrast
    '  float lum = dot(clamp(c,0.0,1.0), vec3(0.299,0.587,0.114));',
    '  c = mix(vec3(lum), c, 1.0 + saturation*0.01);',             // saturation
    '  float mx = max(c.r,max(c.g,c.b)); float mn = min(c.r,min(c.g,c.b));',
    '  c = mix(vec3(lum), c, 1.0 + (vibrance*0.012)*(1.0-(mx-mn)));', // vibrance
    '  gl_FragColor = vec4(clamp(c,0.0,1.0), 1.0);',
    '}',
  ].join('\n');

  var canvas, gl, program, tex, uni = {}, baseImage = null;
  var adj = zeroAdj();
  var fileId = null;
  var pushTimer = null, saveTimer = null;
  var ready = false;

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('develop shader error:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function initGL() {
    canvas = document.getElementById('developCanvas');
    if (!canvas) return false;
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) { console.warn('develop: WebGL unavailable'); return false; }
    var vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    program = gl.createProgram();
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { console.error('develop link error'); return false; }
    gl.useProgram(program);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(program, 'u_img'), 0);
    ADJ_KEYS.forEach(function (k) { uni[k] = gl.getUniformLocation(program, k); });
    return true;
  }

  function render() {
    if (!ready || !baseImage) return;
    ADJ_KEYS.forEach(function (k) { gl.uniform1f(uni[k], adj[k] || 0); });
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // Debounced: edited pixels -> uploadedImage; saved edits -> server (library only)
  function schedulePush() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      if (!ready || !canvas) return;
      try {
        var b64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
        if (window.setEditedImage) window.setEditedImage(b64);
      } catch (e) { /* tainted canvas shouldn't happen for same-origin/data URLs */ }
    }, 220);
    if (fileId) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveEdits, 600);
    }
  }

  function authHeaders() {
    var t = localStorage.getItem('auth_token');
    var h = { 'Content-Type': 'application/json' };
    if (t) h.Authorization = 'Bearer ' + t;
    return h;
  }

  function saveEdits() {
    if (!fileId) return;
    fetch('/api/library/' + fileId + '/edits', {
      method: 'PUT', headers: authHeaders(), credentials: 'include',
      body: JSON.stringify({ adjustments: adj }),
    }).catch(function () {});
  }

  function applyToControls() {
    document.querySelectorAll('#developSliders input[data-adj]').forEach(function (inp) {
      var k = inp.getAttribute('data-adj');
      inp.value = adj[k] || 0;
      var out = document.getElementById(inp.id + 'Out');
      if (out) out.textContent = adj[k] || 0;
    });
  }

  function setBaseImage(img) {
    baseImage = img;
    // Cap render size for performance; keep aspect ratio.
    var max = 2048, w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    var scale = Math.min(1, max / Math.max(w, h));
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    // Show canvas, hide the plain <img> preview.
    var pv = document.getElementById('previewImage');
    if (pv) pv.classList.add('hidden');
    canvas.classList.remove('hidden');
    render();
    schedulePush();
  }

  var api = {
    load: function (opts) {
      opts = opts || {};
      fileId = opts.fileId || null;
      adj = zeroAdj();
      applyToControls();
      var img = new Image();
      img.onload = function () {
        setBaseImage(img);
        if (fileId) loadSavedEdits(); // overlay saved adjustments once base is up
      };
      img.onerror = function () { console.warn('develop: image load failed'); };
      img.src = opts.src;
    },
    getEdited: function () {
      try { return ready && baseImage ? canvas.toDataURL('image/jpeg', 0.92) : null; }
      catch (e) { return null; }
    },
    reset: function () {
      adj = zeroAdj();
      applyToControls();
      render();
      schedulePush();
    },
  };

  function loadSavedEdits() {
    var id = fileId;
    fetch('/api/library/' + id + '/edits', { headers: authHeaders(), credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.adjustments || fileId !== id) return;
        ADJ_KEYS.forEach(function (k) { if (typeof data.adjustments[k] === 'number') adj[k] = data.adjustments[k]; });
        applyToControls();
        render();
        schedulePush();
      })
      .catch(function () {});
  }

  function wireControls() {
    document.querySelectorAll('#developSliders input[data-adj]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        adj[inp.getAttribute('data-adj')] = +inp.value;
        var out = document.getElementById(inp.id + 'Out');
        if (out) out.textContent = inp.value;
        render();
        schedulePush();
      });
    });
    var reset = document.getElementById('devReset');
    if (reset) reset.addEventListener('click', function (e) { e.stopPropagation(); api.reset(); });
  }

  function start() {
    if (!initGL()) { window.drDevelop = null; return; }
    ready = true;
    wireControls();
    window.drDevelop = api;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

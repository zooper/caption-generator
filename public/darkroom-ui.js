/* ============================================================================
   Darkroom UI — presentational layer for the Caption Studio develop module.
   Self-contained and additive: it never depends on the page's inline app
   logic, and the inline logic never depends on it. It only touches the
   Darkroom-specific chrome (sliders, collapsible modules, navigator/canvas
   mirror, filmstrip) and exposes window.drToneHints() so the existing
   Generate flow can fold slider intent into the request context.
   ============================================================================ */
(function () {
  'use strict';

  /* Slider presets mirror the seven caption styles (tone/length/emoji/edge). */
  var PRESETS = {
    creative:      { label: 'Creative',      tone: 72, length: 55, emoji: 25, edge: 30 },
    professional:  { label: 'Professional',  tone: 15, length: 40, emoji: 0,  edge: 5  },
    casual:        { label: 'Casual',        tone: 60, length: 35, emoji: 45, edge: 20 },
    trendy:        { label: 'Trendy',        tone: 82, length: 30, emoji: 60, edge: 55 },
    inspirational: { label: 'Inspirational', tone: 50, length: 72, emoji: 15, edge: 10 },
    humorous:      { label: 'Humorous',      tone: 85, length: 45, emoji: 55, edge: 45 },
    edgy:          { label: 'Edgy',          tone: 65, length: 40, emoji: 10, edge: 85 }
  };

  var SLIDERS = ['tone', 'length', 'emoji', 'edge'];
  var $ = function (id) { return document.getElementById(id); };

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  /* -------- slider readouts + tone curve + bucket label -------- */
  function bucket(tone) { return tone < 34 ? 'Professional' : tone < 67 ? 'Balanced' : 'Playful'; }

  function redrawCurve(tone) {
    var fill = $('drCurveFill'), stroke = $('drCurveStroke');
    if (!stroke) return;
    var w = 276;
    var cp1y = Math.round(52 - tone * 0.40);
    var cp2y = Math.round(6 + (100 - tone) * 0.34);
    var d = 'M0,52 C ' + Math.round(w * 0.28) + ',' + cp1y + ' ' + Math.round(w * 0.64) + ',' + cp2y + ' ' + w + ',6';
    stroke.setAttribute('d', d);
    if (fill) fill.setAttribute('d', d + ' L' + w + ',60 L0,60 Z');
  }

  function syncReadouts() {
    SLIDERS.forEach(function (k) {
      var s = $(k + 'Slider'), out = $('dr' + k.charAt(0).toUpperCase() + k.slice(1) + 'Out');
      if (s && out) out.textContent = s.value;
    });
    var tone = $('toneSlider');
    if (tone) redrawCurve(+tone.value);
  }

  function setBucket(text) { var el = $('drBucket'); if (el) el.textContent = text; }

  function applyPreset(style) {
    var p = PRESETS[style];
    if (!p) return false;
    SLIDERS.forEach(function (k) { var s = $(k + 'Slider'); if (s) s.value = p[k]; });
    syncReadouts();
    setBucket(p.label);
    return true;
  }

  /* Natural-language intent the Generate flow appends to its context. */
  window.drToneHints = function () {
    function val(id) { var s = $(id); return s ? +s.value : null; }
    var tone = val('toneSlider'), len = val('lengthSlider'), emo = val('emojiSlider'), edge = val('edgeSlider');
    if (tone === null) return '';
    var bits = [];
    if (tone < 34) bits.push('Keep the tone professional and understated.');
    else if (tone >= 67) bits.push('Make the tone playful and energetic.');
    if (len < 34) bits.push('Keep the caption short — a single line.');
    else if (len > 66) bits.push('Write a longer, more descriptive caption.');
    if (emo < 15) bits.push('Do not use emoji.');
    else if (emo > 66) bits.push('Use several fitting emoji.');
    else if (emo > 33) bits.push('Use a touch of emoji.');
    if (edge > 70) bits.push('Add a bold, witty, slightly edgy remark.');
    return bits.join(' ');
  };

  /* -------- collapsible modules -------- */
  function wireModules() {
    document.querySelectorAll('.dr-module-head').forEach(function (head) {
      head.addEventListener('click', function () {
        head.parentElement.classList.toggle('collapsed');
      });
    });
  }

  /* -------- navigator / canvas / filmstrip mirror of #previewImage -------- */
  function currentName() {
    var fi = $('fileInput');
    if (fi && fi.files && fi.files[0]) return fi.files[0].name;
    return window.__drDroppedName || 'photo.jpg';
  }

  function mirrorImage() {
    var img = $('previewImage');
    if (!img) return;
    var src = img.getAttribute('src');
    // The develop engine hides the <img> and shows a <canvas>, so track the
    // source by whether a src is set, not by the <img>'s visibility.
    var loaded = !!(src && src.length > 5);

    var thumb = $('navThumb');
    if (thumb) thumb.style.backgroundImage = loaded ? 'url("' + src + '")' : '';

    var fn = $('drFilename');
    if (fn && loaded) fn.textContent = currentName();
    // The Navigator (left) reflects the current image; the filmstrip below is the
    // photo-library catalog (see catalog browser), not a single-image strip.
  }

  function wireImageMirror() {
    var img = $('previewImage');
    if (!img) return;
    new MutationObserver(mirrorImage).observe(img, { attributes: true, attributeFilter: ['src', 'class'] });

    var thumb = $('navThumb'), fi = $('fileInput');
    if (thumb && fi) thumb.addEventListener('click', function () { fi.click(); });
    if (fi) fi.addEventListener('change', function () { setTimeout(mirrorImage, 0); });

    // Capture dropped filename (inline logic owns the actual file read).
    var area = $('uploadArea');
    if (area) area.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        window.__drDroppedName = e.dataTransfer.files[0].name;
        setTimeout(mirrorImage, 60);
      }
    }, true);
  }

  /* -------- sliders + preset wiring -------- */
  function wireSliders() {
    SLIDERS.forEach(function (k) {
      var s = $(k + 'Slider');
      if (s) s.addEventListener('input', function () { syncReadouts(); setBucket('Custom'); });
    });
    document.querySelectorAll('.style-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var style = btn.getAttribute('data-style') || '';
        if (!applyPreset(style)) setBucket((btn.textContent || '').trim() || 'Custom');
      });
    });
    syncReadouts();
  }

  /* -------- photo-library catalog (the filmstrip browses LIBRARY_DIR) -------- */
  var LIB = { dir: '', enabled: null };

  function authHeaders() {
    var t = localStorage.getItem('auth_token');
    return t ? { Authorization: 'Bearer ' + t } : {};
  }

  // Lazy-load thumbnails as authed blobs (img src can't carry a Bearer header).
  var thumbIO = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target; thumbIO.unobserve(el);
      fetch('/api/library/' + el.getAttribute('data-thumb') + '/thumb', { headers: authHeaders(), credentials: 'include' })
        .then(function (r) { return r.ok ? r.blob() : null; })
        .then(function (b) { if (b) el.style.backgroundImage = 'url("' + URL.createObjectURL(b) + '")'; })
        .catch(function () {});
    });
  }, { root: null, rootMargin: '200px' }) : null;

  function hint(strip, text) {
    var e = document.createElement('div');
    e.className = 'dr-filmstrip-empty dr-cat-item';
    e.textContent = text;
    strip.appendChild(e);
  }

  function folderChip(name, relPath) {
    var b = document.createElement('button');
    b.className = 'dr-folder dr-cat-item';
    b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg><span></span>';
    b.querySelector('span').textContent = name;
    b.addEventListener('click', function () { loadCatalog(relPath); });
    return b;
  }

  function fileFrame(f) {
    var b = document.createElement('button');
    b.className = 'dr-frame dr-cat-item';
    b.setAttribute('data-id', f.id);
    b.innerHTML = '<div class="dr-frame-thumb" data-thumb="' + f.id + '"></div><span class="dr-frame-name"></span>';
    b.querySelector('.dr-frame-name').textContent = f.name;
    b.addEventListener('click', function () {
      var strip = $('drFilmstrip');
      if (strip) strip.querySelectorAll('.dr-frame.active').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      if (window.openLibraryFile) window.openLibraryFile(f.id);
    });
    var th = b.querySelector('.dr-frame-thumb');
    if (thumbIO) thumbIO.observe(th); else {
      fetch('/api/library/' + f.id + '/thumb', { headers: authHeaders(), credentials: 'include' })
        .then(function (r) { return r.ok ? r.blob() : null; })
        .then(function (bl) { if (bl) th.style.backgroundImage = 'url("' + URL.createObjectURL(bl) + '")'; }).catch(function () {});
    }
    return b;
  }

  function loadCatalog(dir) {
    var strip = $('drFilmstrip');
    if (!strip) return;
    strip.querySelectorAll('.dr-cat-item, .dr-breadcrumb').forEach(function (e) { e.remove(); });
    fetch('/api/library/files?dir=' + encodeURIComponent(dir || ''), { headers: authHeaders(), credentials: 'include' })
      .then(function (r) {
        if (r.status === 503) { LIB.enabled = false; hint(strip, 'Library off — set LIBRARY_DIR to browse photos'); return null; }
        if (r.status === 401) { hint(strip, 'Sign in to browse your library'); return null; }
        if (!r.ok) { hint(strip, 'Could not load library'); return null; }
        return r.json();
      })
      .then(function (data) {
        if (!data) return;
        LIB.enabled = true; LIB.dir = data.dir || '';
        if (typeof renderTree === 'function') renderTree(); // sync tree highlight
        var bc = document.createElement('div');
        bc.className = 'dr-breadcrumb dr-cat-item';
        bc.textContent = data.dir ? '/' + data.dir : '/';
        strip.appendChild(bc);
        if (data.parent !== null && data.parent !== undefined) strip.appendChild(folderChip('..', data.parent));
        data.dirs.forEach(function (d) { strip.appendChild(folderChip(d.name, d.relPath)); });
        data.files.forEach(function (f) { strip.appendChild(fileFrame(f)); });
        if (!data.dirs.length && !data.files.length) hint(strip, 'Empty folder');
      })
      .catch(function () { hint(strip, 'Could not load library'); });
  }
  window.drReloadCatalog = function () { loadCatalog(LIB.dir || ''); };

  /* -------- folder tree (left panel) -------- */
  var treeRoot = null;
  var treeExpanded = { '': true };

  function buildTree(dirs) {
    var root = { name: 'All photos', path: '', children: {}, fileCount: 0 };
    dirs.forEach(function (d) {
      var node = root;
      if (d.dir === '') { root.fileCount = d.count; return; }
      var acc = '';
      d.dir.split('/').forEach(function (p) {
        acc = acc ? acc + '/' + p : p;
        if (!node.children[p]) node.children[p] = { name: p, path: acc, children: {}, fileCount: 0 };
        node = node.children[p];
      });
      node.fileCount = d.count;
    });
    return root;
  }
  function subtreeCount(n) { var c = n.fileCount || 0; for (var k in n.children) c += subtreeCount(n.children[k]); return c; }

  function renderTreeNode(node, depth) {
    var wrap = document.createElement('div');
    var kids = Object.keys(node.children).sort();
    var row = document.createElement('div');
    row.className = 'dr-tree-row' + (node.path === LIB.dir ? ' active' : '');
    row.style.paddingLeft = (6 + depth * 13) + 'px';
    var open = !!treeExpanded[node.path];
    var caret = document.createElement('span');
    caret.className = 'dr-tree-caret' + (kids.length ? (open ? ' open' : '') : ' leaf');
    caret.innerHTML = '<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M8 5l8 7-8 7z"/></svg>';
    var label = document.createElement('span');
    label.className = 'dr-tree-label'; label.textContent = node.name;
    var cnt = document.createElement('span');
    cnt.className = 'dr-tree-count'; cnt.textContent = subtreeCount(node) || '';
    row.appendChild(caret); row.appendChild(label); row.appendChild(cnt);
    caret.addEventListener('click', function (e) { e.stopPropagation(); treeExpanded[node.path] = !treeExpanded[node.path]; renderTree(); });
    row.addEventListener('click', function () { loadCatalog(node.path); });
    wrap.appendChild(row);
    if (kids.length && open) {
      kids.forEach(function (k) { wrap.appendChild(renderTreeNode(node.children[k], depth + 1)); });
    }
    return wrap;
  }
  function renderTree() {
    var el = $('drTree'); if (!el || !treeRoot) return;
    el.innerHTML = '';
    el.appendChild(renderTreeNode(treeRoot, 0));
  }
  function loadTree() {
    var el = $('drTree'); if (!el) return;
    fetch('/api/library/tree', { headers: authHeaders(), credentials: 'include' })
      .then(function (r) {
        if (r.status === 503) { el.innerHTML = '<div class="dr-tree-empty">Library off</div>'; return null; }
        if (!r.ok) { el.innerHTML = '<div class="dr-tree-empty">' + (r.status === 401 ? 'Sign in' : 'Unavailable') + '</div>'; return null; }
        return r.json();
      })
      .then(function (data) { if (!data) return; treeRoot = buildTree(data.dirs || []); renderTree(); })
      .catch(function () { el.innerHTML = '<div class="dr-tree-empty">Unavailable</div>'; });
  }

  onReady(function () {
    wireModules();
    wireSliders();
    wireImageMirror();
    loadTree();
    loadCatalog('');
    mirrorImage();
  });
})();

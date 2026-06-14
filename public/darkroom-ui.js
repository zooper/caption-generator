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
    var loaded = src && !img.classList.contains('hidden');

    var thumb = $('navThumb');
    if (thumb) thumb.style.backgroundImage = loaded ? 'url("' + src + '")' : '';

    var fn = $('drFilename');
    if (fn) fn.textContent = loaded ? currentName() : 'No photo loaded';

    var strip = $('drFilmstrip'), empty = $('drFilmstripEmpty');
    if (strip) {
      var frame = $('drActiveFrame');
      if (loaded) {
        if (empty) empty.style.display = 'none';
        if (!frame) {
          frame = document.createElement('div');
          frame.id = 'drActiveFrame';
          frame.className = 'dr-frame active';
          frame.innerHTML = '<div class="dr-frame-thumb"></div><span class="dr-frame-name"></span>';
          frame.addEventListener('click', function () { var fi = $('fileInput'); if (fi) fi.click(); });
          strip.appendChild(frame);
        }
        frame.querySelector('.dr-frame-thumb').style.backgroundImage = 'url("' + src + '")';
        frame.querySelector('.dr-frame-name').textContent = currentName();
      } else if (frame) {
        frame.remove();
        if (empty) empty.style.display = '';
      }
    }
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

  onReady(function () {
    wireModules();
    wireSliders();
    wireImageMirror();
    mirrorImage();
  });
})();

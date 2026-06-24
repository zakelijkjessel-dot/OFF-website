/* ============================================================
   AutoPilotAI — Particle Constellations
   Each visual lives in its OWN <canvas class="viz"> inside its
   column, so particles never drift over text. Particles sample a
   silhouette (chat bubble, steering wheel) and assemble into it —
   dense in the form, sparse drifters around it. The constellation
   is the brand mark.
   ============================================================ */
(function () {
  'use strict';

  var visers = Array.prototype.slice.call(document.querySelectorAll('.viz'));
  if (!visers.length) return;

  var PALETTE = [
    { c: '#8052ff', w: 44 }, // Plum Voltage — dominant
    { c: '#ffffff', w: 30 }, // Bone
    { c: '#ffb829', w: 14 }, // Amber Spark
    { c: '#15846e', w: 12 }  // Lichen
  ];
  // triangle-heavy, like the reference field
  var SHAPES = [
    { s: 'triangle', w: 52 },
    { s: 'circle', w: 20 },
    { s: 'diamond', w: 16 },
    { s: 'square', w: 12 }
  ];

  var reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  var pointer = { nx: 0, ny: 0, tx: 0, ty: 0 };

  /* ---------- helpers ---------- */
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function weighted(table, key) {
    var total = 0,
      i;
    for (i = 0; i < table.length; i++) total += table[i].w;
    var r = Math.random() * total;
    for (i = 0; i < table.length; i++) {
      r -= table[i].w;
      if (r <= 0) return table[i][key];
    }
    return table[0][key];
  }

  /* ---------- shape silhouettes (drawn white on offscreen) ---------- */
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawBubble(c, w, h) {
    c.fillStyle = '#fff';
    var bw = w * 0.78;
    var bh = h * 0.56;
    var x = (w - bw) / 2;
    var y = h * 0.16;
    var r = Math.min(bw, bh) * 0.3;
    roundRect(c, x, y, bw, bh, r);
    c.fill();
    // tail bottom-left
    c.beginPath();
    c.moveTo(x + bw * 0.2, y + bh - 2);
    c.lineTo(x + bw * 0.08, y + bh + h * 0.16);
    c.lineTo(x + bw * 0.42, y + bh - 2);
    c.closePath();
    c.fill();
    // three dots punched out
    c.globalCompositeOperation = 'destination-out';
    var cy = y + bh * 0.5;
    var dotR = bh * 0.085;
    [0.34, 0.5, 0.66].forEach(function (fx) {
      c.beginPath();
      c.arc(x + bw * fx, cy, dotR, 0, Math.PI * 2);
      c.fill();
    });
    c.globalCompositeOperation = 'source-over';
  }

  function drawWheel(c, w, h) {
    c.fillStyle = '#fff';
    var cx = w / 2;
    var cy = h / 2;
    var R = Math.min(w, h) * 0.44;
    var ringW = R * 0.24;
    // outer ring (annulus)
    c.beginPath();
    c.arc(cx, cy, R, 0, Math.PI * 2);
    c.arc(cx, cy, R - ringW, 0, Math.PI * 2);
    c.fill('evenodd');
    // hub
    c.beginPath();
    c.arc(cx, cy, R * 0.17, 0, Math.PI * 2);
    c.fill();
    // spokes: horizontal bar + lower spoke (3-spoke wheel)
    var sw = R * 0.13;
    c.fillRect(cx - R, cy - sw / 2, R * 2, sw);
    c.fillRect(cx - sw / 2, cy, sw, R);
  }

  var SHAPE_FN = { bubble: drawBubble, wheel: drawWheel };

  /* ---------- sample filled pixels → points ---------- */
  function samplePoints(fn, sw, sh, gap) {
    var off = document.createElement('canvas');
    off.width = sw;
    off.height = sh;
    var oc = off.getContext('2d');
    fn(oc, sw, sh);
    var data = oc.getImageData(0, 0, sw, sh).data;
    var pts = [];
    for (var y = 0; y < sh; y += gap) {
      for (var x = 0; x < sw; x += gap) {
        if (data[(y * sw + x) * 4 + 3] > 128) {
          pts.push({
            x: x + rand(-gap * 0.5, gap * 0.5),
            y: y + rand(-gap * 0.5, gap * 0.5)
          });
        }
      }
    }
    return pts;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  /* ---------- build one viser ---------- */
  function makeParticle(hx, hy, drifter) {
    var depth = Math.random();
    return {
      hx: hx,
      hy: hy,
      x: 0,
      y: 0,
      placed: false,
      shape: weighted(SHAPES, 's'),
      color: weighted(PALETTE, 'c'),
      filled: Math.random() < 0.42,
      size: drifter ? rand(2, 4) : rand(2.4, 6),
      depth: depth,
      amp: drifter ? rand(2, 6) : rand(1, 3.5),
      sp: rand(0.0004, 0.0011),
      ph: Math.random() * Math.PI * 2,
      tw: rand(0.0009, 0.0022),
      baseA: drifter ? rand(0.12, 0.4) : rand(0.55, 1)
    };
  }

  function setupViser(v) {
    var canvas = v.canvas;
    var rect = canvas.getBoundingClientRect();
    var cssW = Math.max(40, rect.width);
    var cssH = Math.max(40, rect.height);

    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    v.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    v.cssW = cssW;
    v.cssH = cssH;

    // sample at a capped internal resolution, then scale to css
    var maxSide = 480;
    var scale = Math.min(1, maxSide / Math.max(cssW, cssH));
    var sw = Math.max(40, Math.round(cssW * scale));
    var sh = Math.max(40, Math.round(cssH * scale));
    var gap = 5;

    var pts = samplePoints(v.shapeFn, sw, sh, gap);
    shuffle(pts);
    var MAX = 1500;
    if (pts.length > MAX) pts.length = MAX;

    var kx = cssW / sw;
    var ky = cssH / sh;

    var particles = [];
    for (var i = 0; i < pts.length; i++) {
      particles.push(makeParticle(pts[i].x * kx, pts[i].y * ky, false));
    }
    // sparse drifters scattered around the form
    var drift = Math.round(particles.length * 0.14);
    for (var d = 0; d < drift; d++) {
      particles.push(
        makeParticle(rand(0, cssW), rand(0, cssH), true)
      );
    }

    // start scattered (assembles toward home in the loop)
    for (var p = 0; p < particles.length; p++) {
      particles[p].x = rand(0, cssW);
      particles[p].y = rand(0, cssH);
    }
    v.particles = particles;
  }

  /* ---------- draw a micro-shape ---------- */
  function drawShape(ctx, p, x, y, size, alpha) {
    ctx.globalAlpha = alpha;
    if (p.filled) ctx.fillStyle = p.color;
    else {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1;
    }

    switch (p.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        break;
      case 'square':
        ctx.beginPath();
        ctx.rect(x - size * 0.5, y - size * 0.5, size, size);
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(x, y - size * 0.62);
        ctx.lineTo(x + size * 0.62, y);
        ctx.lineTo(x, y + size * 0.62);
        ctx.lineTo(x - size * 0.62, y);
        ctx.closePath();
        break;
      default: // triangle
        ctx.beginPath();
        ctx.moveTo(x, y - size * 0.64);
        ctx.lineTo(x + size * 0.58, y + size * 0.44);
        ctx.lineTo(x - size * 0.58, y + size * 0.44);
        ctx.closePath();
    }
    if (p.filled) ctx.fill();
    else ctx.stroke();
  }

  /* ---------- render one viser ---------- */
  function renderViser(v, t) {
    var ctx = v.ctx;
    ctx.clearRect(0, 0, v.cssW, v.cssH);

    var px = pointer.nx * 16;
    var py = pointer.ny * 12;
    var ps = v.particles;

    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];

      var fx, fy;
      if (reduceMotion) {
        fx = p.hx;
        fy = p.hy;
      } else {
        fx = p.hx + Math.sin(t * p.sp + p.ph) * p.amp + px * p.depth;
        fy = p.hy + Math.cos(t * p.sp * 0.9 + p.ph) * p.amp + py * p.depth;
      }

      if (!p.placed) {
        p.x += (fx - p.x) * 0.07;
        p.y += (fy - p.y) * 0.07;
        if (Math.abs(fx - p.x) < 0.6 && Math.abs(fy - p.y) < 0.6) {
          p.placed = true;
        }
      } else {
        p.x = fx;
        p.y = fy;
      }

      var a = reduceMotion
        ? p.baseA
        : p.baseA * (0.7 + 0.3 * Math.sin(t * p.tw + p.ph));
      var size = p.size * (0.72 + 0.55 * p.depth);

      drawShape(ctx, p, p.x, p.y, size, Math.min(1, Math.max(0, a)));
    }
    ctx.globalAlpha = 1;
  }

  function inView(v) {
    var r = v.canvas.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  /* ---------- loop ---------- */
  function frame(t) {
    for (var i = 0; i < visers.length; i++) {
      if (inView(visers[i])) renderViser(visers[i], t);
    }
    if (!reduceMotion) {
      pointer.nx += (pointer.tx - pointer.nx) * 0.05;
      pointer.ny += (pointer.ty - pointer.ny) * 0.05;
    }
    requestAnimationFrame(frame);
  }

  /* ---------- init ---------- */
  function init() {
    visers = visers.map(function (canvas) {
      return {
        canvas: canvas,
        ctx: canvas.getContext('2d'),
        shapeFn: SHAPE_FN[canvas.getAttribute('data-shape')] || drawBubble,
        particles: [],
        cssW: 0,
        cssH: 0
      };
    });
    visers.forEach(setupViser);

    if (reduceMotion) {
      visers.forEach(function (v) {
        renderViser(v, 0);
      });
    } else {
      requestAnimationFrame(frame);
    }
  }

  /* ---------- events ---------- */
  var resizeTimer;
  window.addEventListener(
    'resize',
    function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        visers.forEach(setupViser);
        if (reduceMotion) {
          visers.forEach(function (v) {
            renderViser(v, 0);
          });
        }
      }, 200);
    },
    { passive: true }
  );

  window.addEventListener(
    'mousemove',
    function (e) {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true }
  );

  init();
})();

/* ============================================================
   AutoPilotAI — Particle Constellations
   Each visual lives in its own <canvas class="viz"> inside its
   column, so particles never drift over text. Forms are rendered
   like the reference: lit gradient (warm amber/white at the top →
   plum → teal at the base), mostly hollow triangles in random
   orientations, dense core, sparse drifters around the edges.
     - sphere : a slowly rotating 3D orb (hero)
     - bubble : a sampled chat-bubble silhouette (showcase)
   ============================================================ */
(function () {
  'use strict';

  var nodes = Array.prototype.slice.call(document.querySelectorAll('.viz'));
  if (!nodes.length) return;

  var reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  var pointer = { nx: 0, ny: 0, tx: 0, ty: 0 };

  /* ---------- helpers ---------- */
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function clamp01(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }

  // Lit palette: ny 0 = top (warm), 1 = base (cool)
  function litColor(ny) {
    var wAmber = Math.max(0.02, 1.15 - ny * 1.8);
    var wWhite = 0.4 + 0.35 * (1 - ny);
    var wPlum = Math.max(0.04, 1.0 - Math.abs(ny - 0.5) * 1.7);
    var wTeal = Math.max(0.02, (ny - 0.45) * 1.9);
    var total = wAmber + wWhite + wPlum + wTeal;
    var r = Math.random() * total;
    if ((r -= wAmber) < 0) return '#ffb829';
    if ((r -= wWhite) < 0) return '#ffffff';
    if ((r -= wPlum) < 0) return '#8052ff';
    return '#15846e';
  }

  // Pre-rotated unit polygon (triangle / diamond / square) or circle
  function makeGeom() {
    var roll = Math.random();
    var sides, rot;
    if (roll < 0.66) {
      sides = 3; // triangle — dominant, like the reference
      rot = rand(0, Math.PI * 2);
    } else if (roll < 0.82) {
      return { circle: true };
    } else if (roll < 0.92) {
      sides = 4;
      rot = Math.PI / 4; // square
    } else {
      sides = 4;
      rot = 0; // diamond
    }
    rot += rand(-0.5, 0.5);
    var verts = [];
    for (var i = 0; i < sides; i++) {
      var a = rot + (i / sides) * Math.PI * 2 - Math.PI / 2;
      verts.push({ x: Math.cos(a), y: Math.sin(a) });
    }
    return { verts: verts };
  }

  function styleParticle(p, ny, drifter) {
    p.geom = makeGeom();
    p.color = litColor(ny);
    p.filled = Math.random() < 0.26; // ~74% hollow outlines
    p.sizeBase = drifter ? rand(2.5, 7) : rand(1.6, 4.8);
    p.ph = Math.random() * Math.PI * 2;
    p.tw = rand(0.0009, 0.0024);
    p.baseA = drifter ? rand(0.1, 0.32) : rand(0.5, 1);
    p.x = 0;
    p.y = 0;
    p.placed = false;
    return p;
  }

  /* ---------- 3D sphere ---------- */
  function buildSphere(count) {
    var ps = [];
    for (var i = 0; i < count; i++) {
      var r = Math.cbrt(Math.random()); // volume-uniform, denser look
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(rand(-1, 1));
      var sinPhi = Math.sin(phi);
      var ox = sinPhi * Math.cos(theta) * r;
      var oy = Math.cos(phi) * r;
      var oz = sinPhi * Math.sin(theta) * r;
      var p = { is3D: true, ox: ox, oy: oy, oz: oz };
      // colour by height — rotation is around Y, so height stays stable,
      // keeping the lit gradient (warm top → cool base) fixed
      styleParticle(p, clamp01(1 - (oy + 1) / 2), false);
      p.amp = rand(0.3, 1.1);
      p.sp = rand(0.0004, 0.0011);
      ps.push(p);
    }
    return ps;
  }

  /* ---------- 2D silhouette sampling ---------- */
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
    c.beginPath();
    c.moveTo(x + bw * 0.2, y + bh - 2);
    c.lineTo(x + bw * 0.08, y + bh + h * 0.16);
    c.lineTo(x + bw * 0.42, y + bh - 2);
    c.closePath();
    c.fill();
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

  var SHAPE_FN = { bubble: drawBubble };

  function buildSilhouette(fn, cssW, cssH) {
    var maxSide = 460;
    var scale = Math.min(1, maxSide / Math.max(cssW, cssH));
    var sw = Math.max(40, Math.round(cssW * scale));
    var sh = Math.max(40, Math.round(cssH * scale));
    var gap = 4;

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
          pts.push({ x: x, y: y });
        }
      }
    }
    // shuffle + cap
    for (var i = pts.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = pts[i];
      pts[i] = pts[j];
      pts[j] = t;
    }
    if (pts.length > 1500) pts.length = 1500;

    var kx = cssW / sw;
    var ky = cssH / sh;
    var ps = [];
    for (var k = 0; k < pts.length; k++) {
      var hx = (pts[k].x + rand(-gap, gap)) * kx;
      var hy = (pts[k].y + rand(-gap, gap)) * ky;
      var p = { is3D: false, hx: hx, hy: hy, depth: Math.random() };
      styleParticle(p, clamp01(hy / cssH), false);
      p.amp = rand(0.8, 3);
      p.sp = rand(0.0004, 0.0011);
      ps.push(p);
    }
    return ps;
  }

  /* ---------- drifters (2D, scattered around the form) ---------- */
  function addDrifters(ps, cssW, cssH) {
    var n = Math.round(ps.length * 0.13);
    for (var i = 0; i < n; i++) {
      var hx = rand(0, cssW);
      var hy = rand(0, cssH);
      var p = { is3D: false, hx: hx, hy: hy, depth: Math.random() };
      styleParticle(p, clamp01(hy / cssH), true);
      p.amp = rand(2, 6);
      p.sp = rand(0.0004, 0.0009);
      ps.push(p);
    }
  }

  /* ---------- setup one viser ---------- */
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
    v.cx = cssW / 2;
    v.cy = cssH / 2;
    v.R = Math.min(cssW, cssH) * 0.42;

    var area = cssW * cssH;
    var count = Math.round(Math.min(1500, Math.max(500, area / 320)));

    if (v.kind === 'sphere') {
      v.particles = buildSphere(count);
    } else {
      v.particles = buildSilhouette(v.shapeFn, cssW, cssH);
    }
    addDrifters(v.particles, cssW, cssH);

    // start scattered → assembles toward home
    for (var i = 0; i < v.particles.length; i++) {
      v.particles[i].x = rand(0, cssW);
      v.particles[i].y = rand(0, cssH);
    }
  }

  /* ---------- draw a micro-shape ---------- */
  function drawShape(ctx, p, x, y, size, alpha) {
    ctx.globalAlpha = alpha;
    if (p.geom.circle) {
      ctx.beginPath();
      ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
      if (p.filled) {
        ctx.fillStyle = p.color;
        ctx.fill();
      } else {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      return;
    }
    var vs = p.geom.verts;
    ctx.beginPath();
    ctx.moveTo(x + vs[0].x * size, y + vs[0].y * size);
    for (var i = 1; i < vs.length; i++) {
      ctx.lineTo(x + vs[i].x * size, y + vs[i].y * size);
    }
    ctx.closePath();
    if (p.filled) {
      ctx.fillStyle = p.color;
      ctx.fill();
    } else {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  /* ---------- render one viser ---------- */
  function renderViser(v, t) {
    var ctx = v.ctx;
    ctx.clearRect(0, 0, v.cssW, v.cssH);

    var px = pointer.nx * 16;
    var py = pointer.ny * 12;
    var ps = v.particles;

    var cosR = Math.cos(v.rot);
    var sinR = Math.sin(v.rot);
    var tilt = -0.18;
    var cosT = Math.cos(tilt);
    var sinT = Math.sin(tilt);

    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      var fx, fy, size, alpha;

      if (p.is3D) {
        var rx = p.ox * cosR - p.oz * sinR;
        var rz = p.ox * sinR + p.oz * cosR;
        var ry = p.oy * cosT - rz * sinT;
        var rz2 = p.oy * sinT + rz * cosT;
        var persp = 2.0 / (2.0 + rz2);
        var float3 = reduceMotion ? 0 : Math.sin(t * p.sp + p.ph) * p.amp;
        fx = v.cx + rx * v.R * persp + px * 0.4 + float3;
        fy = v.cy + ry * v.R * persp + py * 0.4;
        var depth = (rz2 + 1) / 2; // 0 back → 1 front
        size = p.sizeBase * persp * (0.7 + 0.5 * depth);
        alpha = p.baseA * (0.3 + 0.7 * depth);
      } else {
        fx = p.hx + (reduceMotion ? 0 : Math.sin(t * p.sp + p.ph) * p.amp) +
          px * p.depth;
        fy = p.hy + (reduceMotion ? 0 : Math.cos(t * p.sp * 0.9 + p.ph) * p.amp) +
          py * p.depth;
        size = p.sizeBase * (0.72 + 0.55 * p.depth);
        alpha = p.baseA;
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

      if (!reduceMotion) {
        alpha *= 0.72 + 0.28 * Math.sin(t * p.tw + p.ph);
      }
      if (size < 0.4) continue;
      drawShape(ctx, p, p.x, p.y, size, clamp01(alpha));
    }
    ctx.globalAlpha = 1;

    if (!reduceMotion && v.kind === 'sphere') {
      v.rot += 0.0016;
    }
  }

  function inView(v) {
    var r = v.canvas.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  /* ---------- loop ---------- */
  function frame(t) {
    for (var i = 0; i < nodes.length; i++) {
      if (inView(nodes[i])) renderViser(nodes[i], t);
    }
    if (!reduceMotion) {
      pointer.nx += (pointer.tx - pointer.nx) * 0.05;
      pointer.ny += (pointer.ty - pointer.ny) * 0.05;
    }
    requestAnimationFrame(frame);
  }

  /* ---------- init ---------- */
  function init() {
    nodes = nodes.map(function (canvas) {
      var shape = canvas.getAttribute('data-shape') || 'sphere';
      return {
        canvas: canvas,
        ctx: canvas.getContext('2d'),
        kind: shape === 'sphere' ? 'sphere' : 'silhouette',
        shapeFn: SHAPE_FN[shape] || drawBubble,
        particles: [],
        rot: rand(0, Math.PI * 2),
        cssW: 0,
        cssH: 0,
        cx: 0,
        cy: 0,
        R: 1
      };
    });
    nodes.forEach(setupViser);

    if (reduceMotion) {
      nodes.forEach(function (v) {
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
        nodes.forEach(setupViser);
        if (reduceMotion) {
          nodes.forEach(function (v) {
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

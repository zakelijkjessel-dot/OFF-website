/* ============================================================
   AutoPilotAI — Particle Constellation
   The constellation IS the brand mark. Two clustered forms drift
   on the void: an organic "brain" anchored to the hero, and a
   "spore / dandelion" field anchored behind section two.
   Micro-shapes (triangles, circles, diamonds, squares) at 2–6px,
   coloured from the brand palette. Dense in the core, sparse at
   the edges — emergence, intelligence, collective assembly.
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('constellation');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var PALETTE = [
    { c: '#8052ff', w: 46 }, // Plum Voltage — dominant
    { c: '#ffffff', w: 34 }, // Bone
    { c: '#ffb829', w: 11 }, // Amber Spark
    { c: '#15846e', w: 9 }   // Lichen
  ];
  // Spore tips lean warm/teal for a living, dandelion feel
  var TIP_PALETTE = [
    { c: '#ffb829', w: 34 },
    { c: '#15846e', w: 26 },
    { c: '#8052ff', w: 22 },
    { c: '#ffffff', w: 18 }
  ];

  var SHAPES = ['circle', 'triangle', 'diamond', 'square'];

  var reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0,
    H = 0;

  var clusters = [];
  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  /* ---------- helpers ---------- */
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function pickColor(table) {
    var total = 0,
      i;
    for (i = 0; i < table.length; i++) total += table[i].w;
    var r = Math.random() * total;
    for (i = 0; i < table.length; i++) {
      r -= table[i].w;
      if (r <= 0) return table[i].c;
    }
    return table[0].c;
  }

  function randShape() {
    return SHAPES[(Math.random() * SHAPES.length) | 0];
  }

  // Cheap value-ish noise for organic lobing
  function lobe(x, y, z) {
    return (
      Math.sin(x * 2.1 + y * 1.3) * 0.5 +
      Math.sin(y * 1.7 - z * 2.3) * 0.3 +
      Math.sin(z * 1.9 + x * 1.1) * 0.2
    );
  }

  function randDir() {
    var theta = Math.random() * Math.PI * 2;
    var phi = Math.acos(rand(-1, 1));
    var sinPhi = Math.sin(phi);
    return {
      x: sinPhi * Math.cos(theta),
      y: Math.cos(phi),
      z: sinPhi * Math.sin(theta)
    };
  }

  /* ---------- BRAIN: lobed, slightly elongated sphere ---------- */
  function buildBrain(count) {
    var pts = [];
    for (var i = 0; i < count; i++) {
      var rr = Math.cbrt(Math.random()); // denser core
      var d = randDir();
      var disp = 1 + lobe(d.x * 1.6, d.y * 1.6, d.z * 1.6) * 0.36;
      var radius = rr * disp;
      pts.push({
        x: d.x * radius * 1.16, // elongate → brain silhouette
        y: d.y * radius * 0.94,
        z: d.z * radius,
        shape: randShape(),
        color: pickColor(PALETTE),
        size: rand(2, 6) * (1 - radius * 0.34),
        sp: rand(0.4, 1.4),
        ph: Math.random() * Math.PI * 2,
        alpha: 0.34 + (1 - radius) * 0.66
      });
    }
    return pts;
  }

  /* ---------- SPORE: core + radial filaments (dandelion) ---------- */
  function buildSpore(count) {
    var pts = [];
    var coreN = Math.round(count * 0.22);

    // glowing core
    for (var i = 0; i < coreN; i++) {
      var rr = Math.cbrt(Math.random()) * 0.16;
      var d = randDir();
      pts.push({
        x: d.x * rr,
        y: d.y * rr,
        z: d.z * rr,
        shape: randShape(),
        color: pickColor(PALETTE),
        size: rand(2, 4),
        sp: rand(0.4, 1.2),
        ph: Math.random() * Math.PI * 2,
        alpha: 0.85
      });
    }

    // radial filaments ending in a small floret
    var remaining = count - coreN;
    var filaments = Math.max(60, Math.round(remaining / 4));
    for (var f = 0; f < filaments; f++) {
      var dir = randDir();
      var len = rand(0.7, 1);
      var segs = 3 + ((Math.random() * 3) | 0);
      for (var s = 0; s < segs; s++) {
        var t = 0.22 + (s / segs) * (len - 0.22);
        var isTip = s === segs - 1;
        // slight jitter so filaments feel organic, not laser-straight
        var jx = rand(-0.03, 0.03);
        var jy = rand(-0.03, 0.03);
        var jz = rand(-0.03, 0.03);
        pts.push({
          x: dir.x * t + jx,
          y: dir.y * t + jy,
          z: dir.z * t + jz,
          shape: isTip ? randShape() : 'circle',
          color: isTip ? pickColor(TIP_PALETTE) : pickColor(PALETTE),
          size: isTip ? rand(3, 6) : rand(1.6, 3),
          sp: rand(0.5, 1.6),
          ph: Math.random() * Math.PI * 2,
          alpha: isTip ? 0.95 : 0.3 + t * 0.4
        });
      }
    }
    return pts;
  }

  /* ---------- build clusters ---------- */
  function buildClusters() {
    var area = W * H;
    var total = Math.round(Math.min(1700, Math.max(620, area / 1300)));

    clusters = [
      {
        kind: 'brain',
        anchor: document.getElementById('heroAnchor'),
        particles: buildBrain(Math.round(total * 0.62)),
        rot: 0,
        rotSpeed: 0.0011,
        tilt: -0.3
      },
      {
        kind: 'spore',
        anchor: document.getElementById('sporeAnchor'),
        particles: buildSpore(Math.round(total * 0.38)),
        rot: 0.6,
        rotSpeed: 0.0009,
        tilt: -0.12
      }
    ];
  }

  /* ---------- sizing ---------- */
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!clusters.length) buildClusters();
  }

  function clusterRadius(kind) {
    var narrow = W < 860;
    if (kind === 'brain') {
      return Math.min(narrow ? W * 0.46 : W * 0.42, H * 0.52);
    }
    // spore
    return Math.min(W, H) * (narrow ? 0.38 : 0.4);
  }

  // Where on screen a cluster's anchor currently sits
  function anchorCenter(cluster) {
    var el = cluster.anchor;
    if (!el) return { x: W * 0.5, y: H * 0.5, visible: true };
    var r = el.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var visible = r.bottom > -0.35 * H && r.top < 1.35 * H;
    return { x: cx, y: cy, visible: visible };
  }

  /* ---------- draw one micro-shape ---------- */
  function drawShape(p, sx, sy, size, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;

    switch (p.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(sx, sy, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'square':
        ctx.fillRect(sx - size * 0.5, sy - size * 0.5, size, size);
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(sx, sy - size * 0.6);
        ctx.lineTo(sx + size * 0.6, sy);
        ctx.lineTo(sx, sy + size * 0.6);
        ctx.lineTo(sx - size * 0.6, sy);
        ctx.closePath();
        ctx.fill();
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(sx, sy - size * 0.62);
        ctx.lineTo(sx + size * 0.55, sy + size * 0.42);
        ctx.lineTo(sx - size * 0.55, sy + size * 0.42);
        ctx.closePath();
        ctx.fill();
        break;
    }
  }

  /* ---------- render one cluster ---------- */
  function renderCluster(cluster, t) {
    var anchor = anchorCenter(cluster);
    if (!anchor.visible) return;

    var R = clusterRadius(cluster.kind);
    var cx = anchor.x + pointer.x * 26;
    var cy = anchor.y + pointer.y * 16;

    var cos = Math.cos(cluster.rot);
    var sin = Math.sin(cluster.rot);
    var tilt = cluster.tilt + pointer.y * 0.16;
    var cosT = Math.cos(tilt);
    var sinT = Math.sin(tilt);

    var ps = cluster.particles;
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];

      var breathe = reduceMotion
        ? 0
        : Math.sin(t * 0.0006 * p.sp + p.ph) * 0.04;
      var rscale = (1 + breathe) * R;

      // rotate around Y
      var x = p.x * cos - p.z * sin;
      var z = p.x * sin + p.z * cos;
      var y = p.y;

      // tilt around X for a 3/4 view
      var y2 = y * cosT - z * sinT;
      var z2 = y * sinT + z * cosT;

      // perspective
      var persp = 1.9 / (1.9 + z2 * 0.9);

      var sx = cx + x * rscale * persp;
      var sy = cy + y2 * rscale * persp;

      var size = p.size * persp;
      if (size < 0.4) continue;

      var depth = (z2 + 1.4) / 2.8; // ~0..1
      var alpha = p.alpha * (0.4 + depth * 0.6);

      drawShape(p, sx, sy, size, Math.min(1, Math.max(0, alpha)));
    }
  }

  /* ---------- main loop ---------- */
  function render(t) {
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < clusters.length; i++) {
      renderCluster(clusters[i], t);
    }
    ctx.globalAlpha = 1;

    if (!reduceMotion) {
      for (var j = 0; j < clusters.length; j++) {
        clusters[j].rot += clusters[j].rotSpeed;
      }
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
    }

    requestAnimationFrame(render);
  }

  /* ---------- events ---------- */
  function onPointer(e) {
    pointer.tx = (e.clientX / W) * 2 - 1;
    pointer.ty = (e.clientY / H) * 2 - 1;
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('mousemove', onPointer, { passive: true });

  resize();

  if (reduceMotion) {
    render(0); // single static frame
  } else {
    requestAnimationFrame(render);
  }
})();

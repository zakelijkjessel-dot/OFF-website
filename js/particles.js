/* ============================================================
   Dala — Particle Constellation
   Thousands of micro-shapes (triangles, circles, diamonds, squares)
   clustering into an organic 3D form that drifts on the void.
   The constellation IS the brand mark — not decoration.
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

  var SHAPES = ['circle', 'triangle', 'diamond', 'square'];

  var reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0,
    H = 0;

  // Cluster placement (fraction of viewport)
  var center = { x: 0.72, y: 0.5 };
  var clusterR = 1; // pixels, set on resize

  var particles = [];
  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  var rot = 0;
  var scrollY = 0;

  /* ---------- helpers ---------- */
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function pickColor() {
    var total = 0,
      i;
    for (i = 0; i < PALETTE.length; i++) total += PALETTE[i].w;
    var r = Math.random() * total;
    for (i = 0; i < PALETTE.length; i++) {
      r -= PALETTE[i].w;
      if (r <= 0) return PALETTE[i].c;
    }
    return PALETTE[0].c;
  }

  // Cheap value-ish noise for organic lobing
  function lobe(x, y, z) {
    return (
      Math.sin(x * 2.1 + y * 1.3) * 0.5 +
      Math.sin(y * 1.7 - z * 2.3) * 0.3 +
      Math.sin(z * 1.9 + x * 1.1) * 0.2
    );
  }

  /* ---------- build the point cloud ---------- */
  function buildParticles() {
    particles = [];
    var area = W * H;
    var count = Math.round(
      Math.min(1600, Math.max(520, area / 1400))
    );

    for (var i = 0; i < count; i++) {
      // Denser core: cube-root pushes points toward center
      var rr = Math.cbrt(Math.random());

      // Random direction on a sphere
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(rand(-1, 1));
      var sinPhi = Math.sin(phi);

      var ux = sinPhi * Math.cos(theta);
      var uy = Math.cos(phi);
      var uz = sinPhi * Math.sin(theta);

      // Organic displacement → lobes (brain / spore feel)
      var disp = 1 + lobe(ux * 1.6, uy * 1.6, uz * 1.6) * 0.35;
      var radius = rr * disp;

      particles.push({
        x: ux * radius,
        y: uy * radius * 1.06,
        z: uz * radius,
        baseR: radius,
        shape: SHAPES[(Math.random() * SHAPES.length) | 0],
        color: pickColor(),
        // size shrinks toward the edges, grows in the core
        size: rand(2, 6) * (1 - radius * 0.35),
        // subtle individual drift
        sp: rand(0.4, 1.4),
        ph: Math.random() * Math.PI * 2,
        // edge particles fade
        alpha: 0.35 + (1 - radius) * 0.65
      });
    }
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

    // On narrow screens the cluster sits centered & higher
    if (W < 860) {
      center.x = 0.5;
      center.y = 0.34;
      clusterR = Math.min(W, H) * 0.42;
    } else {
      center.x = 0.72;
      center.y = 0.46;
      clusterR = Math.min(W * 0.5, H) * 0.6;
    }

    if (!particles.length) buildParticles();
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

  /* ---------- render loop ---------- */
  function render(t) {
    ctx.clearRect(0, 0, W, H);

    var cx = W * center.x + pointer.x * 26;
    var cy = H * center.y + pointer.y * 18 - scrollY * 0.06;

    var cos = Math.cos(rot);
    var sin = Math.sin(rot);

    // Painter's algorithm: sort by depth each frame is costly;
    // instead we rely on alpha + small sizes. Tilt for depth.
    var tilt = -0.32 + pointer.y * 0.18;
    var cosT = Math.cos(tilt);
    var sinT = Math.sin(tilt);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      // gentle breathing drift
      var breathe = reduceMotion
        ? 0
        : Math.sin(t * 0.0006 * p.sp + p.ph) * 0.04;
      var rscale = (1 + breathe) * clusterR;

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

      // depth shading: far points dimmer/cooler
      var depth = (z2 + 1.4) / 2.8; // ~0..1
      var alpha = p.alpha * (0.4 + depth * 0.6);

      drawShape(p, sx, sy, size, Math.min(1, Math.max(0, alpha)));
    }

    ctx.globalAlpha = 1;

    if (!reduceMotion) {
      rot += 0.0013;
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
    }

    requestAnimationFrame(render);
  }

  /* ---------- events ---------- */
  function onPointer(e) {
    var px = (e.clientX / W) * 2 - 1;
    var py = (e.clientY / H) * 2 - 1;
    pointer.tx = px;
    pointer.ty = py;
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('mousemove', onPointer, { passive: true });
  window.addEventListener(
    'scroll',
    function () {
      scrollY = window.scrollY || window.pageYOffset || 0;
    },
    { passive: true }
  );

  resize();

  if (reduceMotion) {
    // draw a single static frame
    render(0);
  } else {
    requestAnimationFrame(render);
  }
})();

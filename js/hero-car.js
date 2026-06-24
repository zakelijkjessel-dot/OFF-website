/* ============================================================
   AutoPilotAI — Hero particle car
   A 3D point cloud sampled from a real .glb car model with
   THREE.MeshSurfaceSampler, coloured by height (burnt sienna →
   warm orange → crème), glowing with additive blending + bloom.
   Falls back to a primitive car if the model is missing.
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const MODEL_URL = 'models/car.glb';
const BG = 0x181310;

const COL_LOW = new THREE.Color('#c4622d');  // burnt sienna (bottom)
const COL_MID = new THREE.Color('#e0844a');  // warm orange
const COL_TOP = new THREE.Color('#f0e7d6');  // crème (top/edges)
const COL_SPARK = new THREE.Color('#fbf3e6');

const canvas = document.getElementById('carCanvas');
if (canvas) initHero(canvas);

function initHero(canvas) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 860px)').matches;
  const PARTICLES = isMobile ? 18000 : 40000;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(BG, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.3, 9);

  // Group that holds the car so it can sit in the right half on desktop
  const carGroup = new THREE.Group();
  scene.add(carGroup);

  const triangles = makeFloatingTriangles();
  scene.add(triangles.group);

  // --- post processing (subtle bloom) ---
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.55, 0.18);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let points = null;
  let material = null;

  // --- load model, then build the point cloud ---
  loadCarObject()
    .then((root) => buildPoints(root, PARTICLES))
    .catch((err) => {
      console.warn('[hero-car] model load failed, using fallback car:', err);
      buildPoints(makeFallbackCar(), Math.min(PARTICLES, 26000));
    });

  function buildPoints(root, count) {
    const positions = sampleSurface(root, count);
    const n = positions.length / 3;

    // centre + scale to a consistent size
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      v.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      box.expandByPoint(v);
    }
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const scaleTo = 5.2 / Math.max(size.x, size.y, size.z);

    const colors = new Float32Array(n * 3);
    const rnd = new Float32Array(n);
    const minY = (box.min.y - center.y) * scaleTo;
    const maxY = (box.max.y - center.y) * scaleTo;
    const c = new THREE.Color();

    for (let i = 0; i < n; i++) {
      const x = (positions[i * 3] - center.x) * scaleTo;
      const y = (positions[i * 3 + 1] - center.y) * scaleTo;
      const z = (positions[i * 3 + 2] - center.z) * scaleTo;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const t = THREE.MathUtils.clamp((y - minY) / (maxY - minY || 1), 0, 1);
      if (t < 0.5) c.copy(COL_LOW).lerp(COL_MID, t / 0.5);
      else c.copy(COL_MID).lerp(COL_TOP, (t - 0.5) / 0.5);

      // ~12% bright crème sparkles
      if (Math.random() < 0.12) c.copy(COL_SPARK);

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      rnd[i] = Math.random();
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));

    material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: isMobile ? 8.0 : 11.0 },
        uPixelRatio: { value: renderer.getPixelRatio() }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uTime;
        uniform float uSize;
        uniform float uPixelRatio;
        attribute vec3 color;
        attribute float aRnd;
        varying vec3 vColor;
        varying float vTw;
        void main() {
          vColor = color;
          vec3 p = position;
          float ph = aRnd * 6.2831853;
          p.x += sin(uTime * 0.5 + ph) * 0.018;
          p.y += cos(uTime * 0.42 + ph) * 0.018;
          p.z += sin(uTime * 0.37 + ph) * 0.018;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uSize * uPixelRatio * (0.55 + aRnd * 0.9) / max(-mv.z, 0.001);
          gl_Position = projectionMatrix * mv;
          vTw = 0.65 + 0.35 * sin(uTime * 2.0 + aRnd * 24.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTw;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.05, d);
          gl_FragColor = vec4(vColor * vTw, a);
        }
      `
    });

    points = new THREE.Points(geom, material);
    carGroup.add(points);
    layout();
  }

  /* ---------- surface sampling across all meshes ---------- */
  function sampleSurface(root, count) {
    root.updateWorldMatrix(true, true);
    const meshes = [];
    root.traverse((o) => {
      if (o.isMesh && o.geometry && o.geometry.attributes.position) {
        meshes.push(o);
      }
    });
    if (!meshes.length) return new Float32Array(0);

    const areas = meshes.map((m) => geometryArea(m.geometry));
    const total = areas.reduce((a, b) => a + b, 0) || 1;

    const positions = new Float32Array(count * 3);
    const tmp = new THREE.Vector3();
    let ptr = 0;

    meshes.forEach((mesh, i) => {
      let c = Math.round(count * (areas[i] / total));
      if (i === meshes.length - 1) c = count - ptr; // fill remainder
      if (c <= 0) return;
      const sampler = new MeshSurfaceSampler(mesh).build();
      for (let k = 0; k < c && ptr < count; k++) {
        sampler.sample(tmp);
        tmp.applyMatrix4(mesh.matrixWorld);
        positions[ptr * 3] = tmp.x;
        positions[ptr * 3 + 1] = tmp.y;
        positions[ptr * 3 + 2] = tmp.z;
        ptr++;
      }
    });
    return positions.subarray(0, ptr * 3);
  }

  function geometryArea(geom) {
    const pos = geom.attributes.position;
    const idx = geom.index;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const cc = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    let area = 0;
    const tris = idx ? idx.count / 3 : pos.count / 3;
    for (let t = 0; t < tris; t++) {
      const i0 = idx ? idx.getX(t * 3) : t * 3;
      const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      a.fromBufferAttribute(pos, i0);
      b.fromBufferAttribute(pos, i1);
      cc.fromBufferAttribute(pos, i2);
      ab.subVectors(b, a);
      ac.subVectors(cc, a);
      area += ab.cross(ac).length() * 0.5;
    }
    return area || 1;
  }

  /* ---------- model loading ---------- */
  function loadCarObject() {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      try {
        const draco = new DRACOLoader();
        draco.setDecoderPath(
          'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/'
        );
        loader.setDRACOLoader(draco);
      } catch (e) {
        /* draco optional */
      }
      loader.load(
        MODEL_URL,
        (gltf) => resolve(gltf.scene || gltf.scenes[0]),
        undefined,
        (err) => reject(err)
      );
    });
  }

  /* ---------- fallback: a primitive low-poly car ---------- */
  function makeFallbackCar() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 1.8));
    body.position.y = 0.55;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.75, 1.55));
    cabin.position.set(-0.15, 1.2, 0);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 1.7));
    hood.position.set(1.55, 0.85, 0);
    g.add(body, cabin, hood);
    const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 18);
    [
      [1.3, 0.55, 0.95],
      [1.3, 0.55, -0.95],
      [-1.3, 0.55, 0.95],
      [-1.3, 0.55, -0.95]
    ].forEach((p) => {
      const w = new THREE.Mesh(wheelGeo);
      w.rotation.x = Math.PI / 2;
      w.position.set(p[0], p[1], p[2]);
      g.add(w);
    });
    return g;
  }

  /* ---------- floating background triangles ---------- */
  function makeFloatingTriangles() {
    const group = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({
      color: 0xc4622d,
      transparent: true,
      opacity: 0.22
    });
    const items = [];
    for (let i = 0; i < 15; i++) {
      const r = 0.18 + Math.random() * 0.4;
      const geo = new THREE.BufferGeometry();
      const verts = [];
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + Math.random() * 0.4;
        verts.push(Math.cos(a) * r, Math.sin(a) * r, 0);
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      const line = new THREE.LineLoop(geo, mat);
      line.position.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 7,
        -3 - Math.random() * 5
      );
      line.rotation.set(Math.random() * 6.28, Math.random() * 6.28, 0);
      line.userData = {
        rx: (Math.random() - 0.5) * 0.2,
        ry: (Math.random() - 0.5) * 0.2,
        fy: 0.1 + Math.random() * 0.2,
        ph: Math.random() * 6.28,
        baseY: line.position.y
      };
      group.add(line);
      items.push(line);
    }
    return { group, items };
  }

  /* ---------- responsive layout ---------- */
  function layout() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
    camera.aspect = w / h;

    const mobile = w <= 860;
    // car sits right-of-centre on desktop, centred (lower) on mobile
    carGroup.position.x = mobile ? 0 : 2.0;
    carGroup.position.y = mobile ? -0.6 : 0.1;
    camera.position.z = mobile ? 10.5 : 9;
    if (material) material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    camera.updateProjectionMatrix();
  }

  /* ---------- animation ---------- */
  const clock = new THREE.Clock();
  let visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      (entries) => entries.forEach((e) => (visible = e.isIntersecting)),
      { threshold: 0 }
    ).observe(canvas);
  }

  function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;
    const t = clock.getElapsedTime();

    if (points) {
      material.uniforms.uTime.value = t;
      points.rotation.y = reduce ? 0.5 : t * 0.12; // slow yaw
    }
    triangles.items.forEach((tr) => {
      const d = tr.userData;
      tr.rotation.x += d.rx * 0.01;
      tr.rotation.y += d.ry * 0.01;
      if (!reduce) tr.position.y = d.baseY + Math.sin(t * d.fy + d.ph) * 0.3;
    });

    composer.render();
  }

  layout();
  window.addEventListener('resize', layout, { passive: true });
  tick();
}

import { $, S, clamp, lerp, ease, sleep, safe, RM } from "./core.js";
// A small 3D stage on top of three.js: orbit camera, theme-aware colours, HTML labels,
// click picking and draggable objects. Every 3D picture on the page is built on this.
export function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#888888"; }
export const themeSubs = new Set();
if (typeof window !== "undefined") safe("theme-watch", () => {
  const fire = () => themeSubs.forEach(f => { try { f(); } catch (e) { console.error(e); } });
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  if (mq.addEventListener) mq.addEventListener("change", fire); else if (mq.addListener) mq.addListener(fire);
  new MutationObserver(fire).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-skin"] });
});
export const HAS_GL = (() => {
  if (typeof document === "undefined") return false;
  try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl"))); }
  catch (e) { return false; }
})();
export const isDark = () => {
  const c = new THREE.Color(cssVar("--paper"));
  return (c.r + c.g + c.b) / 3 < 0.4;
};

export class Stage {
  constructor(host, o = {}) {
    this.host = host; this.ok = false;
    if (typeof THREE === "undefined" || !HAS_GL) {
      host.innerHTML = '<div class="nogl">This 3D picture needs WebGL, and this browser has it turned off. The rest of the page still works.</div>';
      return;
    }
    this.ok = true;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    host.appendChild(r.domElement);
    r.domElement.tabIndex = 0;
    r.domElement.setAttribute("aria-label", (o.label || "3D picture") + ". Arrow keys turn it, plus and minus zoom.");
    this.labs = document.createElement("div"); this.labs.className = "labs"; host.appendChild(this.labs);
    if (o.hint !== false) {
      const h = document.createElement("div"); h.className = "hint3";
      h.textContent = o.hint || "drag to turn · click, then scroll to zoom · double-click to reset";
      host.appendChild(h);
    }
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(o.fov || 36, 1, 0.1, 300);
    this.target = new THREE.Vector3(...(o.target || [0, 0, 0]));
    this.dist = o.dist || 12; this.theta = o.theta ?? 0.7; this.phi = o.phi ?? 1.05;
    this.minDist = o.minDist || this.dist * 0.4; this.maxDist = o.maxDist || this.dist * 2.2;
    this.home = { dist: this.dist, theta: this.theta, phi: this.phi };
    this.auto = !RM && !!o.autoRotate; this.autoSpeed = o.autoSpeed || 0.0018;
    this.labels = []; this.ticks = new Set(); this.dirty = true; this.visible = false;
    this.draggables = []; this.themed = []; this.themeFns = [];
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x556070, 0.85); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 0.65); this.sun.position.set(6, 12, 8); this.scene.add(this.sun);
    this.applyTheme();
    themeSubs.add(() => this.applyTheme());
    this.bindInput();
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
    new IntersectionObserver(es => { this.visible = es.some(e => e.isIntersecting); if (this.visible) this.loop(); }).observe(host);
  }
  // ---- theme ----
  applyTheme() {
    this.scene.background = new THREE.Color(cssVar("--stage"));
    const dark = isDark();
    this.hemi.intensity = dark ? 0.8 : 0.62;
    this.sun.intensity = dark ? 0.7 : 0.95;
    this.hemi.groundColor = new THREE.Color(dark ? 0x222a38 : 0x8090a0);
    this.themed.forEach(t => t.m.color.set(cssVar(t.v)));
    this.themeFns.forEach(f => f());
    this.dirty = true;
  }
  onTheme(f) { this.themeFns.push(f); f(); }
  mat(v, extra) {
    const m = new THREE.MeshStandardMaterial(Object.assign({ color: cssVar(v), roughness: 0.55, metalness: 0.05 }, extra || {}));
    this.themed.push({ m, v }); return m;
  }
  basic(v, extra) {
    const m = new THREE.MeshBasicMaterial(Object.assign({ color: cssVar(v) }, extra || {}));
    this.themed.push({ m, v }); return m;
  }
  lineMat(v, opacity) {
    const m = new THREE.LineBasicMaterial({ color: cssVar(v), transparent: opacity != null && opacity < 1, opacity: opacity ?? 1 });
    this.themed.push({ m, v }); return m;
  }
  // ---- camera / loop ----
  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.dirty = true;
    if (this.visible) this.render();
  }
  updateCam() {
    const t = this.target, sp = Math.sin(this.phi);
    this.camera.position.set(t.x + this.dist * sp * Math.sin(this.theta), t.y + this.dist * Math.cos(this.phi), t.z + this.dist * sp * Math.cos(this.theta));
    this.camera.lookAt(t);
  }
  loop() {
    if (this.running) return;
    this.running = true;
    const fr = now => {
      if (!this.visible) { this.running = false; return; }
      let busy = false;
      this.ticks.forEach(fn => { if (fn(now) === false) this.ticks.delete(fn); else busy = true; });
      if (this.auto) { this.theta += this.autoSpeed; this.dirty = true; }
      if (this.dirty || busy) { this.render(); this.dirty = false; }
      requestAnimationFrame(fr);
    };
    requestAnimationFrame(fr);
  }
  render() { this.updateCam(); this.renderer.render(this.scene, this.camera); this.placeLabels(); }
  tick(fn) { this.ticks.add(fn); if (this.visible) this.loop(); }
  invalidate() { this.dirty = true; }
  // tween helper bound to this stage's frame loop; resolves when done
  anim(ms, fn) {
    if (RM || ms <= 0 || !this.visible) { fn(1); this.dirty = true; return Promise.resolve(); }
    return new Promise(res => {
      let t0 = null;
      this.tick(now => {
        if (t0 == null) t0 = now;
        const p = Math.min(1, (now - t0) / ms);
        fn(p);
        if (p >= 1) { res(); return false; }
        return true;
      });
    });
  }
  // ---- labels ----
  label(html, cls) {
    const el = document.createElement("div");
    el.className = "lab3" + (cls ? " " + cls : "");
    el.innerHTML = html;
    this.labs.appendChild(el);
    const L = { el, pos: new THREE.Vector3(), show: true, center: /axis/.test(cls || ""), set(h) { if (h !== this._h) { el.innerHTML = h; this._h = h; } } };
    this.labels.push(L);
    return L;
  }
  placeLabels() {
    const w = this.host.clientWidth, h = this.host.clientHeight, v = new THREE.Vector3();
    this.labels.forEach(L => {
      if (!L.show) { L.el.style.display = "none"; return; }
      v.copy(L.pos).project(this.camera);
      if (v.z > 1 || v.z < -1) { L.el.style.display = "none"; return; }
      L.el.style.display = "";
      L.el.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px,${((1 - v.y) / 2 * h).toFixed(1)}px) translate(-50%,${L.center ? "-50%" : "-100%"})`;
    });
  }
  // ---- input ----
  bindInput() {
    const el = this.renderer.domElement, ray = new THREE.Raycaster();
    let down = null, active = false;
    const ndc = e => {
      const r = el.getBoundingClientRect();
      return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    this.rayAt = e => { this.updateCam(); ray.setFromCamera(ndc(e), this.camera); return ray; };
    el.addEventListener("pointerdown", e => {
      this.auto = false; active = true;
      const r = this.rayAt(e);
      let drag = null;
      for (const d of this.draggables) { if (d.enabled === false) continue; if (r.intersectObject(d.obj, true).length) { drag = d; break; } }
      down = { x: e.clientX, y: e.clientY, th: this.theta, ph: this.phi, drag, moved: false, type: e.pointerType };
      if (drag) { el.setPointerCapture(e.pointerId); if (drag.start) drag.start(); e.preventDefault(); }
      else if (e.pointerType === "mouse") el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", e => {
      if (!down) {
        if (e.pointerType === "mouse" && this.draggables.length) {
          const r = this.rayAt(e);
          el.style.cursor = this.draggables.some(d => d.enabled !== false && r.intersectObject(d.obj, true).length) ? "pointer" : "";
        }
        return;
      }
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) down.moved = true;
      if (down.drag) { down.drag.move(this.rayAt(e)); this.dirty = true; return; }
      this.theta = down.th - dx * 0.008;
      if (down.type === "mouse") this.phi = clamp(down.ph - dy * 0.006, 0.12, 1.53);
      this.dirty = true;
    });
    const up = e => {
      if (!down) return;
      const d = down; down = null;
      if (d.drag) { if (d.drag.end) d.drag.end(); return; }
      if (!d.moved && this.onPick) this.onPick(this.rayAt(e), e);
    };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", () => { down = null; });
    el.addEventListener("pointerleave", () => { if (!down) active = false; });
    el.addEventListener("wheel", e => {
      if (!active) return;
      e.preventDefault();
      this.dist = clamp(this.dist * (1 + Math.sign(e.deltaY) * 0.08), this.minDist, this.maxDist);
      this.dirty = true;
    }, { passive: false });
    el.addEventListener("dblclick", () => { Object.assign(this, this.home); this.dirty = true; });
    el.addEventListener("keydown", e => {
      const k = e.key;
      if (k === "ArrowLeft") this.theta += 0.12; else if (k === "ArrowRight") this.theta -= 0.12;
      else if (k === "ArrowUp") this.phi = clamp(this.phi - 0.08, 0.12, 1.53);
      else if (k === "ArrowDown") this.phi = clamp(this.phi + 0.08, 0.12, 1.53);
      else if (k === "+" || k === "=") this.dist = clamp(this.dist * 0.92, this.minDist, this.maxDist);
      else if (k === "-") this.dist = clamp(this.dist * 1.08, this.minDist, this.maxDist);
      else return;
      e.preventDefault(); this.auto = false; this.dirty = true;
    });
  }
  // drag along a horizontal plane at height y (or a custom ray handler)
  addDrag(obj, onMove, opts) {
    const d = Object.assign({ obj, move: onMove }, opts || {});
    this.draggables.push(d);
    return d;
  }
  // ---- geometry helpers ----
  grid(size, step, y, v, opacity) {
    const pts = [];
    for (let i = -size; i <= size + 1e-9; i += step) {
      pts.push(-size, y, i, size, y, i, i, y, -size, i, y, size);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const ls = new THREE.LineSegments(g, this.lineMat(v || "--rule", opacity ?? 1));
    this.scene.add(ls);
    return ls;
  }
  segments(arr, v, opacity) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    const ls = new THREE.LineSegments(g, this.lineMat(v, opacity));
    this.scene.add(ls);
    return ls;
  }
  arrow(v, radius) {
    const rad = radius || 0.045, m = this.mat(v);
    const grp = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m);
    const head = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.8, rad * 7, 16), m);
    grp.add(shaft, head);
    this.scene.add(grp);
    const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
    return {
      grp,
      set(from, to) {
        dir.subVectors(to, from);
        const len = dir.length();
        if (len < 1e-4) { grp.visible = false; return; }
        grp.visible = true;
        const hl = Math.min(rad * 7, len * 0.5);
        dir.normalize();
        grp.position.copy(from);
        grp.quaternion.setFromUnitVectors(up, dir);
        shaft.scale.set(1, Math.max(len - hl, 1e-4), 1);
        shaft.position.set(0, (len - hl) / 2, 0);
        head.scale.set(1, hl / (rad * 7), 1);
        head.position.set(0, len - hl / 2, 0);
      }
    };
  }
  sphere(v, r, extra) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), this.mat(v, extra));
    this.scene.add(s);
    return s;
  }
  tube(points, radius, v, extra) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, radius, 8, false), this.mat(v, extra));
    mesh.userData.curve = curve;
    this.scene.add(mesh);
    return mesh;
  }
}

// A height-field surface y = fn(x, z) on a grid; call .update(fn) to reshape it.
export function heightSurface(stage, o) {
  const n = o.n || 60, [x0, x1] = o.x, [z0, z1] = o.z;
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array((n + 1) * (n + 1) * 3), colors = new Float32Array((n + 1) * (n + 1) * 3), idx = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const a = i * (n + 1) + j, b = a + 1, c = a + (n + 1), d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  g.setIndex(idx);
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.75, metalness: 0, transparent: !!o.opacity, opacity: o.opacity || 1 });
  const mesh = new THREE.Mesh(g, mat);
  stage.scene.add(mesh);
  const wire = o.wire ? new THREE.LineSegments(new THREE.BufferGeometry(), stage.lineMat(o.wire, o.wireOpacity ?? 0.35)) : null;
  if (wire) stage.scene.add(wire);
  let lastFn = o.fn;
  const lo = new THREE.Color(), hi = new THREE.Color(), tmp = new THREE.Color();
  function paint() {
    lo.set(cssVar(o.lo || "--wash")); hi.set(cssVar(o.hi || "--data"));
    const [y0, y1] = o.range;
    for (let k = 0; k < pos.length / 3; k++) {
      const t = clamp((pos[k * 3 + 1] - y0) / (y1 - y0), 0, 1);
      tmp.copy(lo).lerp(hi, o.invert ? 1 - t : t);
      colors[k * 3] = tmp.r; colors[k * 3 + 1] = tmp.g; colors[k * 3 + 2] = tmp.b;
    }
    g.attributes.color.needsUpdate = true;
  }
  function update(fn) {
    lastFn = fn || lastFn;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
      const x = x0 + (x1 - x0) * j / n, z = z0 + (z1 - z0) * i / n, k = (i * (n + 1) + j) * 3;
      pos[k] = x; pos[k + 1] = lastFn(x, z); pos[k + 2] = z;
    }
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
    paint();
    if (wire) {
      const step = o.wireStep || 1, arr = [];
      for (let x = Math.ceil(x0 / step) * step; x <= x1 + 1e-9; x += step) {
        for (let s = 0; s < 40; s++) {
          const za = z0 + (z1 - z0) * s / 40, zb = z0 + (z1 - z0) * (s + 1) / 40;
          arr.push(x, lastFn(x, za) + 0.004, za, x, lastFn(x, zb) + 0.004, zb);
        }
      }
      for (let z = Math.ceil(z0 / step) * step; z <= z1 + 1e-9; z += step) {
        for (let s = 0; s < 40; s++) {
          const xa = x0 + (x1 - x0) * s / 40, xb = x0 + (x1 - x0) * (s + 1) / 40;
          arr.push(xa, lastFn(xa, z) + 0.004, z, xb, lastFn(xb, z) + 0.004, z);
        }
      }
      wire.geometry.dispose();
      wire.geometry = new THREE.BufferGeometry();
      wire.geometry.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    }
    stage.invalidate();
  }
  stage.onTheme(() => { if (pos[1] !== undefined) paint(); });
  update(o.fn);
  return { mesh, update, wire };
}

// Contour lines of fn on a grid (marching squares), returned as flat segment arrays.
export function contours(fn, x0, x1, z0, z1, n, levels, yOf) {
  const out = [], xs = i => x0 + (x1 - x0) * i / n, zs = j => z0 + (z1 - z0) * j / n;
  const V = [];
  for (let j = 0; j <= n; j++) { V.push([]); for (let i = 0; i <= n; i++) V[j].push(fn(xs(i), zs(j))); }
  levels.forEach(L => {
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const c = [[xs(i), zs(j), V[j][i]], [xs(i + 1), zs(j), V[j][i + 1]], [xs(i + 1), zs(j + 1), V[j + 1][i + 1]], [xs(i), zs(j + 1), V[j + 1][i]]];
      const pts = [];
      for (let k = 0; k < 4; k++) {
        const p = c[k], q = c[(k + 1) % 4];
        if ((p[2] < L) !== (q[2] < L)) {
          const t = (L - p[2]) / (q[2] - p[2]);
          pts.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
        }
      }
      for (let k = 0; k + 1 < pts.length; k += 2) {
        const [ax, az] = pts[k], [bx, bz] = pts[k + 1];
        out.push(ax, yOf(ax, az, L), az, bx, yOf(bx, bz, L), bz);
      }
    }
  });
  return out;
}

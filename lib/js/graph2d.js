import { S, T, f4, tween, marker, RM } from "./core.js";
// A 2D expression graph drawn like Karpathy's draw_dot: record boxes "label | data | grad"
// and round op nodes. Shared by the Value builder and most of Part 2.
export function graph2D(svg, spec) {
  const labW = spec.labW || 26, cw = spec.cellW || 82, W = labW + 2 * cw, H = 30;
  const pre = spec.prefix || ("g" + Math.random().toString(36).slice(2, 7));
  const mk = marker(svg, pre + "-mk"), mkp = marker(svg, pre + "-mkp", "mkp");
  const edgeG = S("g", null, svg), nodeG = S("g", null, svg), dotG = S("g", null, svg);
  const N = {}, OPS = {}, E = {};
  for (const id in spec.nodes) N[id] = Object.assign({ label: id }, spec.nodes[id]);
  for (const id in spec.ops) OPS[id] = Object.assign({}, spec.ops[id]);
  for (const id in OPS) {
    const o = OPS[id];
    o.edges = [];
    const grp = S("g", { class: "g-edge" }, edgeG);
    o.ins.forEach(i => {
      const n = N[i], x1 = n.x + W, y1 = n.y + H / 2, x2 = o.cx - 14, y2 = o.cy;
      const p = S("path", { d: `M${x1},${y1} C${x1 + 18},${y1} ${x2 - 18},${y2} ${x2},${y2}`, class: "edge", "marker-end": mk }, grp);
      E[i + ">" + id] = p; o.edges.push(p);
    });
    const out = N[o.out], x1 = o.cx + 14, x2 = out.x - 1;
    const p = S("path", { d: `M${x1},${o.cy} C${x1 + 10},${o.cy} ${x2 - 10},${out.y + H / 2} ${x2},${out.y + H / 2}`, class: "edge", "marker-end": mk }, grp);
    E[id + ">" + o.out] = p; o.edges.push(p);
    o.edgeG = grp;
    const og = S("g", { class: "opn g-node" + (o.sym.length > 2 ? " wide" : "") }, nodeG);
    S("circle", { cx: o.cx, cy: o.cy, r: o.sym.length > 2 ? 17 : 13 }, og);
    T(og, o.cx, o.cy + 4, o.sym, "", "middle");
    o.g = og;
  }
  for (const id in N) {
    const n = N[id];
    const g = S("g", { class: "rec g-node" }, nodeG);
    S("rect", { x: n.x, y: n.y, width: W, height: H, rx: 3, class: "bx" }, g);
    S("line", { x1: n.x + labW, x2: n.x + labW, y1: n.y, y2: n.y + H }, g);
    S("line", { x1: n.x + labW + cw, x2: n.x + labW + cw, y1: n.y, y2: n.y + H }, g);
    T(g, n.x + labW / 2, n.y + 19.5, n.label, "lab", "middle");
    n.dt = T(g, n.x + labW + cw / 2, n.y + 19, "", "dat", "middle");
    n.gt = T(g, n.x + labW + cw * 1.5, n.y + 19, "", "grd", "middle");
    n.g = g;
  }
  const api = {
    N, OPS, E, W, H,
    setData(id, v) { N[id].dt.textContent = "data " + (v == null ? "?" : f4(v)); },
    setGrad(id, v) { N[id].gt.textContent = "grad " + (v == null ? "?" : f4(v)); N[id].gt.classList.toggle("zero", v === 0 || v == null); },
    fill(dataOf, gradOf) {
      for (const id in N) { this.setData(id, dataOf ? dataOf(id) : N[id].data); this.setGrad(id, gradOf ? gradOf(id) : 0); }
    },
    flash(id, cls) { const g = N[id].g; g.classList.add(cls); setTimeout(() => g.classList.remove(cls), RM ? 700 : 950); },
    mark(id, cls, on) { N[id].g.classList.toggle(cls, on); },
    clearMarks(...cls) { for (const id in N) cls.forEach(c => N[id].g.classList.remove(c)); },
    ghost(id, on) { N[id].g.classList.toggle("faded", on); },
    ghostOp(id, on) { OPS[id].g.classList.toggle("faded", on); OPS[id].edgeG.classList.toggle("faded", on); },
    setMode(m) {
      Object.values(E).forEach(p => {
        if (m === "prev") { p.removeAttribute("marker-end"); p.setAttribute("marker-start", "url(#" + pre + "-mkp)"); p.classList.add("prev"); }
        else { p.removeAttribute("marker-start"); p.setAttribute("marker-end", mk); p.classList.remove("prev"); }
      });
    },
    drawIn(opId) {
      if (RM) return;
      OPS[opId].edges.forEach(p => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
        p.getBoundingClientRect();
        p.style.transition = "stroke-dashoffset .6s ease"; p.style.strokeDashoffset = 0;
        setTimeout(() => { p.style.transition = ""; p.style.strokeDasharray = ""; p.style.strokeDashoffset = ""; }, 700);
      });
    },
    async dot(key, reverse, cls, ms) {
      const p = E[key]; if (!p || RM) return;
      const len = p.getTotalLength(), c = S("circle", { r: 5, class: cls }, dotG);
      await tween(ms || 420, u => { const pt = p.getPointAtLength((reverse ? 1 - u : u) * len); c.setAttribute("cx", pt.x); c.setAttribute("cy", pt.y); });
      c.remove();
    }
  };
  return api;
}

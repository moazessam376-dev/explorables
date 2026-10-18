// The derivative explorer: Karpathy's parabola, a draggable point, a zoom box, and a plot
// that collects every measured slope until the derivative line appears.
safe("deriv", () => {
  const f = x => 3 * x * x - 4 * x + 5;
  const main = $("#dv-main"), zoom = $("#dv-zoom"), sl = $("#dv-slopes");
  const L = 44, R = 508, Tp = 12, B = 300, X0 = -5.5, X1 = 5.5, Y0 = -8, Y1 = 105;
  const sx = x => L + (x - X0) / (X1 - X0) * (R - L);
  const sy = y => B - (y - Y0) / (Y1 - Y0) * (B - Tp);
  const ix = px => X0 + (px - L) / (R - L) * (X1 - X0);
  const clip = S("clipPath", { id: "dv-clip" }, S("defs", null, main));
  S("rect", { x: L, y: Tp, width: R - L, height: B - Tp }, clip);
  for (let x = -4; x <= 4; x += 2) { S("line", { x1: sx(x), x2: sx(x), y1: Tp, y2: B, class: "gridl" }, main); T(main, sx(x), B + 15, String(x), "tick", "middle"); }
  for (let y = 0; y <= 100; y += 20) { S("line", { x1: L, x2: R, y1: sy(y), y2: sy(y), class: "gridl" }, main); T(main, L - 6, sy(y) + 3, String(y), "tick", "end"); }
  S("line", { x1: L, x2: R, y1: sy(0), y2: sy(0), class: "ax" }, main);
  S("line", { x1: sx(0), x2: sx(0), y1: Tp, y2: B, class: "ax" }, main);
  T(main, R - 2, B + 28, "x", "tick", "end");
  let d = "";
  for (let i = 0; i <= 200; i++) { const x = -5 + 10 * i / 200; d += (i ? "L" : "M") + sx(x).toFixed(1) + "," + sy(f(x)).toFixed(1); }
  const cg = S("g", { "clip-path": "url(#dv-clip)" }, main);
  S("path", { d, class: "curve" }, cg);
  const trueL = S("line", { class: "sl-true" }, cg);
  const secL = S("line", { class: "sl-grad" }, cg);
  const runL = S("line", { class: "ln-nudge" }, main);
  const riseL = S("line", { class: "ln-rise" }, main);
  const Q = S("circle", { r: 4.5, class: "pt-nudge" }, main);
  const P = S("circle", { r: 7, class: "pt-data draggable" }, main);
  const pLab = T(main, 0, 0, "", "lbl-d");
  const arr = S("path", { class: "arr-ok" }, main);
  const arrLab = T(main, 0, 0, "", "lbl-ok", "middle");
  T(main, sx(-5) + 4, sy(98), "f(x) = 3x² − 4x + 5", "lbl");

  // zoom inset
  const ZL = 14, ZR = 226, ZT = 14, ZB = 226;
  S("rect", { x: ZL, y: ZT, width: ZR - ZL, height: ZB - ZT, class: "box-frame" }, zoom);
  const zc = S("clipPath", { id: "dv-zclip" }, S("defs", null, zoom));
  S("rect", { x: ZL, y: ZT, width: ZR - ZL, height: ZB - ZT }, zc);
  const zg = S("g", { "clip-path": "url(#dv-zclip)" }, zoom);
  const zCurve = S("path", { class: "curve" }, zg);
  const zSec = S("line", { class: "sl-grad" }, zg);
  const zRun = S("line", { class: "ln-nudge" }, zoom);
  const zRise = S("line", { class: "ln-rise" }, zoom);
  const zP = S("circle", { r: 5, class: "pt-data" }, zoom);
  const zQ = S("circle", { r: 4.5, class: "pt-nudge" }, zoom);
  const zRunT = T(zoom, 0, 0, "run = h", "lbl-n", "middle");
  const zRiseT = T(zoom, 0, 0, "rise", "lbl-g");

  // slopes plot
  const SL = 44, SR = 508, ST = 10, SB = 176, SY0 = -36, SY1 = 30;
  const ssx = x => SL + (x - X0) / (X1 - X0) * (SR - SL);
  const ssy = y => SB - (y - SY0) / (SY1 - SY0) * (SB - ST);
  for (let x = -4; x <= 4; x += 2) { S("line", { x1: ssx(x), x2: ssx(x), y1: ST, y2: SB, class: "gridl" }, sl); T(sl, ssx(x), SB + 15, String(x), "tick", "middle"); }
  for (let y = -30; y <= 30; y += 15) { S("line", { x1: SL, x2: SR, y1: ssy(y), y2: ssy(y), class: "gridl" }, sl); T(sl, SL - 6, ssy(y) + 3, String(y), "tick", "end"); }
  S("line", { x1: SL, x2: SR, y1: ssy(0), y2: ssy(0), class: "ax" }, sl);
  T(sl, SL + 4, ST + 10, "slope", "lbl-g");
  T(sl, SR, SB + 15, "x", "tick", "end");
  const dLine = S("line", { x1: ssx(-5), y1: ssy(6 * -5 - 4), x2: ssx(5), y2: ssy(6 * 5 - 4), class: "curve-d" }, sl);
  const dLab = T(sl, ssx(4.3), ssy(6 * 4.3 - 4) + 16, "f′(x) = 6x − 4", "lbl-g", "end");
  dLine.style.display = dLab.style.display = "none";
  const dotsG = S("g", null, sl);
  const curDot = S("circle", { r: 5, class: "pt-grad" }, sl);
  let lastDotX = null;

  const xs = $("#dv-x"), hs = $("#dv-h");
  let x = 3;
  const hval = () => Number((10 ** +hs.value).toPrecision(2));
  const line = (el, x1, y1, x2, y2) => { el.setAttribute("x1", x1); el.setAttribute("y1", y1); el.setAttribute("x2", x2); el.setAttribute("y2", y2); };
  function render() {
    const h = hval();
    const fx = f(x), fxh = f(x + h), rise = fxh - fx, slope = rise / h, tru = 6 * x - 4;
    const isTwoThirds = Math.abs(x - 2 / 3) < 1e-12;
    $("#dv-x-o").textContent = isTwoThirds ? "2/3" : py(+x.toFixed(2));
    $("#dv-h-o").textContent = py(h);
    P.setAttribute("cx", sx(x)); P.setAttribute("cy", sy(fx));
    const qx = sx(x + h), qy = sy(fxh), vis = Math.abs(qx - sx(x)) > 2.5;
    Q.setAttribute("cx", qx); Q.setAttribute("cy", qy); Q.setAttribute("opacity", vis ? 1 : 0);
    line(runL, sx(x), sy(fx), qx, sy(fx)); runL.setAttribute("opacity", vis ? 1 : 0);
    line(riseL, qx, sy(fx), qx, qy); riseL.setAttribute("opacity", vis ? 1 : 0);
    const span = 3.2;
    line(secL, sx(x - span), sy(fx - slope * span), sx(x + span), sy(fx + slope * span));
    line(trueL, sx(x - span), sy(fx - tru * span), sx(x + span), sy(fx + tru * span));
    trueL.setAttribute("opacity", Math.abs(slope - tru) > 0.3 ? 1 : 0);
    pLab.textContent = "(" + (isTwoThirds ? "2/3" : +x.toFixed(2)) + ", " + +fx.toFixed(2) + ")";
    const right = sx(x) < R - 90;
    pLab.setAttribute("x", sx(x) + (right ? 11 : -11)); pLab.setAttribute("y", sy(fx) - 11);
    pLab.setAttribute("text-anchor", right ? "start" : "end");
    const ay = Math.min(B - 14, sy(fx) + 28);
    if (Math.abs(tru) < 0.05) {
      arr.setAttribute("d", ""); arrLab.textContent = "flat: the bottom";
      arrLab.setAttribute("x", sx(x)); arrLab.setAttribute("y", ay + 4);
    } else {
      const dir = tru > 0 ? -1 : 1, x0 = sx(x), x1 = x0 + dir * 42;
      arr.setAttribute("d", `M${x0},${ay} L${x1},${ay} M${x1 - dir * 7},${ay - 5} L${x1},${ay} L${x1 - dir * 7},${ay + 5}`);
      arrLab.textContent = "downhill"; arrLab.setAttribute("x", x1 + dir * 36); arrLab.setAttribute("y", ay + 4);
    }
    // zoom window [x - 0.35h, x + 1.35h]
    const wx0 = x - 0.35 * h, ww = 1.7 * h, ys = [];
    for (let i = 0; i <= 60; i++) ys.push(f(wx0 + ww * i / 60));
    let ymin = Math.min(...ys, fx, fxh), ymax = Math.max(...ys, fx, fxh), pad = (ymax - ymin) * 0.2;
    if (!(pad > 0)) pad = Math.max(Math.abs(fx) * 1e-15, 1e-300);
    ymin -= pad; ymax += pad;
    const zx = v => ZL + (v - wx0) / ww * (ZR - ZL), zy = v => ZB - (v - ymin) / (ymax - ymin) * (ZB - ZT);
    let zd = "";
    ys.forEach((yv, i) => { zd += (i ? "L" : "M") + (ZL + (ZR - ZL) * i / 60).toFixed(2) + "," + zy(yv).toFixed(2); });
    zCurve.setAttribute("d", zd);
    zP.setAttribute("cx", zx(x)); zP.setAttribute("cy", zy(fx));
    zQ.setAttribute("cx", zx(x + h)); zQ.setAttribute("cy", zy(fxh));
    line(zRun, zx(x), zy(fx), zx(x + h), zy(fx));
    line(zRise, zx(x + h), zy(fx), zx(x + h), zy(fxh));
    line(zSec, ZL, zy(fx + slope * (wx0 - x)), ZR, zy(fx + slope * (wx0 + ww - x)));
    zRunT.setAttribute("x", (zx(x) + zx(x + h)) / 2);
    zRunT.setAttribute("y", zy(fx) + (zy(fx) < ZB - 26 ? 16 : -8));
    zRiseT.setAttribute("y", (zy(fx) + zy(fxh)) / 2 + 4);
    if (zx(x + h) > ZR - 34) { zRiseT.setAttribute("x", zx(x + h) - 6); zRiseT.setAttribute("text-anchor", "end"); }
    else { zRiseT.setAttribute("x", zx(x + h) + 6); zRiseT.setAttribute("text-anchor", "start"); }
    // slopes plot: drop a dot whenever x moves to a new place
    const sYc = clamp(slope, SY0, SY1);
    curDot.setAttribute("cx", ssx(x)); curDot.setAttribute("cy", ssy(sYc));
    if (lastDotX === null || Math.abs(x - lastDotX) >= 0.12) {
      S("circle", { cx: ssx(x), cy: ssy(sYc), r: 2.6, class: "pt-grad", opacity: 0.55 }, dotsG);
      lastDotX = x;
    }
    $("#dv-read").innerHTML =
      `<dt class="c-data">x</dt><dd>${py(x)}${isTwoThirds ? "   (2/3)" : ""}</dd>` +
      `<dt class="c-nudge">h</dt><dd>${py(h)}</dd>` +
      `<dt>f(x)</dt><dd>${py(fx)}</dd>` +
      `<dt>f(x + h)</dt><dd>${py(fxh)}</dd>` +
      `<dt class="c-grad">rise</dt><dd>${py(rise)}</dd>` +
      `<dt class="c-grad">slope = rise / h</dt><dd>${py(slope)}</dd>` +
      `<dt>true slope 6x − 4</dt><dd>${py(tru)}</dd>`;
    const note = $("#dv-note"), e = +hs.value, err = Math.abs(slope - tru);
    note.className = "note";
    if (e <= -12.5) { note.classList.add("warn"); note.innerHTML = `<b>Broken.</b> <var>h</var> is so tiny that the computer can't see the change in <var>f</var> any more: rounding error is now bigger than the thing we're measuring. This is what Karpathy warns about at 12:39.`; }
    else if (e <= -9) { note.classList.add("warn"); note.innerHTML = `<var>h</var> is getting too small: the last digits of the slope are now rounding noise. Make <var>h</var> smaller still and it falls apart.`; }
    else if (err > 0.5) { note.innerHTML = `<var>h</var> is big, so the orange line cuts across the curve instead of just touching it. The measured slope is off from the true one by ${err.toFixed(2)}. Make <var>h</var> smaller.`; }
    else { note.classList.add("ok"); note.innerHTML = Math.abs(tru) < 0.05 ? `Slope ≈ 0: the curve is flat here. This is the bottom of the valley, where gradient descent wants to end up.` : `Slope ≈ ${py(+slope.toFixed(3))}. The sign is ${tru > 0 ? "<b>positive</b>: going right goes uphill" : "<b>negative</b>: going right goes downhill"}, so downhill is to the ${tru > 0 ? "left" : "right"}.`; }
  }
  let anim = 0; // id of the running animation; a new action cancels the old one
  const stopAnim = () => { anim++; $("#dv-shrink").textContent = "▶ Shrink h"; $("#dv-sweep").textContent = "▶ Slide x across"; };
  xs.addEventListener("input", () => { stopAnim(); x = +xs.value; render(); });
  hs.addEventListener("input", () => { stopAnim(); render(); });
  $$("#s-deriv [data-x]").forEach(b => b.addEventListener("click", () => { stopAnim(); x = +b.dataset.x; xs.value = x; render(); }));
  $("#dv-tiny").addEventListener("click", () => { stopAnim(); hs.value = -15; render(); });
  $("#dv-showd").addEventListener("change", e => { dLine.style.display = dLab.style.display = e.target.checked ? "" : "none"; });
  $("#dv-clear").addEventListener("click", () => { dotsG.innerHTML = ""; lastDotX = null; render(); });
  $("#dv-shrink").addEventListener("click", async e => {
    if (e.target.textContent.startsWith("■")) { stopAnim(); return; }
    stopAnim(); const id = anim; e.target.textContent = "■ Stop";
    await tween(4200, p => { if (id !== anim) return; hs.value = (Math.round((0.25 - 5.5 * p) * 4) / 4); render(); });
    if (id === anim) stopAnim();
  });
  $("#dv-sweep").addEventListener("click", async e => {
    if (e.target.textContent.startsWith("■")) { stopAnim(); return; }
    stopAnim(); const id = anim; e.target.textContent = "■ Stop";
    if (+hs.value < -6 || +hs.value > -2) { hs.value = -3; }
    await tween(6500, p => { if (id !== anim) return; x = -4.5 + 9 * p; xs.value = x; render(); });
    if (id === anim) { $("#dv-showd").checked = true; dLine.style.display = dLab.style.display = ""; stopAnim(); }
  });
  // drag the point along the curve
  let dragging = false;
  const toX = ev => { const p = main.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; return clamp(ix(p.matrixTransform(main.getScreenCTM().inverse()).x), -5, 5); };
  P.addEventListener("pointerdown", ev => { stopAnim(); dragging = true; P.setPointerCapture(ev.pointerId); ev.preventDefault(); });
  P.addEventListener("pointermove", ev => { if (!dragging) return; x = Math.round(toX(ev) * 100) / 100; xs.value = x; render(); });
  P.addEventListener("pointerup", () => { dragging = false; });
  P.addEventListener("pointercancel", () => { dragging = false; });
  P.style.touchAction = "none";
  // used by the follow-along at 12:58: h back to 0.001 and x back to 3
  DEMO.derivReset = () => { stopAnim(); hs.value = -3; x = 3; xs.value = 3; render(); };
  render();
});

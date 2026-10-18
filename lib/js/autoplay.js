// Pictures with a loop start by themselves the first time you scroll to them (once each),
// unless auto-play is off, motion is reduced, or the follow-along is already driving them.
// PAGE.intro maps an element id to the steps that start it.
import { RM, AUTO, drive, safe } from "./core.js";

safe("autoplay", () => {
  if (RM || !("IntersectionObserver" in window)) return;
  const intro = PAGE.intro || {};
  const done = new Set(), timers = new Map();
  const io = new IntersectionObserver(es => es.forEach(e => {
    const id = e.target.id;
    if (done.has(id)) return;
    if (!e.isIntersecting) { clearTimeout(timers.get(id)); return; }
    timers.set(id, setTimeout(() => {
      if (!AUTO.play || AUTO.following || done.has(id)) return;
      done.add(id); io.unobserve(e.target);
      drive(intro[id]);
    }, 900));
  }), { threshold: 0.55 });
  Object.keys(intro).forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
});

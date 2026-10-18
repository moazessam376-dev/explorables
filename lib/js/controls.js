// Sliders show how far along they are: base.css fills the track up to --fill. Pages set .value
// from code all the time (demos, presets, drags), so the fill follows the value setter as well.
import { $$, clamp, safe } from "./core.js";

export function rangeFill(el) {
  const lo = el.min === "" ? 0 : +el.min, hi = el.max === "" ? 100 : +el.max;
  const p = hi > lo ? clamp((+el.value - lo) / (hi - lo), 0, 1) : 0;
  el.style.setProperty("--fill", Math.round(p * 1000) / 10 + "%");
}

safe("controls", () => {
  for (const prop of ["value", "valueAsNumber"]) {
    const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, prop);
    if (!d || !d.set) continue;
    Object.defineProperty(HTMLInputElement.prototype, prop, {
      ...d, set(v) { d.set.call(this, v); if (this.type === "range") rangeFill(this); },
    });
  }
  document.addEventListener("input", e => { if (e.target.type === "range") rangeFill(e.target); }, true);
  $$('input[type="range"]').forEach(rangeFill);
  // and any slider a picture builds while it starts up
  setTimeout(() => $$('input[type="range"]').forEach(rangeFill), 0);
});

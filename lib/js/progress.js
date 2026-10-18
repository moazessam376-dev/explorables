// Marking sections done: a "Mark done" button at the end of each section, a tick on the
// timeline and the title, and an auto-complete switch that marks a section done when the
// follow-along moves past its end. Remembered per page in the browser.
import { $, $$, safe } from "./core.js";
import { autoCompleteDue } from "./follow-core.js";

safe("progress", () => {
  const key = `${PAGE.id}:done`, autoKey = `${PAGE.id}:autodone`;
  let done = new Set();
  try { done = new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch (e) { /* storage off */ }
  const save = () => { try { localStorage.setItem(key, JSON.stringify([...done])); } catch (e) { /* storage off */ } };
  const box = $("#fl-autodone");
  let auto = false;
  try { auto = localStorage.getItem(autoKey) === "1"; } catch (e) { /* storage off */ }
  if (box) {
    box.checked = auto;
    box.addEventListener("change", () => {
      auto = box.checked;
      try { localStorage.setItem(autoKey, auto ? "1" : "0"); } catch (e) { /* storage off */ }
    });
  }
  const sections = $$("section.st[id]").filter(s => s.querySelector(".moments, .landmarks"));
  const buttons = new Map();
  function paint() {
    sections.forEach(sec => {
      const on = done.has(sec.id);
      sec.classList.toggle("is-done", on);
      const b = buttons.get(sec.id);
      if (b) { b.textContent = on ? "✓ Done (undo)" : "Mark this section done"; b.setAttribute("aria-pressed", on ? "true" : "false"); }
    });
    $$("#timeline button").forEach(b => b.classList.toggle("done", done.has(b.dataset.sec)));
  }
  sections.forEach(sec => {
    const row = document.createElement("div"); row.className = "doneRow";
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn ghost sm markdone";
    b.addEventListener("click", () => { if (done.has(sec.id)) done.delete(sec.id); else done.add(sec.id); save(); paint(); });
    row.appendChild(b);
    (sec.querySelector(".st-main") || sec).appendChild(row);
    buttons.set(sec.id, b);
  });
  document.addEventListener("explorables:time", e => {
    const { t, prevT, playing } = e.detail;
    if (!auto || !playing) return;
    const passed = autoCompleteDue(PAGE.chapters, prevT, t).filter(id => !done.has(id));
    if (passed.length) { passed.forEach(id => done.add(id)); save(); paint(); }
  });
  paint();
});

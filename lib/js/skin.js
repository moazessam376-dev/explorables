// Theme picker (remembered per page) and the margin-notes layout for wide screens.
import { $, $$, safe } from "./core.js";

safe("skin", () => {
  const sel = $("#skin");
  if (!sel) return;
  const apply = v => {
    if (v === "auto") document.documentElement.removeAttribute("data-skin");
    else document.documentElement.setAttribute("data-skin", v);
  };
  let saved = "auto";
  try { saved = localStorage.getItem(`${PAGE.id}:skin`) || "auto"; } catch (e) { /* storage off */ }
  if (![...sel.options].some(o => o.value === saved)) saved = "auto";
  sel.value = saved; apply(saved);
  sel.addEventListener("change", () => {
    apply(sel.value);
    try { localStorage.setItem(`${PAGE.id}:skin`, sel.value); } catch (e) { /* storage off */ }
  });
});

// Move each section's word boxes, phrase lists, tool notes and moments into a side column.
// CSS shows it as margin notes on wide screens and leaves it below the section otherwise.
safe("margin-notes", () => {
  const SIDE = /^(Words and refreshers|His English, decoded|Her English, decoded|Their English, decoded|How to read it out loud|Moments to watch|Landmarks|The Python in this chapter|The .+ in this chapter)$/;
  $$("section.st[id]").forEach(sec => {
    const head = $(".st-head", sec);
    const main = document.createElement("div"); main.className = "st-main";
    const side = document.createElement("aside"); side.className = "st-side";
    side.setAttribute("aria-label", "Margin notes");
    let inSide = false;
    [...sec.children].forEach(k => {
      if (k === head) return;
      if (k.tagName === "H3") inSide = SIDE.test(k.textContent.trim());
      (inSide ? side : main).appendChild(k);
    });
    const cols = document.createElement("div"); cols.className = "st-cols";
    cols.appendChild(main);
    if (side.children.length) cols.appendChild(side); else cols.classList.add("solo");
    sec.appendChild(cols);
  });
});

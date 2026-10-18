// Follow along: a clock that keeps pace with the video and moves the page so the part the
// lecture is on arrives on screen when it starts. Reads PAGE (chapters, anchors, actions,
// mustRead) and the moments in the page (.moments a[data-t]). The decisions live in
// follow-core.js; this file wires them to the page.
import { $, $$, RM, AUTO, drive, safe, clamp, fmtTime, parseTime } from "./core.js";
import { LEAD, ACTION_WINDOW, parseAnchor, idxAt as idxIn, chapterAt as chapterIn, makeEngagement,
  scrollDecision, actionDue, scrollBehavior, needsCatchUp } from "./follow-core.js";

safe("follow", () => {
  const key = k => `${PAGE.id}:${k}`;
  const store = {
    get(k) { try { return localStorage.getItem(key(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(key(k), String(v)); } catch (e) { /* storage off */ } }
  };
  AUTO.play = store.get("autoplay") !== "0";
  if (!PAGE.source || PAGE.source.kind !== "video") {
    // books, docs and topics: no clock; theme picker and progress still work
    $$(".fl-video").forEach(el => { el.hidden = true; });
    const tb = $(".tlbox"); if (tb) tb.hidden = true;
    return;
  }
  const END = PAGE.source.duration, CH = PAGE.chapters;
  const tl = $("#timeline"), pin = $("#pin"), header = $(".top");
  const clockBtn = $("#fl-clock"), form = $("#fl-form"), input = $("#fl-input");
  const playBtn = $("#fl-play"), speedSel = $("#fl-speed"), nowEl = $("#fl-now"), resume = $("#fl-resume");
  const autoBox = $("#fl-auto"), playBox = $("#fl-autoplay"), lastBtn = $("#fl-last");
  const sections = $$("section.st[id]");
  const ACT = PAGE.actions || {};   // moment t → steps (selectors or "demo:" calls)

  // ---- anchors: every moment points at the element it's about ----
  function resolve(sec, k, isFirst) {
    const a = parseAnchor(k || (isFirst ? "head" : "fig"));
    if (a.kind === "sel") return document.querySelector(a.sel) || sec;
    if (a.kind === "head") return $(".st-head", sec) || sec;
    if (a.kind === "fig") return $$("figure", sec)[0] || sec;
    if (a.kind === "fig2") return $$("figure", sec)[1] || $$("figure", sec)[0] || sec;
    if (a.kind === "why") return $(".why", sec) || sec;
    if (a.kind === "words") return $(".notation, .words", sec) || sec;
    if (a.kind === "py") return $(".pybox", sec) || sec;
    const p = $(".prose", sec);
    if (!p) return sec;
    return a.n ? ($$("li", p)[a.n - 1] || p) : p;
  }
  const anchors = [];
  sections.forEach(sec => {
    $$(".moments a[data-t]", sec).forEach((a, i) => {
      const t = +a.dataset.t, li = a.closest("li"), span = li && li.querySelector("span");
      anchors.push({ t, el: resolve(sec, PAGE.anchors[t], i === 0), li, sec, text: span ? span.innerHTML : "" });
    });
  });
  anchors.sort((x, y) => x.t - y.t);
  if (!anchors.length) return;
  if (anchors[0].t > 0) anchors.unshift(Object.assign({}, anchors[0], { t: 0 }));
  const idxAt = t => idxIn(anchors, t);
  const chapterAt = t => chapterIn(CH, t);
  const yOf = el => el.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 14;

  // ---- timeline ----
  CH.forEach((c, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.style.flexGrow = (i + 1 < CH.length ? CH[i + 1][0] : END) - c[0];
    b.dataset.idx = i; b.dataset.sec = c[2];
    b.title = fmtTime(c[0]) + "  " + c[1];
    b.setAttribute("aria-label", b.title);
    tl.appendChild(b);
  });
  const btns = $$("button", tl);
  tl.addEventListener("click", e => {
    const r = tl.getBoundingClientRect();
    setTime(clamp((e.clientX - r.left) / r.width, 0, 1) * END);
  });

  // ---- state ----
  // manual = the clock was set on purpose (typed, nudged, timeline, a time link, or playing);
  // otherwise it shows the start of the chapter you're reading.
  let t = 0, prevT = 0, playing = false, manual = false, speed = 1, lastNow = null, lastSave = 0, savedT = null;
  let userScroll = false, lastLi = null, lastIdx = -1, pending = false, autoScroll = true, lastPt = null;
  { const s = store.get("t"); if (s != null && isFinite(+s) && +s > 0) savedT = +s; }
  { const sp = store.get("speed"); if (sp) { speed = +sp; speedSel.value = sp; } }
  autoScroll = store.get("auto") !== "0";
  autoBox.checked = autoScroll; playBox.checked = AUTO.play;
  const save = () => { if (t > 0) savedT = t; store.set("t", Math.round(t)); store.set("speed", speed); };
  const sectionInView = () => { let cur = sections[0]; sections.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * 0.4) cur = s; }); return cur; };
  const sectionStart = sec => { const a = $(".moments a[data-t]", sec); return a ? +a.dataset.t : 0; };
  const tell = () => document.dispatchEvent(new CustomEvent("explorables:time", { detail: { t, prevT, playing } }));

  function paint() {
    const shownT = playing || manual ? t : sectionStart(sectionInView());
    clockBtn.textContent = fmtTime(shownT);
    clockBtn.classList.toggle("live", playing);
    pin.style.display = "block";
    pin.style.left = (tl.offsetLeft + (shownT / END) * tl.offsetWidth - 1) + "px";
    const ch = chapterAt(shownT), inView = sectionInView();
    btns.forEach((b, i) => b.classList.toggle("on", playing ? i === ch : CH[i][2] === (inView && inView.id)));
    if (playing || manual) {
      const a = anchors[idxAt(shownT)];
      $$(".moments li.here").forEach(li => { if (li !== a.li) li.classList.remove("here"); });
      if (a.li) a.li.classList.add("here");
      if (a.li && a.li !== lastLi) {
        lastLi = a.li;
        const side = a.li.closest(".st-side");     // keep the moment visible in the margin column
        if (side && side.scrollHeight > side.clientHeight + 4) {
          const d = a.li.getBoundingClientRect().top - side.getBoundingClientRect().top - side.clientHeight / 2;
          side.scrollTo({ top: side.scrollTop + d, behavior: RM ? "auto" : "smooth" });
        }
      }
      nowEl.innerHTML = `<span class="t">${fmtTime(a.t)}</span>${a.text}`;
    } else {
      nowEl.innerHTML = `Press <b>▶ Follow</b> when you press play on the video. It starts at <b>${fmtTime(shownT)}</b>, the part you're reading.` +
        (savedT != null ? ` Or <b>▶ Resume</b> where you stopped, at <b>${fmtTime(savedT)}</b>.` : "");
    }
    const showLast = !playing && savedT != null && (!manual || Math.abs(t - savedT) > 5);
    lastBtn.hidden = !showLast;
    if (showLast) lastBtn.textContent = `▶ Resume ${fmtTime(savedT)}`;
    playBtn.textContent = playing ? "❚❚ Pause" : "▶ Follow";
    playBtn.classList.toggle("playing", playing);
  }

  // ---- smart scrolling (rules in follow-core.js) ----
  const eng = makeEngagement();
  const selected = () => { const s = window.getSelection && window.getSelection(); return !!s && String(s).trim().length > 0; };
  const engaged = now => eng.engaged(now, selected());
  const onScreen = el => {
    const r = el.getBoundingClientRect(), top = header.offsetHeight;
    return (r.top >= top - 12 && r.top <= innerHeight - 140) || (r.top < top && r.bottom > top + 220);
  };
  const glideTo = (el, instant) => {
    const top = Math.max(0, yOf(el));
    window.scrollTo({ top, behavior: instant ? "auto" : scrollBehavior({ distance: top - window.scrollY, viewportH: innerHeight, reducedMotion: RM }) });
  };
  const intent = () => eng.intent();
  function goNow() {
    const el = anchors[idxAt(t)].el;
    lastIdx = idxAt(t + LEAD); pending = false;
    if ((autoScroll || !playing) && !onScreen(el)) glideTo(el);
  }
  function catchUp() {
    intent();
    const el = anchors[idxAt(t)].el;
    lastIdx = idxAt(t + LEAD); pending = false;
    if (autoScroll && !onScreen(el)) glideTo(el, true);
  }
  let hiddenAt = null;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { hiddenAt = performance.now(); return; }
    if (playing && hiddenAt != null && needsCatchUp({ gapMs: 0, hiddenMs: performance.now() - hiddenAt })) catchUp();
    hiddenAt = null;
  });
  function setTime(nt) {
    prevT = t; t = clamp(nt, 0, END); manual = true; userScroll = false; save();
    intent(); goNow(); paint(); tell();
  }

  // a picture action waits (up to ACTION_WINDOW) until its part is on screen and you're not busy
  let actIdx = -1, actFor = -1, actUntil = 0;
  function frame(now) {
    const gap = lastNow != null ? now - lastNow : 0;
    prevT = t;
    if (lastNow != null && playing) t = Math.min(END, t + gap / 1000 * speed);
    lastNow = now;
    if (!playing) { lastNow = null; resume.hidden = true; paint(); return; }
    if (needsCatchUp({ gapMs: gap, hiddenMs: 0 })) catchUp();
    const cur = idxAt(t);
    if (cur !== actIdx) { actIdx = cur; if (ACT[anchors[cur].t]) { actFor = cur; actUntil = now + ACTION_WINDOW; } }
    const due = actionDue({ actFor, now, until: actUntil, autoPlay: AUTO.play, engaged: engaged(now), onScreen: actFor >= 0 && onScreen(anchors[actFor].el) });
    if (due === "drop") actFor = -1;
    else if (due === "run") { const a = ACT[anchors[actFor].t]; actFor = -1; drive(a); }
    const idx = idxAt(t + LEAD);
    if (idx !== lastIdx) { lastIdx = idx; pending = true; }
    const el = anchors[idx].el, vis = onScreen(el);
    const d = scrollDecision({ pending, autoScroll, onScreen: vis, engaged: engaged(now) });
    if (vis || !autoScroll) pending = false;
    if (d === "glide") { glideTo(el); pending = false; }
    resume.hidden = !(pending && autoScroll);
    if (!resume.hidden) resume.textContent = `↓ Jump to ${fmtTime(anchors[idx].t)}`;
    if (now - lastSave > 2000) { save(); lastSave = now; }
    if (t >= END) playing = false;
    paint(); tell();
    requestAnimationFrame(frame);
  }

  // ---- must-read sections before the start ----
  const pre = (PAGE.mustRead || []).map(id => document.getElementById(id)).filter(Boolean)[0], preCard = $("#preread");
  let preSeen = !pre || store.get("preread") === "1", preMs = 0;
  const markPre = () => { preSeen = true; preCard.hidden = true; store.set("preread", "1"); };
  setInterval(() => {
    if (preSeen || document.hidden) return;
    const r = pre.getBoundingClientRect();
    if (r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5) { preMs += 1000; if (preMs >= 25000) markPre(); }
  }, 1000);
  $("#pr-read").addEventListener("click", () => {
    markPre(); manual = false;
    window.scrollTo({ top: Math.max(0, yOf($(".st-head", pre) || pre)), behavior: RM ? "auto" : "smooth" });
  });
  $("#pr-skip").addEventListener("click", () => { markPre(); play(true); });
  function play(on) {
    if (on === playing) return;
    if (on && !preSeen && (manual ? t : sectionStart(sectionInView())) < 30) { preCard.hidden = false; $("#pr-read").focus(); return; }
    if (on && !manual) t = sectionStart(sectionInView());
    playing = on; AUTO.following = on; manual = true; userScroll = false; save();
    if (playing) { intent(); goNow(); requestAnimationFrame(frame); } else paint();
  }

  // ---- controls ----
  const base = () => (playing || manual ? t : sectionStart(sectionInView()));
  playBtn.addEventListener("click", () => play(!playing));
  $("#fl-back").addEventListener("click", () => setTime(base() - 10));
  $("#fl-fwd").addEventListener("click", () => setTime(base() + 10));
  speedSel.addEventListener("change", () => { speed = +speedSel.value; save(); });
  resume.addEventListener("click", () => { pending = false; intent(); glideTo(anchors[idxAt(t + LEAD)].el); resume.hidden = true; });
  lastBtn.addEventListener("click", () => { if (savedT == null) return; setTime(savedT); play(true); });
  playBox.addEventListener("change", () => { AUTO.play = playBox.checked; store.set("autoplay", AUTO.play ? "1" : "0"); });
  autoBox.addEventListener("change", () => { autoScroll = autoBox.checked; store.set("auto", autoScroll ? "1" : "0"); });
  clockBtn.addEventListener("click", () => {
    form.hidden = false; clockBtn.hidden = true;
    input.value = fmtTime(base()); input.focus(); input.select();
  });
  const closeEdit = () => { form.hidden = true; clockBtn.hidden = false; };
  form.addEventListener("submit", e => { e.preventDefault(); const nt = parseTime(input.value); closeEdit(); if (nt != null) setTime(nt); });
  input.addEventListener("keydown", e => { if (e.key === "Escape") closeEdit(); });
  input.addEventListener("blur", () => setTimeout(closeEdit, 150));
  // a time link into this video (chapter chip or moment) also moves the clock there
  $$("a[data-v][data-t]").filter(a => PAGE.refs[a.dataset.v] === PAGE.source.id)
    .forEach(a => a.addEventListener("click", () => setTime(+a.dataset.t)));

  // ---- what counts as busy ----
  const busy = ms => { if (AUTO.driving) return; eng.busy(performance.now(), ms); if (!playing) userScroll = true; };
  const onControls = e => !!(e.target && e.target.closest && e.target.closest(".top, .preread"));
  window.addEventListener("wheel", () => busy(8000), { passive: true });
  window.addEventListener("touchstart", () => busy(8000), { passive: true });
  window.addEventListener("touchmove", () => busy(8000), { passive: true });
  document.addEventListener("pointerdown", e => { if (!onControls(e)) busy(); }, { passive: true });
  document.addEventListener("input", e => { if (!onControls(e)) busy(); }, { passive: true });
  document.addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse") return;
    const dist = lastPt ? Math.abs(e.clientX - lastPt[0]) + Math.abs(e.clientY - lastPt[1]) : 0;
    lastPt = onControls(e) ? null : [e.clientX, e.clientY];
    eng.move(performance.now(), dist, onControls(e));
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => { eng.leave(); lastPt = null; });
  window.addEventListener("blur", () => eng.leave());
  document.addEventListener("keydown", e => {
    const tag = (e.target.tagName || "").toLowerCase();
    if (["input", "select", "textarea", "canvas"].includes(tag)) return;
    if (!["k", "j", "l"].includes(e.key)) busy(8000);
    if (e.key === "k") play(!playing);
    else if (e.key === "j") setTime(base() - 10);
    else if (e.key === "l") setTime(base() + 10);
  });
  // scrolling away by hand while paused puts the clock back on "the part you're reading"
  window.addEventListener("scroll", () => {
    if (playing) return;
    if (userScroll && manual) { const ch = CH[chapterAt(t)]; if (ch && ch[2] !== (sectionInView() || {}).id) manual = false; }
    paint();
  }, { passive: true });
  window.addEventListener("resize", paint);
  paint();
});

// Time links: <a data-v="k" data-t="759"> opens video PAGE.refs.k at 12:39 in a new tab.
import { $$, ytUrl, safe } from "./core.js";

safe("links", () => {
  $$("a[data-v]").forEach(a => {
    if (!PAGE.refs[a.dataset.v]) return;
    a.href = ytUrl(PAGE.refs, a.dataset.v, a.dataset.t);
    a.target = "_blank"; a.rel = "noopener";
  });
});

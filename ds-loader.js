/* Loads the GamePulse design-system bundle. If the compiled bundle is not available
   (fresh checkout / local dev), falls back to compiling component sources in the browser. */
(function () {
  var NS = "GamePulseDesignSystem_c59a14";
  var BASE = (document.currentScript && document.currentScript.getAttribute("data-base")) || "../../";
  var FILES = ["core/Icon", "core/Button", "core/IconButton", "core/Badge", "core/Card", "core/Tabs", "core/SegmentedControl", "core/GameAvatar",
    "forms/Input", "forms/Select", "forms/Checkbox", "forms/Switch", "data/Delta", "data/Sparkline", "data/KpiCard", "data/DataTable", "data/MiniBar",
    "charts/LineChart", "charts/BarChart", "charts/Heatmap", "charts/FunnelChart", "charts/SankeyChart", "charts/ShareBar",
    "feedback/Tooltip", "feedback/EmptyState", "feedback/Skeleton", "feedback/Callout", "feedback/Dialog", "feedback/Toast", "navigation/SidebarItem"];
  function compile() {
    var src = {}, mods = {};
    return Promise.all(FILES.map(function (f) { return fetch(BASE + "components/" + f + ".jsx.txt").then(function (r) { return r.text(); }).then(function (t) { src[f] = t; }); })).then(function () {
      function resolve(from, spec) { var p = from.split("/"); p.pop(); spec.replace(/\.jsx$/, "").split("/").forEach(function (s) { if (s === "..") p.pop(); else if (s !== ".") p.push(s); }); return p.join("/"); }
      function load(id) {
        if (mods[id]) return mods[id].exports;
        var m = { exports: {} }; mods[id] = m;
        var code = Babel.transform(src[id], { presets: ["react"], plugins: ["transform-modules-commonjs"] }).code;
        new Function("require", "module", "exports", code)(function (s) { return s === "react" ? window.React : load(resolve(id, s)); }, m, m.exports);
        return m.exports;
      }
      var ns = {}; FILES.forEach(function (f) { Object.assign(ns, load(f)); });
      window[NS] = ns; return ns;
    });
  }
  /* Compile component sources directly. Avoids executing anything else that may be inside a stale _ds_bundle.js. */
  window.__dsReady = compile();
})();

/**
 * KILROY terminal — real Queen GNU shell via loopback :9481 (not simulated VFS).
 */
(function () {
  "use strict";

  var VERSION = "1.1.0";
  var CODENAME = "Sanctuary";
  var QUEEN_BASE = "http://127.0.0.1:9481";
  var PANEL_BASE = "http://127.0.0.1:9477";
  var REPO = "https://github.com/ZacharyGeurts/KILROY";

  globalThis.KILROY_QUEEN_API_BASE = QUEEN_BASE;
  globalThis.KILROY_THEME_JSON = "queen-styles-themes.json";

  var mountEl = document.getElementById("kilroy-terminal-root");
  var offlineEl = document.getElementById("kilroy-terminal-offline");
  var statusEl = document.getElementById("local-status");
  if (!mountEl) return;

  function setStatus(html, live) {
    if (!statusEl) return;
    statusEl.innerHTML = html;
    if (live) statusEl.classList.add("status-line--live");
    else statusEl.classList.remove("status-line--live");
  }

  async function probeQueen() {
    try {
      var r = await fetch(QUEEN_BASE + "/api/queen-terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status" }),
        cache: "no-store",
      });
      if (!r.ok) return null;
      var j = await r.json();
      return j && j.ok ? j : null;
    } catch (_) {
      return null;
    }
  }

  async function probePanel() {
    try {
      var r = await fetch(PANEL_BASE + "/grok-lab", { cache: "no-store", mode: "cors" });
      return r.ok;
    } catch (_) {
      return false;
    }
  }

  function offlineHtml(panelUp) {
    var lines = [
      "<p><strong>Field stack offline</strong> — this page runs a <em>real</em> Linux shell only when Queen is live on your machine.</p>",
      "<p>From <code>SG/NewLatest</code>:</p>",
      "<pre class=\"cmd\">./scripts/start-field-stack.sh</pre>",
      "<p>Then reload — terminal connects to <code>" + QUEEN_BASE + "/api/queen-terminal</code> (real <code>ls</code>, <code>cd</code>, <code>g16</code>, KILROY tree).</p>",
    ];
    if (panelUp) {
      lines.push(
        "<p>Panel is up: <a href=\"" + PANEL_BASE + "/grok-lab\">Grok Lab</a> — start Queen if :9481 is still down.</p>"
      );
    }
    lines.push(
      "<p>Or open Queen directly: <a href=\"" + QUEEN_BASE + "/world/queen-gnu-terminal-embed.html?cwd=KILROY\">Queen GNU terminal</a></p>"
    );
    return lines.join("");
  }

  async function mountRealTerminal(status) {
    mountEl.hidden = false;
    if (offlineEl) offlineEl.hidden = true;

    var kr = status.kilroy_root || "";
    var kernel = status.field_kernel || {};
    var loaded = kernel.field_kernel_running || kernel.proc_kilroy_field;

    setStatus(
      "Loopback: <strong>Queen GNU terminal live</strong> · real shell @ " +
        QUEEN_BASE +
        (loaded ? " · KILROY kernel loaded" : " · host compat") +
        " · <a href=\"" +
        PANEL_BASE +
        "/grok-lab\">Grok Lab</a>",
      true
    );

    if (!globalThis.QueenGnuTerminal) {
      mountEl.innerHTML =
        "<p class=\"t-warn\">Queen GNU terminal JS failed to load.</p>";
      return;
    }

    mountEl.innerHTML = "";
    await globalThis.QueenGnuTerminal.mount(mountEl, {
      layout: "tabs",
      miniview: true,
      minibrowser: false,
      embedClass: "qgt-embed qgt-embed--kilroy",
    });

    if (kr) {
      try {
        var cdCmd = kr.indexOf(" ") >= 0 ? 'cd "' + kr.replace(/"/g, '\\"') + '"' : "cd " + kr;
        await globalThis.QueenGnuTerminal.runCommand(cdCmd);
      } catch (_) {}
    }

    var chrome = document.querySelector(".terminal-chrome .terminal-title");
    if (chrome) {
      chrome.textContent =
        "kilroy@127.0.0.1 — KILROY " + VERSION + " " + CODENAME + " · Queen GNU";
    }
  }

  function showOffline(panelUp) {
    mountEl.hidden = true;
    if (offlineEl) {
      offlineEl.hidden = false;
      offlineEl.innerHTML = offlineHtml(panelUp);
    }
    setStatus(
      "Loopback: <strong>offline</strong> — run <code>./scripts/start-field-stack.sh</code> then reload for real shell",
      false
    );
  }

  async function boot() {
    setStatus("Probing Queen GNU terminal @ " + QUEEN_BASE + "…", false);

    var panelUp = await probePanel();
    var status = await probeQueen();

    if (status) {
      await mountRealTerminal(status);
      return;
    }

    showOffline(panelUp);

    var poll = setInterval(async function () {
      var s = await probeQueen();
      if (!s) return;
      clearInterval(poll);
      await mountRealTerminal(s);
    }, 4000);
    setTimeout(function () {
      clearInterval(poll);
    }, 120000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
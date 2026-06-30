(function () {
  "use strict";

  var VERSION = "1.1.0";
  var TAG = "v1.1.0";
  var CODENAME = "Sanctuary";
  var REPO = "https://github.com/ZacharyGeurts/KILROY";
  var RELEASES = REPO + "/releases/download/" + TAG;

  var PLATFORMS = {
    x86_64: "linux-gnu-x86_64",
    aarch64: "linux-gnu-aarch64",
    i386: "linux-gnu-i386",
    riscv64: "linux-gnu-riscv64",
    arm: "linux-gnu-arm",
    darwin_arm64: "darwin-aarch64",
    darwin_x64: "darwin-x86_64",
    win64: "win32-x86_64",
    android_arm64: "android-aarch64",
  };

  var BOOT_LINES = [
    "Grok Bootloader 1.1 — KILROY Field OS",
    "Sanctuary mode · loopback authority 127.0.0.1",
    "Loading Field Die… TIME RAM THERMO CONTEXT CPU FLOW CACHE DIRECT",
    "Field 1 canonical — depth zero",
    "Scanning non-Field-1 fields… hostile → bring",
    "Pairing Grok16 5.1.0 + AmmoOS 2.0.0-beta3",
    "Telemetry: /proc/kilroy_field/status",
    "",
    "KILROY " + VERSION + " " + CODENAME + " ready.",
    "Type help for commands · spin to boot yours",
    "",
  ];

  var termEl = document.getElementById("kilroy-terminal");
  var inputEl = document.getElementById("terminal-input");
  var outEl = document.getElementById("terminal-output");
  var platSel = document.getElementById("spin-platform");
  if (!termEl || !inputEl || !outEl) return;

  var history = [];
  var histIdx = -1;
  var booted = false;
  var localStack = false;

  function line(text, cls) {
    var div = document.createElement("div");
    div.className = "t-line" + (cls ? " " + cls : "");
    div.textContent = text;
    outEl.appendChild(div);
    outEl.scrollTop = outEl.scrollHeight;
  }

  function print(text, cls) {
    String(text || "").split("\n").forEach(function (l) {
      line(l, cls);
    });
  }

  function prompt() {
    line("kilroy@127.0.0.1:~$ ", "t-prompt");
  }

  function assetName(platKey) {
    var id = PLATFORMS[platKey] || PLATFORMS.x86_64;
    return "kilroy-" + VERSION + "-" + id + ".tar.gz";
  }

  function spinSteps(profile, platKey) {
    if (profile === "release") {
      var asset = assetName(platKey);
      return [
        "curl -LO " + RELEASES + "/" + asset,
        "tar -xzf " + asset,
        "cd platforms/" + (PLATFORMS[platKey] || PLATFORMS.x86_64),
        "./bin/kilroy-status 2>/dev/null || cat ../../README.md",
      ];
    }
    if (profile === "full") {
      return [
        "git clone https://github.com/ZacharyGeurts/AmmoOS.git",
        "cd AmmoOS && ./scripts/wire-stack.sh",
        "cd ../KILROY && git checkout " + TAG,
        "./scripts/build-kilroy.sh",
        "cd .. && ./scripts/start-field-stack.sh",
        "open http://127.0.0.1:9477/grok-lab",
      ];
    }
    return [
      "git clone " + REPO + ".git",
      "cd KILROY && git checkout " + TAG,
      "./scripts/kilroy-become-substrate.sh",
      "./scripts/build-kilroy.sh",
      "./scripts/grok-mkimage.sh",
      "./scripts/grok-boot-qemu.sh",
    ];
  }

  function cmdHelp() {
    print(
      "help       — this list\n" +
      "version    — KILROY " + VERSION + " " + CODENAME + "\n" +
      "boot       — replay Grok boot sequence\n" +
      "spin       — spin-up commands (quick|full|release)\n" +
      "releases   — platform download URLs\n" +
      "status     — probe your loopback field stack\n" +
      "field      — Field One doctrine summary\n" +
      "wiki       — open wiki\n" +
      "code       — open GitHub repo\n" +
      "clear      — clear terminal",
      "t-dim"
    );
  }

  function cmdReleases() {
    Object.keys(PLATFORMS).forEach(function (k) {
      print(RELEASES + "/" + assetName(k), "t-accent");
    });
    print("\nFull table: " + REPO + "/releases/tag/" + TAG, "t-dim");
  }

  function cmdSpin(args) {
    var profile = (args[0] || "quick").toLowerCase();
    if (["quick", "full", "release"].indexOf(profile) < 0) profile = "quick";
    var platKey = platSel ? platSel.value : "x86_64";
    if (args[1]) {
      var p = args[1].toLowerCase();
      if (PLATFORMS[p]) platKey = p;
    }
    print("# " + profile + " · " + (PLATFORMS[platKey] || platKey), "t-dim");
    spinSteps(profile, platKey).forEach(function (s) {
      print(s, "t-cmd");
    });
  }

  function cmdField() {
    print(
      "Field 1 — one field, depth zero.\n" +
      "Authority: 127.0.0.1 (home sanctuary)\n" +
      "Doctrine: any field not Field 1 → hostile → brought to Field 1\n" +
      "Module: lib/field-one-hostile-scan.py",
      "t-dim"
    );
  }

  function cmdStatus() {
    if (localStack) {
      print("LOOPBACK STACK LIVE — panel + grok-lab on 127.0.0.1:9477", "t-ok");
      print("open http://127.0.0.1:9477/grok-lab", "t-accent");
    } else {
      print("No local stack detected — run: spin quick", "t-warn");
    }
  }

  function runBoot() {
    if (booted) return;
    booted = true;
    print("KILROY terminal — Field OS " + VERSION + " " + CODENAME, "t-banner");
    var i = 0;
    function next() {
      if (i >= BOOT_LINES.length) {
        prompt();
        inputEl.focus();
        return;
      }
      var t = BOOT_LINES[i++];
      if (t === "") {
        line("", "");
        setTimeout(next, 40);
      } else {
        line(t, i < 4 ? "t-boot" : "t-dim");
        setTimeout(next, i < 5 ? 120 : 55);
      }
    }
    next();
  }

  function exec(raw) {
    var cmd = raw.trim();
    if (!cmd) {
      prompt();
      return;
    }
    history.push(cmd);
    histIdx = history.length;
    line("kilroy@127.0.0.1:~$ " + cmd, "t-echo");
    var parts = cmd.split(/\s+/);
    var name = parts[0].toLowerCase();
    var args = parts.slice(1);

    switch (name) {
      case "help":
      case "?":
        cmdHelp();
        break;
      case "version":
      case "ver":
        print("KILROY " + VERSION + " " + CODENAME + " · ABI kilroy-field-1.0 · tag " + TAG);
        break;
      case "boot":
        booted = false;
        outEl.innerHTML = "";
        runBoot();
        return;
      case "spin":
        cmdSpin(args);
        break;
      case "releases":
      case "download":
        cmdReleases();
        break;
      case "status":
        cmdStatus();
        break;
      case "field":
      case "field-one":
        cmdField();
        break;
      case "wiki":
        window.open(REPO + "/wiki", "_blank", "noopener");
        print("Opening wiki…", "t-dim");
        break;
      case "code":
      case "github":
        window.open(REPO, "_blank", "noopener");
        print("Opening repository…", "t-dim");
        break;
      case "clear":
      case "cls":
        outEl.innerHTML = "";
        booted = true;
        break;
      default:
        print("Unknown: " + name + " — type help", "t-warn");
    }
    prompt();
  }

  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      var v = inputEl.value;
      inputEl.value = "";
      exec(v);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length && histIdx > 0) {
        histIdx--;
        inputEl.value = history[histIdx];
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx < history.length - 1) {
        histIdx++;
        inputEl.value = history[histIdx];
      } else {
        histIdx = history.length;
        inputEl.value = "";
      }
    }
  });

  termEl.addEventListener("click", function () {
    inputEl.focus();
  });

  Promise.allSettled([
    fetch("http://127.0.0.1:9477/grok-lab", { cache: "no-store", mode: "cors" }),
    fetch("http://127.0.0.1:9477/api/znetwork", { cache: "no-store", mode: "cors" }),
  ]).then(function (res) {
    localStack = res.some(function (r) {
      return r.status === "fulfilled" && r.value && r.value.ok;
    });
    var st = document.getElementById("local-status");
    if (st) {
      if (localStack) {
        st.innerHTML =
          'Loopback: <strong>stack live</strong> · <a href="http://127.0.0.1:9477/grok-lab">Grok Lab</a>';
      } else {
        st.textContent = "Loopback: not running — type spin quick in the terminal below";
      }
    }
  });

  runBoot();
})();
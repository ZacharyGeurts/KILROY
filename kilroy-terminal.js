(function () {
  "use strict";

  var VERSION = "1.1.0";
  var TAG = "v1.1.0";
  var CODENAME = "Sanctuary";
  var REPO = "https://github.com/ZacharyGeurts/KILROY";
  var RELEASES = REPO + "/releases/download/" + TAG;
  var VFS = window.KILROY_VFS;

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
    "Sanctuary · loopback authority 127.0.0.1",
    "Mounting virtual rootfs… /bin /proc/kilroy_field /opt/kilroy",
    "Field Die online — TIME RAM THERMO CONTEXT CPU FLOW CACHE DIRECT",
    "Field 1 canonical — depth zero",
    "Pairing Grok16 5.2.0 + AmmoOS 2.0.0-beta3",
    "",
    "KILROY " + VERSION + " " + CODENAME + " — shell ready.",
    "Linux-compatible session: ls, cd, cat, uname, /proc/kilroy_field",
    "Type help for full command list",
    "",
  ];

  var termEl = document.getElementById("kilroy-terminal");
  var inputEl = document.getElementById("terminal-input");
  var outEl = document.getElementById("terminal-output");
  var promptEl = document.getElementById("terminal-prompt");
  var platSel = document.getElementById("spin-platform");
  if (!termEl || !inputEl || !outEl || !VFS) return;

  var history = [];
  var histIdx = -1;
  var booted = false;
  var localStack = false;
  var cwd = "/home/kilroy";
  var env = {
    USER: "kilroy",
    HOME: "/home/kilroy",
    HOSTNAME: "kilroy-field",
    PATH: "/bin:/usr/bin:/opt/kilroy/scripts",
    SHELL: "/bin/sh",
    TERM: "xterm-256color",
  };

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

  function promptPath() {
    var p = cwd === env.HOME ? "~" : cwd;
    return "kilroy@127.0.0.1:" + p + "$ ";
  }

  function updatePrompt() {
    if (promptEl) promptEl.textContent = promptPath();
  }

  function showPrompt() {
    updatePrompt();
    inputEl.focus();
  }

  function parseFlags(args, spec) {
    var flags = {};
    spec.forEach(function (s) {
      flags[s] = false;
    });
    var rest = [];
    args.forEach(function (a) {
      if (a.charAt(0) === "-" && a.length > 1) {
        for (var i = 1; i < a.length; i++) {
          if (spec.indexOf(a.charAt(i)) >= 0) flags[a.charAt(i)] = true;
        }
      } else {
        rest.push(a);
      }
    });
    return { flags: flags, args: rest };
  }

  function humanSize(n) {
    if (n < 1024) return n + "B";
    if (n < 1048576) return (n / 1024).toFixed(1) + "K";
    return (n / 1048576).toFixed(1) + "M";
  }

  function cmdLs(args) {
    var p = parseFlags(args, ["l", "a", "h"]);
    var targets = p.args.length ? p.args : ["."];
    var out = [];
    targets.forEach(function (t, ti) {
      var r = VFS.resolve(VFS.root, cwd, t);
      if (r.err) {
        out.push("ls: cannot access '" + t + "': " + r.err);
        return;
      }
      if (VFS.isDir(r.node)) {
        var entries = VFS.listEntries(r.node, p.flags.a);
        if (p.flags.l) {
          entries.forEach(function (e) {
            if (e.link === "..") {
              out.push("drwxr-xr-x  2 kilroy kilroy 4096  .");
              return;
            }
            if (e.link === ".") {
              out.push("drwxr-xr-x  2 kilroy kilroy 4096  .");
              return;
            }
            var n = e.node;
            var sz = p.flags.h ? humanSize(VFS.sizeOf(n)) : String(VFS.sizeOf(n));
            var nm = n.t === "l" ? e.name + " -> " + n.l : e.name;
            out.push(VFS.formatMode(n) + " 1 " + (n.o || "kilroy") + " " + (n.o || "kilroy") + " " + sz.padStart(5) + "  " + nm);
          });
        } else {
          var names = entries.filter(function (e) {
            return e.name !== "." && e.name !== "..";
          }).map(function (e) {
            return e.node && e.node.t === "d" ? e.name + "/" : e.name;
          });
          out.push(names.join("  "));
        }
      } else {
        out.push(t);
      }
    });
    print(out.join("\n"));
  }

  function cmdCd(args) {
    var target = args[0] || env.HOME;
    if (target === "~") target = env.HOME;
    var r = VFS.resolve(VFS.root, cwd, target);
    if (r.err) {
      print("cd: " + r.err, "t-warn");
      return;
    }
    if (!VFS.isDir(r.node)) {
      print("cd: not a directory: " + target, "t-warn");
      return;
    }
    cwd = r.path;
  }

  function cmdCat(args) {
    if (!args.length) {
      print("cat: missing operand", "t-warn");
      return;
    }
    args.forEach(function (f) {
      var r = VFS.resolve(VFS.root, cwd, f);
      if (r.err) {
        print("cat: " + f + ": " + r.err, "t-warn");
        return;
      }
      if (VFS.isDir(r.node)) {
        print("cat: " + f + ": Is a directory", "t-warn");
        return;
      }
      print(VFS.read(r.node));
    });
  }

  function cmdEcho(args) {
    print(args.join(" "));
  }

  function cmdPwd() {
    print(cwd);
  }

  function cmdUname(args) {
    if (args.indexOf("-a") >= 0) {
      print("KILROY kilroy-field 1.1.0-Sanctuary #1 SMP Field OS x86_64 GNU/Linux");
      return;
    }
    if (args.indexOf("-r") >= 0) {
      print("1.1.0-Sanctuary");
      return;
    }
    if (args.indexOf("-s") >= 0) {
      print("KILROY");
      return;
    }
    if (args.indexOf("-m") >= 0) {
      print("x86_64");
      return;
    }
    print("KILROY");
  }

  function cmdWhoami() {
    print(env.USER);
  }

  function cmdHostname() {
    print(env.HOSTNAME);
  }

  function cmdWhich(args) {
    if (!args.length) return;
    var name = args[0];
    var paths = env.PATH.split(":");
    for (var i = 0; i < paths.length; i++) {
      var r = VFS.resolve(VFS.root, "/", paths[i] + "/" + name);
      if (!r.err && r.node && (r.node.x || r.node.t === "l")) {
        print(r.path);
        return;
      }
    }
    print("which: no " + name + " in (" + env.PATH + ")", "t-warn");
  }

  function cmdHead(args) {
    var n = 10;
    var files = args.slice();
    if (files[0] && /^-\d+$/.test(files[0])) {
      n = parseInt(files.shift().slice(1), 10);
    }
    if (!files.length) {
      print("head: missing file", "t-warn");
      return;
    }
    var r = VFS.resolve(VFS.root, cwd, files[0]);
    if (r.err) {
      print("head: " + r.err, "t-warn");
      return;
    }
    print(VFS.read(r.node).split("\n").slice(0, n).join("\n"));
  }

  function cmdTail(args) {
    var n = 10;
    var files = args.slice();
    if (files[0] === "-n" && files[1]) {
      n = parseInt(files[1], 10);
      files = files.slice(2);
    }
    if (!files.length) {
      print("tail: missing file", "t-warn");
      return;
    }
    var r = VFS.resolve(VFS.root, cwd, files[0]);
    if (r.err) {
      print("tail: " + r.err, "t-warn");
      return;
    }
    var lines = VFS.read(r.node).split("\n");
    print(lines.slice(-n).join("\n"));
  }

  function cmdGrep(args) {
    if (args.length < 2) {
      print("grep: usage: grep PATTERN FILE", "t-warn");
      return;
    }
    var pat = args[0];
    var re;
    try {
      re = new RegExp(pat);
    } catch (e) {
      print("grep: invalid pattern", "t-warn");
      return;
    }
    for (var i = 1; i < args.length; i++) {
      var r = VFS.resolve(VFS.root, cwd, args[i]);
      if (r.err) continue;
      VFS.read(r.node).split("\n").forEach(function (ln) {
        if (re.test(ln)) print(ln);
      });
    }
  }

  function cmdPs() {
    print("  PID TTY          TIME CMD");
    print("    1 ?        00:00:00 init");
    print("   42 ?        00:00:00 kilroy-status");
    print("  9477 ?        00:00:00 grok-lab-panel");
    print("  9481 ?        00:00:00 queen-world");
  }

  function cmdMount() {
    print("rootfs on / type kilroy (rw,field_one)");
    print("proc on /proc type proc (rw)");
    print("sanctuary on 127.0.0.1 type loopback (rw,nodev)");
  }

  function cmdExport(args) {
    if (!args.length) {
      Object.keys(env).forEach(function (k) {
        print("export " + k + "=" + env[k]);
      });
      return;
    }
    var eq = args[0].indexOf("=");
    if (eq < 0) {
      print(env[args[0]] || "", "t-dim");
      return;
    }
    env[args[0].slice(0, eq)] = args[0].slice(eq + 1);
  }

  function cmdTree(args) {
    var start = args[0] || ".";
    var r = VFS.resolve(VFS.root, cwd, start);
    if (r.err) {
      print("tree: " + r.err, "t-warn");
      return;
    }
    function walk(node, prefix) {
      if (!VFS.isDir(node)) return;
      var keys = Object.keys(node.c).sort();
      keys.forEach(function (k, i) {
        var last = i === keys.length - 1;
        var ch = node.c[k];
        print(prefix + (last ? "└── " : "├── ") + (ch.t === "d" ? k + "/" : k));
        if (ch.t === "d") walk(ch, prefix + (last ? "    " : "│   "));
      });
    }
    print(r.path);
    walk(r.node, "");
  }

  function assetName(platKey) {
    return "kilroy-" + VERSION + "-" + (PLATFORMS[platKey] || PLATFORMS.x86_64) + ".tar.gz";
  }

  function spinSteps(profile, platKey) {
    if (profile === "release") {
      var asset = assetName(platKey);
      return [
        "curl -LO " + RELEASES + "/" + asset,
        "tar -xzf " + asset,
        "cd platforms/" + (PLATFORMS[platKey] || PLATFORMS.x86_64),
        "./bin/kilroy-status",
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
      "── Linux shell ──\n" +
      "ls [-la] [path]    list directory\n" +
      "cd [path]          change directory (~ = home)\n" +
      "pwd                print working directory\n" +
      "cat FILE           print file\n" +
      "head / tail FILE   first/last lines\n" +
      "echo TEXT          print line\n" +
      "grep PAT FILE      search lines\n" +
      "uname [-a]         system name (KILROY)\n" +
      "whoami hostname    identity\n" +
      "which CMD          locate binary\n" +
      "ps  mount  tree    system view\n" +
      "export [VAR=val]   environment\n" +
      "clear              clear screen\n" +
      "\n── KILROY ──\n" +
      "spin quick|full|release [plat]\n" +
      "releases  status  field  version\n" +
      "boot  wiki  code\n" +
      "\nTry: ls /proc/kilroy_field  ·  cat /etc/os-release",
      "t-dim"
    );
  }

  function cmdReleases() {
    Object.keys(PLATFORMS).forEach(function (k) {
      print(RELEASES + "/" + assetName(k), "t-accent");
    });
  }

  function cmdSpin(args) {
    var profile = (args[0] || "quick").toLowerCase();
    if (["quick", "full", "release"].indexOf(profile) < 0) profile = "quick";
    var platKey = platSel ? platSel.value : "x86_64";
    if (args[1] && PLATFORMS[args[1]]) platKey = args[1];
    print("# " + profile + " · " + (PLATFORMS[platKey] || platKey), "t-dim");
    spinSteps(profile, platKey).forEach(function (s) {
      print(s, "t-cmd");
    });
  }

  function cmdField() {
    print(
      "Field 1 — one field, depth zero.\n" +
      "Authority: 127.0.0.1\n" +
      "Not Field 1 → hostile → brought to Field 1\n" +
      "Scan: lib/field-one-hostile-scan.py",
      "t-dim"
    );
  }

  function cmdStatus() {
    if (localStack) {
      print("LOOPBACK STACK LIVE — 127.0.0.1:9477", "t-ok");
      print("http://127.0.0.1:9477/grok-lab", "t-accent");
    } else {
      print("No local stack — run: spin quick", "t-warn");
      print("Simulated: cat /proc/kilroy_field/status", "t-dim");
    }
  }

  function runBoot() {
    if (booted) return;
    booted = true;
    print("KILROY terminal — Field OS " + VERSION + " " + CODENAME, "t-banner");
    var i = 0;
    function next() {
      if (i >= BOOT_LINES.length) {
        showPrompt();
        return;
      }
      var t = BOOT_LINES[i++];
      if (!t) {
        line("", "");
        setTimeout(next, 30);
      } else {
        line(t, i < 5 ? "t-boot" : "t-dim");
        setTimeout(next, i < 6 ? 90 : 45);
      }
    }
    next();
  }

  function runScript(path) {
    var r = VFS.resolve(VFS.root, cwd, path);
    if (r.err || !r.node) return false;
    var body = VFS.read(r.node);
    body.split("\n").forEach(function (ln) {
      var t = ln.trim();
      if (!t || t.charAt(0) === "#") return;
      exec(t, true);
    });
    return true;
  }

  function exec(raw, quiet) {
    var cmd = raw.trim();
    if (!cmd) {
      if (!quiet) showPrompt();
      return;
    }
    if (!quiet) {
      history.push(cmd);
      histIdx = history.length;
      line(promptPath() + cmd, "t-echo");
    }

    var parts = cmd.split(/\s+/);
    var name = parts[0].toLowerCase();
    var args = parts.slice(1);

    if (name === "source" || name === ".") {
      if (args[0]) runScript(args[0]);
      if (!quiet) showPrompt();
      return;
    }

    switch (name) {
      case "help":
      case "?":
        cmdHelp();
        break;
      case "ls":
        cmdLs(args);
        break;
      case "cd":
        cmdCd(args);
        break;
      case "pwd":
        cmdPwd();
        break;
      case "cat":
        cmdCat(args);
        break;
      case "echo":
        cmdEcho(args);
        break;
      case "uname":
        cmdUname(args);
        break;
      case "whoami":
        cmdWhoami();
        break;
      case "hostname":
        cmdHostname();
        break;
      case "which":
        cmdWhich(args);
        break;
      case "head":
        cmdHead(args);
        break;
      case "tail":
        cmdTail(args);
        break;
      case "grep":
        cmdGrep(args);
        break;
      case "ps":
        cmdPs();
        break;
      case "mount":
        cmdMount();
        break;
      case "export":
        cmdExport(args);
        break;
      case "tree":
        cmdTree(args);
        break;
      case "ll":
        cmdLs(["-la"].concat(args));
        break;
      case "la":
        cmdLs(["-A"].concat(args));
        break;
      case "version":
      case "ver":
        print("KILROY " + VERSION + " " + CODENAME + " · ABI kilroy-field-1.0");
        break;
      case "boot":
        booted = false;
        outEl.innerHTML = "";
        cwd = env.HOME;
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
        break;
      case "clear":
      case "cls":
        outEl.innerHTML = "";
        booted = true;
        break;
      case "kilroy-status":
        cmdCat(["/proc/kilroy_field/status"]);
        break;
      case "sh":
      case "bash":
        print("KILROY shell — type help", "t-dim");
        break;
      default:
        var rel = VFS.resolve(VFS.root, cwd, name);
        if (!rel.err && rel.node && rel.node.x) {
          runScript(rel.path);
        } else {
          var abs = VFS.resolve(VFS.root, "/", env.PATH.split(":")[0] + "/" + name);
          if (!abs.err && abs.node && abs.node.x) {
            runScript(abs.path);
          } else {
            print(name + ": command not found", "t-warn");
          }
        }
    }
    if (!quiet) showPrompt();
  }

  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      var v = inputEl.value;
      inputEl.value = "";
      exec(v);
    } else if (e.key === "Tab") {
      e.preventDefault();
      var v = inputEl.value;
      var sp = v.split(/\s+/);
      if (sp.length <= 1) {
        var cmds = ["ls", "cd", "cat", "pwd", "help", "clear", "uname", "spin", "status", "field"];
        var m = cmds.filter(function (c) {
          return c.indexOf(v) === 0;
        });
        if (m.length === 1) inputEl.value = m[0] + " ";
      }
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
        st.innerHTML = 'Loopback: <strong>stack live</strong> · <a href="http://127.0.0.1:9477/grok-lab">Grok Lab</a>';
      } else {
        st.textContent = "Loopback: type ls and cat /proc/kilroy_field/status in the terminal";
      }
    }
  });

  updatePrompt();
  runBoot();
})();
(function () {
  const VERSION = "v1.0.0";
  const REPO = "https://github.com/ZacharyGeurts/KILROY.git";

  const profiles = {
    quick: {
      title: "Quick field boot (QEMU)",
      steps: [
        "git clone " + REPO,
        "cd KILROY && git checkout " + VERSION,
        "./scripts/kilroy-become-substrate.sh",
        "./scripts/build-kilroy.sh",
        "./scripts/grok-mkimage.sh",
        "./scripts/grok-boot-qemu.sh",
      ],
    },
    full: {
      title: "Full stack with AmmoOS",
      steps: [
        "git clone https://github.com/ZacharyGeurts/AmmoOS.git",
        "cd AmmoOS && ./scripts/wire-stack.sh",
        "cd KILROY && ./scripts/build-kilroy.sh",
        "cd .. && ./scripts/start-field-stack.sh",
        "open http://127.0.0.1:9477/grok-lab",
      ],
    },
    release: {
      title: "Download release binary",
      steps: [
        "# Pick your platform tarball from Releases",
        "curl -LO https://github.com/ZacharyGeurts/KILROY/releases/download/" + VERSION + "/kilroy-1.0.0-linux-gnu-x86_64.tar.gz",
        "tar -xzf kilroy-1.0.0-linux-gnu-x86_64.tar.gz",
        "./kilroy --help",
      ],
    },
  };

  const platformAsset = {
    x86_64: "kilroy-1.0.0-linux-gnu-x86_64.tar.gz",
    aarch64: "kilroy-1.0.0-linux-gnu-aarch64.tar.gz",
    i386: "kilroy-1.0.0-linux-gnu-i386.tar.gz",
    riscv64: "kilroy-1.0.0-linux-gnu-riscv64.tar.gz",
    arm: "kilroy-1.0.0-linux-gnu-arm.tar.gz",
  };

  const cmdEl = document.getElementById("spin-cmd");
  const statusEl = document.getElementById("local-status");
  const profileSel = document.getElementById("spin-profile");
  const platSel = document.getElementById("spin-platform");

  function render() {
    const profile = profileSel ? profileSel.value : "quick";
    const plat = platSel ? platSel.value : "x86_64";
    let steps = (profiles[profile] || profiles.quick).steps.slice();
    if (profile === "release") {
      const asset = platformAsset[plat] || platformAsset.x86_64;
      steps = [
        "curl -LO https://github.com/ZacharyGeurts/KILROY/releases/download/" + VERSION + "/" + asset,
        "tar -xzf " + asset,
        "./kilroy --help  # or follow kilroy-1.0.0-PLATFORMS.md",
      ];
    }
    if (cmdEl) cmdEl.textContent = steps.join("\n");
  }

  if (profileSel) profileSel.addEventListener("change", render);
  if (platSel) platSel.addEventListener("change", render);
  render();

  const copyBtn = document.getElementById("copy-cmd");
  if (copyBtn && cmdEl) {
    copyBtn.addEventListener("click", function () {
      navigator.clipboard.writeText(cmdEl.textContent || "").then(function () {
        copyBtn.textContent = "Copied!";
        setTimeout(function () { copyBtn.textContent = "Copy commands"; }, 1800);
      });
    });
  }

  if (statusEl) {
    Promise.allSettled([
      fetch("http://127.0.0.1:9477/api/znetwork", { cache: "no-store" }),
      fetch("http://127.0.0.1:9477/grok-lab", { cache: "no-store" }),
    ]).then(function (results) {
      const zn = results[0].status === "fulfilled" && results[0].value.ok;
      const lab = results[1].status === "fulfilled" && results[1].value.ok;
      if (zn && lab) {
        statusEl.innerHTML = "Your machine: <strong>KILROY field stack live</strong> on loopback · <a href=\"http://127.0.0.1:9477/grok-lab\">open Grok Lab</a>";
      } else if (lab) {
        statusEl.innerHTML = "Your machine: <strong>panel up</strong> — run spin-up commands below to boot KILROY kernel";
      } else {
        statusEl.textContent = "Your machine: not running yet — copy commands below to spin up your own KILROY";
      }
    }).catch(function () {
      statusEl.textContent = "Your machine: not running yet — copy commands below to spin up your own KILROY";
    });
  }
})();
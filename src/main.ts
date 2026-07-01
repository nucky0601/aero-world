import Phaser from "phaser";
import "./styles.css";
import { BootScene } from "./scenes/BootScene";
import { TarotHouseScene } from "./scenes/TarotHouseScene";
import { TownScene } from "./scenes/TownScene";
import { ensureProfile } from "./ui/account";
import { renderAdminApp } from "./ui/admin";

const PORTRAIT_SIZE = { width: 540, height: 960 };
const LANDSCAPE_SIZE = { width: 960, height: 540 };
const initialSize = getPreferredGameSize();
let currentGameSize = initialSize;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: initialSize.width,
  height: initialSize.height,
  backgroundColor: "#15151b",
  pixelArt: true,
  roundPixels: true,
  input: {
    activePointers: 4
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: initialSize.width,
    height: initialSize.height
  },
  scene: [BootScene, TownScene, TarotHouseScene]
};

window.addEventListener("load", async () => {
  if (isAdminRoute()) {
    await renderAdminApp();
    return;
  }

  await ensureProfile();
  const game = new Phaser.Game(config);
  syncStableViewportHeight();

  const resizeGame = () => {
    if (isTextEntryActive()) {
      return;
    }
    syncStableViewportHeight();
    const size = getPreferredGameSize();
    if (size.width === currentGameSize.width && size.height === currentGameSize.height) {
      return;
    }
    currentGameSize = size;
    game.scale.resize(size.width, size.height);
    game.events.emit("aero-world-resize", size);
  };

  window.addEventListener("resize", resizeGame);
  window.visualViewport?.addEventListener("resize", resizeGame);
  window.addEventListener("orientationchange", () => window.setTimeout(resizeGame, 240));
  window.addEventListener("focusin", () => document.body.classList.add("text-entry-active"));
  window.addEventListener("focusout", () => {
    document.body.classList.remove("text-entry-active");
    window.setTimeout(resizeGame, 260);
  });
});

function getPreferredGameSize() {
  if (isTouchPhone()) {
    return PORTRAIT_SIZE;
  }

  return window.innerWidth >= window.innerHeight ? LANDSCAPE_SIZE : PORTRAIT_SIZE;
}

function isAdminRoute() {
  return window.location.pathname.endsWith("/admin") || window.location.hash === "#admin" || new URLSearchParams(window.location.search).has("admin");
}

function isTouchPhone() {
  return window.matchMedia("(pointer: coarse)").matches && Math.min(window.screen.width, window.screen.height) <= 820;
}

function isTextEntryActive() {
  const active = document.activeElement;
  return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement;
}

function syncStableViewportHeight() {
  if (isTextEntryActive()) {
    return;
  }
  document.documentElement.style.setProperty("--stable-window-height", `${window.innerHeight}px`);
}

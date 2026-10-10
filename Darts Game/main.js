const RIV_FILE = "darts-vs-jack-v2.riv";
const STATE_MACHINE = "";      // "" = auto-detect (yours is "Game SM")
const SOUND_FOLDER = "sounds/"; // folder next to index.html with the sound files
const SOUND_EXT = ".mp3";       // change to ".wav" if your files are .wav

const canvas = document.getElementById("game");
let r = null;

// ---------- Start the game ----------
if (STATE_MACHINE) {
  startGame(STATE_MACHINE);
} else {
  const probe = new rive.Rive({
    src: RIV_FILE,
    canvas: document.createElement("canvas"),
    autoplay: false,
    onLoad: () => {
      const names = probe.stateMachineNames || [];
      console.log("State machines found:", names);
      probe.cleanup();
      startGame(names[0]);
    },
    onLoadError: (e) => console.error("Rive load error:", e),
  });
}

function startGame(sm) {
  console.log("Using state machine:", sm);
  r = new rive.Rive({
    src: RIV_FILE,
    canvas: canvas,
    stateMachine: sm,
    autoplay: true,
    autoBind: true,
    enableGPUCanvas: true,
    tabIndex: 0,
    layout: new rive.Layout({
      fit: rive.Fit.Layout,
      alignment: rive.Alignment.Center,
    }),
    onLoad: () => {
      r.resizeDrawingSurfaceToCanvas();
      if (r.artboard) r.artboard.volume = 1;
      connectSound();
      canvas.focus();
    },
    onLoadError: (e) => console.error("Rive load error:", e),
  });
}

// ---------- Browser sound player ----------
// The game writes the name of each sound into view model properties:
//   sfx      (String)  e.g. "board_thud#12"  (#number makes repeats fire)
//   music    (String)  e.g. "music_menu", or "" to stop
//   soundOn  (Boolean) mute button state
// The browser plays sounds/<name>.mp3 for each one.

let soundOn = true;
let musicEl = null;
let musicName = "";
const cache = {};

function soundUrl(name) {
  return SOUND_FOLDER + name + SOUND_EXT;
}

function playSfx(name) {
  if (!soundOn || !name) return;
  if (!cache[name]) cache[name] = new Audio(soundUrl(name));
  const a = cache[name].cloneNode(); // allows the same sound to overlap
  a.volume = 0.9;
  a.play().catch((e) => console.warn("sfx failed:", name, e.message));
}

function playMusic(name) {
  if (name === musicName && musicEl) return;
  musicName = name;
  if (musicEl) { musicEl.pause(); musicEl = null; }
  if (!name) return;
  musicEl = new Audio(soundUrl(name));
  musicEl.loop = true;
  musicEl.volume = 0.45;
  if (soundOn) musicEl.play().catch((e) => console.warn("music failed:", name, e.message));
}

function connectSound() {
  const vm = r.viewModelInstance;
  if (!vm) {
    console.warn("No view model bound - sound bridge not connected");
    return;
  }

  const sfx = vm.string("sfx");
  const music = vm.string("music");
  const on = vm.boolean("soundOn");

  if (sfx) sfx.on(() => playSfx(sfx.value.split("#")[0]));
  else console.warn('View model has no "sfx" string property');

  if (music) {
    music.on(() => playMusic(music.value));
    playMusic(music.value);
  } else console.warn('View model has no "music" string property');

  if (on) {
    soundOn = on.value;
    on.on(() => {
      soundOn = on.value;
      if (musicEl) soundOn ? musicEl.play().catch(() => {}) : musicEl.pause();
    });
  }

  console.log("Sound bridge connected");
}

// Browsers block sound until the first click/key: start the music then.
function unlock() {
  if (musicEl && soundOn && musicEl.paused) musicEl.play().catch(() => {});
}
["pointerdown", "keydown", "touchend"].forEach((e) =>
  document.addEventListener(e, unlock, true)
);

// ---------- Window / input ----------
let t;
window.addEventListener("resize", () => {
  clearTimeout(t);
  t = setTimeout(() => r && r.resizeDrawingSurfaceToCanvas(), 100);
});

canvas.addEventListener("pointerdown", () => canvas.focus());
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
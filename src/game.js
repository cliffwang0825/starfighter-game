import { InputManager } from "./input.js";
import { GameStorage } from "./storage.js";
import { TitleScene } from "./scenes/titleScene.js";

const STEP_MS = 1000 / 60;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.clientWidth;
    this.height = canvas.clientHeight;
    this.dpr = window.devicePixelRatio || 1;
    this.storage = new GameStorage();
    this.input = new InputManager(canvas);
    this.scene = null;
    this._lastTime = performance.now();
    this._accumulator = 0;
    this._frameRequest = null;

    window.addEventListener("resize", () => this.resize());
    this.resize();
    this.setScene(new TitleScene(this));
    this.start();
  }

  resize() {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    const targetWidth = rect ? rect.width : window.innerWidth;
    const targetHeight = rect ? rect.height : window.innerHeight;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(targetWidth * this.dpr);
    this.canvas.height = Math.floor(targetHeight * this.dpr);
    this.canvas.style.width = `${targetWidth}px`;
    this.canvas.style.height = `${targetHeight}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.width = targetWidth;
    this.height = targetHeight;
    if (this.scene?.onResize) {
      this.scene.onResize();
    }
  }

  setScene(scene) {
    this.scene = scene;
    if (this.scene?.onResize) {
      this.scene.onResize();
    }
  }

  start() {
    if (this._frameRequest !== null) return;
    this._lastTime = performance.now();
    const loop = (time) => {
      this._frameRequest = window.requestAnimationFrame(loop);
      let delta = time - this._lastTime;
      if (delta > 250) delta = STEP_MS;
      this._lastTime = time;
      this._accumulator += delta;
      this.input.beginFrame();
      while (this._accumulator >= STEP_MS) {
        this.scene.update(STEP_MS / 1000);
        this._accumulator -= STEP_MS;
      }
      this.scene.render(this.ctx);
    };
    this._frameRequest = window.requestAnimationFrame(loop);
  }
}

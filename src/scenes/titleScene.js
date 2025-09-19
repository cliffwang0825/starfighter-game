import { Starfield } from "../effects/starfield.js";
import { GameplayScene } from "./gameplayScene.js";

export class TitleScene {
  constructor(game) {
    this.game = game;
    this.starfield = new Starfield(game, 140);
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
    this.starfield.update(dt);
    if (this.game.input.consumeConfirm()) {
      this.game.setScene(new GameplayScene(this.game));
    }
  }

  render(ctx) {
    this.starfield.render(ctx, this.time * 1000);

    ctx.save();
    ctx.fillStyle = "rgba(8, 12, 22, 0.6)";
    ctx.fillRect(0, 0, this.game.width, this.game.height);

    ctx.fillStyle = "#5ad1ff";
    ctx.font = `bold ${Math.max(48, this.game.width * 0.08)}px 'Orbitron', 'Segoe UI', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(90, 209, 255, 0.7)";
    ctx.shadowBlur = 24;
    ctx.fillText("STARFIGHTER", this.game.width / 2, this.game.height * 0.32);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = `500 ${Math.max(18, this.game.width * 0.03)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText("Vertical Strike Prototype", this.game.width / 2, this.game.height * 0.42);

    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.font = `400 ${Math.max(16, this.game.width * 0.025)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText("Tap / press to deploy", this.game.width / 2, this.game.height * 0.7);

    const best = this.game.storage.bestScore;
    if (best > 0) {
      ctx.font = `400 ${Math.max(14, this.game.width * 0.022)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.fillText(`Best score: ${best}`, this.game.width / 2, this.game.height * 0.78);
    }

    ctx.restore();
  }

  onResize() {
    this.starfield.onResize();
  }
}

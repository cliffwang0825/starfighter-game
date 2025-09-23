import { Starfield } from "../effects/starfield.js";
import { GameplayScene, DIFFICULTY_PRESETS } from "./gameplayScene.js";
import { TitleScene } from "./titleScene.js";

export class DebriefScene {
  constructor(game, payload) {
    this.game = game;
    this.starfield = new Starfield(game, 160);
    this.time = 0;
    this.score = payload.score;
    this.best = Math.max(this.score, this.game.storage.bestScore);
    this.game.storage.updateBestScore(this.best);
    this.difficulty = payload?.difficulty ?? DIFFICULTY_PRESETS[1];
    const requestedPlayers = payload?.playerCount ?? 1;
    this.playerCount = Math.max(1, Math.min(2, Math.round(requestedPlayers) || 1));
  }

  update(dt) {
    this.time += dt;
    this.starfield.update(dt);

    if (this.game.input.consumeConfirm()) {
      this.game.audio.setMusicStage(0);
      this.game.setScene(new GameplayScene(this.game, this.difficulty, this.playerCount));
      return;
    }

    if (this.game.input.wasKeyPressed("Escape")) {
      this.game.setScene(new TitleScene(this.game));
    }
    if (this.game.input.wasKeyPressed("KeyM")) {
      this.game.audio.toggleMusicMute();
    }
    if (this.game.input.wasKeyPressed("KeyN")) {
      this.game.audio.toggleSfxMute();
    }
  }

  render(ctx) {
    this.starfield.render(ctx, this.time * 1000);

    ctx.save();
    ctx.fillStyle = "rgba(5, 8, 16, 0.78)";
    ctx.fillRect(0, 0, this.game.width, this.game.height);

    ctx.fillStyle = "#f8fbff";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(90, 209, 255, 0.4)";
    ctx.shadowBlur = 18;
    ctx.font = `600 ${Math.max(32, this.game.width * 0.05)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText("Mission Debrief", this.game.width / 2, this.game.height * 0.28);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = `500 ${Math.max(24, this.game.width * 0.04)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText(`Score: ${this.score}`, this.game.width / 2, this.game.height * 0.42);

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = `400 ${Math.max(18, this.game.width * 0.03)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText(`Best: ${this.best}`, this.game.width / 2, this.game.height * 0.52);

    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = `400 ${Math.max(16, this.game.width * 0.025)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText("Tap / press to sortie again", this.game.width / 2, this.game.height * 0.7);

    ctx.font = `400 ${Math.max(14, this.game.width * 0.022)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillText("Press Esc to return to title", this.game.width / 2, this.game.height * 0.78);

    ctx.restore();
  }

  onResize() {
    this.starfield.onResize();
  }
}

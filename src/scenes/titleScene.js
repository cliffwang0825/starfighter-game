import { Starfield } from "../effects/starfield.js";
import { GameplayScene, DIFFICULTY_PRESETS } from "./gameplayScene.js";

export class TitleScene {
  constructor(game) {
    this.game = game;
    this.starfield = new Starfield(game, 140);
    this.time = 0;
    this.difficultyIndex = 1;
    this.options = DIFFICULTY_PRESETS;
    this.optionLayout = [];
  }

  update(dt) {
    this.time += dt;
    this.starfield.update(dt);
    this.optionLayout = this.calculateOptionLayout();

    const input = this.game.input;
    if (input.wasKeyPressed("ArrowLeft") || input.wasKeyPressed("KeyA")) {
      this.difficultyIndex = (this.difficultyIndex + this.options.length - 1) % this.options.length;
    }
    if (input.wasKeyPressed("ArrowRight") || input.wasKeyPressed("KeyD")) {
      this.difficultyIndex = (this.difficultyIndex + 1) % this.options.length;
    }

    const pointerTap = input.consumeTap();
    if (pointerTap) {
      const { x, y } = input.pointer;
      const tappedIndex = this.optionLayout.findIndex(
        (rect) => x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height,
      );
      if (tappedIndex !== -1) {
        this.difficultyIndex = tappedIndex;
      } else {
        this.startGame();
      }
    }

    if (input.wasKeyPressed("Enter") || input.wasKeyPressed("Space")) {
      this.startGame();
    }

    if (input.wasKeyPressed("KeyM")) {
      this.game.audio.toggleMute();
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
    ctx.font = `500 ${Math.max(16, this.game.width * 0.026)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText("Select your briefing difficulty", this.game.width / 2, this.game.height * 0.5);

    this.renderDifficultyOptions(ctx);

    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.font = `400 ${Math.max(16, this.game.width * 0.025)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText("Tap outside to deploy • ←/→ to choose", this.game.width / 2, this.game.height * 0.78);
    ctx.fillText("Press Enter / Space to launch", this.game.width / 2, this.game.height * 0.84);

    const best = this.game.storage.bestScore;
    if (best > 0) {
      ctx.font = `400 ${Math.max(14, this.game.width * 0.022)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.fillText(`Best score: ${best}`, this.game.width / 2, this.game.height * 0.9);
    }

    ctx.restore();
  }

  onResize() {
    this.starfield.onResize();
    this.optionLayout = this.calculateOptionLayout();
  }

  calculateOptionLayout() {
    const count = this.options.length;
    if (count === 0) return [];
    const optionWidth = Math.min(240, this.game.width * 0.28);
    const optionHeight = Math.max(90, this.game.height * 0.14);
    const gap = Math.min(32, this.game.width * 0.04);
    const totalWidth = count * optionWidth + (count - 1) * gap;
    const startX = (this.game.width - totalWidth) / 2;
    const y = this.game.height * 0.56;
    const layout = [];
    for (let i = 0; i < count; i += 1) {
      layout.push({
        x: startX + i * (optionWidth + gap),
        y,
        width: optionWidth,
        height: optionHeight,
      });
    }
    return layout;
  }

  renderDifficultyOptions(ctx) {
    const layout = this.optionLayout.length ? this.optionLayout : this.calculateOptionLayout();
    ctx.save();
    ctx.textAlign = "center";
    for (let i = 0; i < layout.length; i += 1) {
      const rect = layout[i];
      const option = this.options[i];
      const selected = i === this.difficultyIndex;
      ctx.save();
      ctx.translate(rect.x, rect.y);
      ctx.fillStyle = selected ? "rgba(90, 209, 255, 0.28)" : "rgba(255, 255, 255, 0.12)";
      ctx.strokeStyle = selected ? "rgba(90, 209, 255, 0.9)" : "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = selected ? 3 : 2;
      drawRoundedRect(ctx, 0, 0, rect.width, rect.height, 16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = selected ? "#5ad1ff" : "rgba(255, 255, 255, 0.8)";
      ctx.font = `600 ${Math.max(22, this.game.width * 0.032)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.fillText(option.label, rect.width / 2, rect.height * 0.42);
      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      ctx.font = `400 ${Math.max(15, this.game.width * 0.024)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.fillText(option.description, rect.width / 2, rect.height * 0.72);
      ctx.restore();
    }
    ctx.restore();
  }

  startGame() {
    const preset = this.options[this.difficultyIndex] ?? DIFFICULTY_PRESETS[1];
    this.game.audio.resume();
    this.game.audio.setMusicStage(0);
    this.game.setScene(new GameplayScene(this.game, preset));
  }
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

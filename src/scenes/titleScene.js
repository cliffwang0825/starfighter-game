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
    this.focusIndex = 0;
    this.playerOptions = [
      { label: "1 PILOT", description: "單人任務", count: 1 },
      { label: "2 PILOTS", description: "協同出擊", count: 2 },
    ];
    this.playerModeIndex = 0;
    this.playerLayout = [];
  }

  update(dt) {
    this.time += dt;
    this.starfield.update(dt);
    this.optionLayout = this.calculateOptionLayout();
    this.playerLayout = this.calculatePlayerLayout();

    const input = this.game.input;
    const focusCount = 2;
    if (input.wasKeyPressed("ArrowUp") || input.wasKeyPressed("KeyW")) {
      this.focusIndex = (this.focusIndex + focusCount - 1) % focusCount;
    }
    if (input.wasKeyPressed("ArrowDown") || input.wasKeyPressed("KeyS")) {
      this.focusIndex = (this.focusIndex + 1) % focusCount;
    }

    if (input.wasKeyPressed("ArrowLeft") || input.wasKeyPressed("KeyA")) {
      if (this.focusIndex === 0) {
        this.difficultyIndex = (this.difficultyIndex + this.options.length - 1) % this.options.length;
      } else {
        this.playerModeIndex = (this.playerModeIndex + this.playerOptions.length - 1) % this.playerOptions.length;
      }
    }
    if (input.wasKeyPressed("ArrowRight") || input.wasKeyPressed("KeyD")) {
      if (this.focusIndex === 0) {
        this.difficultyIndex = (this.difficultyIndex + 1) % this.options.length;
      } else {
        this.playerModeIndex = (this.playerModeIndex + 1) % this.playerOptions.length;
      }
    }

    const pointerTap = input.consumeTap();
    if (pointerTap) {
      const { x, y } = input.pointer;
      const tappedDifficulty = this.optionLayout.findIndex(
        (rect) => x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height,
      );
      if (tappedDifficulty !== -1) {
        this.difficultyIndex = tappedDifficulty;
        this.focusIndex = 0;
      } else {
        const tappedPlayer = this.playerLayout.findIndex(
          (rect) => x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height,
        );
        if (tappedPlayer !== -1) {
          this.playerModeIndex = tappedPlayer;
          this.focusIndex = 1;
        } else {
          this.startGame();
        }
      }
    }

    if (input.wasKeyPressed("Enter") || input.wasKeyPressed("Space")) {
      this.startGame();
    }

    if (input.wasKeyPressed("KeyN")) {
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
    ctx.fillText("Choose difficulty & crew complement", this.game.width / 2, this.game.height * 0.5);
    ctx.font = `400 ${Math.max(14, this.game.width * 0.022)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText("Use ←/→ to cycle, ↑/↓ to change rows or tap a card", this.game.width / 2, this.game.height * 0.53);

    this.renderDifficultyOptions(ctx, this.focusIndex === 0);
    this.renderPlayerOptions(ctx, this.focusIndex === 1);

    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.font = `400 ${Math.max(16, this.game.width * 0.025)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText("P1: WASD • Bomb V   |   P2: Arrow Keys • Bomb M", this.game.width / 2, this.game.height * 0.78);
    ctx.fillText(
      "Press Enter / Space to launch • Auto-fire ready • Double-tap for bomb • Pause P • Restart R • Mute N",
      this.game.width / 2,
      this.game.height * 0.84,
    );

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
    this.playerLayout = this.calculatePlayerLayout();
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

  calculatePlayerLayout() {
    const count = this.playerOptions.length;
    if (count === 0) return [];
    const optionWidth = Math.min(210, this.game.width * 0.3);
    const optionHeight = Math.max(80, this.game.height * 0.12);
    const gap = Math.min(28, this.game.width * 0.038);
    const totalWidth = count * optionWidth + (count - 1) * gap;
    const startX = (this.game.width - totalWidth) / 2;
    const y = this.game.height * 0.66;
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

  renderDifficultyOptions(ctx, focused = false) {
    const layout = this.optionLayout.length ? this.optionLayout : this.calculateOptionLayout();
    ctx.save();
    ctx.textAlign = "center";
    for (let i = 0; i < layout.length; i += 1) {
      const rect = layout[i];
      const option = this.options[i];
      const selected = i === this.difficultyIndex;
      ctx.save();
      ctx.translate(rect.x, rect.y);
      ctx.fillStyle = selected
        ? focused
          ? "rgba(90, 209, 255, 0.35)"
          : "rgba(90, 209, 255, 0.24)"
        : "rgba(255, 255, 255, 0.12)";
      ctx.strokeStyle = selected
        ? focused
          ? "rgba(120, 226, 255, 0.95)"
          : "rgba(90, 209, 255, 0.85)"
        : "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = selected ? (focused ? 3.6 : 2.6) : 1.8;
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

  renderPlayerOptions(ctx, focused = false) {
    const layout = this.playerLayout.length ? this.playerLayout : this.calculatePlayerLayout();
    if (layout.length === 0) return;
    ctx.save();
    ctx.textAlign = "center";
    for (let i = 0; i < layout.length; i += 1) {
      const rect = layout[i];
      const option = this.playerOptions[i];
      const selected = i === this.playerModeIndex;
      const accent = option.count === 1 ? "#ff6d8f" : "#7faeff";
      ctx.save();
      ctx.translate(rect.x, rect.y);
      ctx.fillStyle = selected
        ? focused
          ? `${accent}33`
          : `${accent}22`
        : "rgba(255, 255, 255, 0.12)";
      ctx.strokeStyle = selected
        ? focused
          ? `${accent}dd`
          : `${accent}aa`
        : "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = selected ? (focused ? 3.2 : 2.4) : 1.6;
      drawRoundedRect(ctx, 0, 0, rect.width, rect.height, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = selected ? accent : "rgba(255, 255, 255, 0.85)";
      ctx.font = `600 ${Math.max(20, this.game.width * 0.03)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.fillText(option.label, rect.width / 2, rect.height * 0.44);
      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      ctx.font = `400 ${Math.max(14, this.game.width * 0.022)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.fillText(option.description, rect.width / 2, rect.height * 0.72);
      ctx.restore();
    }
    ctx.restore();
  }

  startGame() {
    const preset = this.options[this.difficultyIndex] ?? DIFFICULTY_PRESETS[1];
    const playerOption = this.playerOptions[this.playerModeIndex] ?? this.playerOptions[0];
    this.game.audio.resume();
    this.game.audio.setMusicStage(0);
    this.game.setScene(new GameplayScene(this.game, preset, playerOption.count));
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

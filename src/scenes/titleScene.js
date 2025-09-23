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
    this.instructionsVisible = false;
    this.instructionButton = null;
  }

  update(dt) {
    this.time += dt;
    this.starfield.update(dt);
    this.optionLayout = this.calculateOptionLayout();
    this.playerLayout = this.calculatePlayerLayout();
    this.instructionButton = this.calculateInstructionButton();

    const input = this.game.input;
    const pointerTap = input.consumeTap();
    const pointer = input.pointer;

    if (this.instructionsVisible) {
      const closeRequested =
        input.wasKeyPressed("Escape") ||
        input.wasKeyPressed("Enter") ||
        input.wasKeyPressed("Space") ||
        input.wasKeyPressed("KeyI");
      if (closeRequested || pointerTap) {
        this.instructionsVisible = false;
      }
      return;
    }

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

    if (pointerTap) {
      const { x, y } = pointer;
      if (
        this.instructionButton &&
        x >= this.instructionButton.x &&
        x <= this.instructionButton.x + this.instructionButton.width &&
        y >= this.instructionButton.y &&
        y <= this.instructionButton.y + this.instructionButton.height
      ) {
        this.instructionsVisible = true;
        return;
      }
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

    if (input.wasKeyPressed("KeyI")) {
      this.instructionsVisible = true;
      return;
    }

    if (input.wasKeyPressed("Enter") || input.wasKeyPressed("Space")) {
      this.startGame();
    }

    if (input.wasKeyPressed("KeyM")) {
      this.game.audio.toggleMusicMute();
    }
    if (input.wasKeyPressed("KeyN")) {
      this.game.audio.toggleSfxMute();
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
    ctx.fillText("Choose difficulty & crew complement", this.game.width / 2, this.game.height * 0.48);
    ctx.font = `400 ${Math.max(14, this.game.width * 0.022)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText("Use ←/→ to cycle, ↑/↓ to change rows or tap a card", this.game.width / 2, this.game.height * 0.515);

    this.renderDifficultyOptions(ctx, this.focusIndex === 0);
    this.renderPlayerOptions(ctx, this.focusIndex === 1);
    this.renderInstructionButton(ctx);

    const best = this.game.storage.bestScore;
    if (best > 0) {
      ctx.font = `400 ${Math.max(14, this.game.width * 0.022)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.fillText(`Best score: ${best}`, this.game.width / 2, this.game.height * 0.9);
    }

    if (this.instructionsVisible) {
      this.renderInstructionOverlay(ctx);
    }

    ctx.restore();
  }

  onResize() {
    this.starfield.onResize();
    this.optionLayout = this.calculateOptionLayout();
    this.playerLayout = this.calculatePlayerLayout();
    this.instructionButton = this.calculateInstructionButton();
  }

  calculateOptionLayout() {
    const count = this.options.length;
    if (count === 0) return [];
    const optionWidth = Math.min(208, this.game.width * 0.24);
    const optionHeight = Math.max(74, this.game.height * 0.11);
    const gap = Math.min(26, this.game.width * 0.034);
    const totalWidth = count * optionWidth + (count - 1) * gap;
    const startX = (this.game.width - totalWidth) / 2;
    const y = this.game.height * 0.57;
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
    const optionWidth = Math.min(188, this.game.width * 0.26);
    const optionHeight = Math.max(68, this.game.height * 0.1);
    const gap = Math.min(24, this.game.width * 0.032);
    const totalWidth = count * optionWidth + (count - 1) * gap;
    const startX = (this.game.width - totalWidth) / 2;
    const diffHeight = Math.max(74, this.game.height * 0.11);
    const diffY = this.game.height * 0.57;
    const diffBottom = diffY + diffHeight;
    const minY = diffBottom + Math.min(40, this.game.height * 0.06);
    const y = Math.max(this.game.height * 0.7, minY);
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

  calculateInstructionButton() {
    const baseWidth = Math.min(220, this.game.width * 0.32);
    const baseHeight = Math.max(44, this.game.height * 0.07);
    const width = baseWidth * 0.5;
    const height = baseHeight * 0.5;
    const margin = Math.max(18, this.game.width * 0.024);
    const x = this.game.width - width - margin;
    const y = this.game.height - height - margin;
    return { x, y, width, height };
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
      ctx.lineWidth = selected ? (focused ? 3.2 : 2.2) : 1.6;
      drawRoundedRect(ctx, 0, 0, rect.width, rect.height, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = selected ? "#5ad1ff" : "rgba(255, 255, 255, 0.82)";
      ctx.font = `600 ${Math.max(20, this.game.width * 0.03)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.fillText(option.label, rect.width / 2, rect.height * 0.4);
      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      ctx.font = `400 ${Math.max(13, this.game.width * 0.021)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.fillText(option.description, rect.width / 2, rect.height * 0.7);
      ctx.restore();
    }
    ctx.restore();
  }

  renderInstructionButton(ctx) {
    const rect = this.instructionButton ?? this.calculateInstructionButton();
    ctx.save();
    ctx.translate(rect.x, rect.y);
    const selected = this.instructionsVisible;
    const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    gradient.addColorStop(0, selected ? "rgba(90, 209, 255, 0.35)" : "rgba(255, 255, 255, 0.18)");
    gradient.addColorStop(1, selected ? "rgba(90, 209, 255, 0.2)" : "rgba(255, 255, 255, 0.08)");
    ctx.fillStyle = gradient;
    ctx.strokeStyle = selected ? "rgba(120, 226, 255, 0.95)" : "rgba(255, 255, 255, 0.48)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const radius = 14;
    ctx.moveTo(radius, 0);
    ctx.lineTo(rect.width - radius, 0);
    ctx.quadraticCurveTo(rect.width, 0, rect.width, radius);
    ctx.lineTo(rect.width, rect.height - radius);
    ctx.quadraticCurveTo(rect.width, rect.height, rect.width - radius, rect.height);
    ctx.lineTo(radius, rect.height);
    ctx.quadraticCurveTo(0, rect.height, 0, rect.height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = `600 ${Math.max(18, this.game.width * 0.028)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("INSTRUCTIONS", rect.width / 2, rect.height / 2);
    ctx.restore();
  }

  renderInstructionOverlay(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(6, 10, 20, 0.86)";
    ctx.fillRect(0, 0, this.game.width, this.game.height);

    const panelWidth = Math.min(this.game.width * 0.8, 520);
    const panelHeight = Math.min(this.game.height * 0.7, 420);
    const x = (this.game.width - panelWidth) / 2;
    const y = (this.game.height - panelHeight) / 2;

    ctx.fillStyle = "rgba(18, 26, 42, 0.85)";
    ctx.strokeStyle = "rgba(120, 226, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const radius = 22;
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + panelWidth - radius, y);
    ctx.quadraticCurveTo(x + panelWidth, y, x + panelWidth, y + radius);
    ctx.lineTo(x + panelWidth, y + panelHeight - radius);
    ctx.quadraticCurveTo(x + panelWidth, y + panelHeight, x + panelWidth - radius, y + panelHeight);
    ctx.lineTo(x + radius, y + panelHeight);
    ctx.quadraticCurveTo(x, y + panelHeight, x, y + panelHeight - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.font = `600 ${Math.max(20, this.game.width * 0.032)}px 'Orbitron', 'Segoe UI', sans-serif`;
    ctx.fillText("操作與提示", this.game.width / 2, y + 56);

    ctx.font = `400 ${Math.max(16, this.game.width * 0.024)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.textAlign = "left";
    const lineHeight = Math.max(28, this.game.height * 0.04);
    const startX = x + 36;
    let cursorY = y + 108;
    const lines = [
      "P1：W/A/S/D 移動，V 投擲炸彈",
      "P2：方向鍵移動，/ 鍵投擲炸彈",
      "自動射擊啟動，可雙擊觸控或按炸彈鍵觸發清場",
      "P 鍵暫停，R 鍵重來，Esc 返回主選單",
      "M 鍵切換背景音樂，N 鍵切換音效",
      "手機可拖曳／點擊操作，支援觸控炸彈",
    ];
    ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
    for (const line of lines) {
      ctx.fillText(line, startX, cursorY);
      cursorY += lineHeight;
    }

    ctx.textAlign = "center";
    ctx.font = `400 ${Math.max(14, this.game.width * 0.022)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillText("按 Enter、Space、I 或點擊任意處關閉", this.game.width / 2, y + panelHeight - 36);

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
      ctx.lineWidth = selected ? (focused ? 2.8 : 2.1) : 1.5;
      drawRoundedRect(ctx, 0, 0, rect.width, rect.height, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = selected ? accent : "rgba(255, 255, 255, 0.84)";
      ctx.font = `600 ${Math.max(18, this.game.width * 0.028)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.fillText(option.label, rect.width / 2, rect.height * 0.42);
      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      ctx.font = `400 ${Math.max(12, this.game.width * 0.02)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.fillText(option.description, rect.width / 2, rect.height * 0.7);
      ctx.restore();
    }
    ctx.restore();
  }

  startGame() {
    this.instructionsVisible = false;
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

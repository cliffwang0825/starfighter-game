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
    this.renderBackdrop(ctx);
    this.renderTitleCluster(ctx);

    this.renderDifficultyOptions(ctx, this.focusIndex === 0);
    this.renderPlayerOptions(ctx, this.focusIndex === 1);
    this.renderSelectionHeaders(ctx);
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

  renderBackdrop(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.game.height);
    gradient.addColorStop(0, "rgba(2, 6, 18, 0.95)");
    gradient.addColorStop(0.4, "rgba(4, 12, 32, 0.92)");
    gradient.addColorStop(1, "rgba(8, 20, 48, 0.94)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.game.width, this.game.height);

    const gridSpacing = Math.max(48, this.game.width * 0.06);
    const offset = (this.time * 40) % gridSpacing;
    ctx.strokeStyle = "rgba(90, 209, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -offset; x < this.game.width + gridSpacing; x += gridSpacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x + this.game.height * 0.08, this.game.height);
    }
    for (let y = -offset; y < this.game.height + gridSpacing; y += gridSpacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.game.width, y + this.game.width * 0.06);
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(140, 226, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const ringCount = 3;
    const maxRadius = Math.hypot(this.game.width, this.game.height) * 0.3;
    const cx = this.game.width * 0.18;
    const cy = this.game.height * 0.24;
    for (let i = 1; i <= ringCount; i += 1) {
      const radius = (maxRadius / ringCount) * i;
      ctx.moveTo(cx + radius, cy);
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(190, 220, 255, 0.18)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const diag = Math.max(this.game.width, this.game.height) * 1.2;
    ctx.moveTo(this.game.width * 0.8, -diag * 0.2);
    ctx.lineTo(this.game.width * 0.52, this.game.height + diag * 0.25);
    ctx.moveTo(this.game.width * 0.92, -diag * 0.15);
    ctx.lineTo(this.game.width * 0.64, this.game.height + diag * 0.22);
    ctx.stroke();
  }

  renderTitleCluster(ctx) {
    const cx = this.game.width / 2;
    const top = this.game.height * 0.18;
    const panelWidth = Math.min(this.game.width * 0.82, 720);
    const panelHeight = Math.min(this.game.height * 0.56, 460);
    const panelX = (this.game.width - panelWidth) / 2;
    const panelY = top - this.game.height * 0.04;

    ctx.save();
    ctx.translate(panelX, panelY);

    ctx.fillStyle = "rgba(8, 18, 40, 0.84)";
    ctx.strokeStyle = "rgba(102, 212, 255, 0.42)";
    ctx.lineWidth = 3;
    drawCutCornerRect(ctx, 0, 0, panelWidth, panelHeight, 28, 40);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(122, 232, 255, 0.25)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([8, 10]);
    drawCutCornerRect(ctx, 12, 12, panelWidth - 24, panelHeight - 24, 22, 30);
    ctx.stroke();
    ctx.setLineDash([]);

    const accentWidth = Math.min(180, panelWidth * 0.22);
    ctx.fillStyle = "rgba(96, 212, 255, 0.2)";
    ctx.fillRect(accentWidth * 0.3, 24, accentWidth, 4);
    ctx.fillStyle = "rgba(96, 212, 255, 0.5)";
    ctx.fillRect(panelWidth - accentWidth * 1.2, 24, accentWidth, 4);

    ctx.restore();

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#7ae0ff";
    ctx.shadowColor = "rgba(122, 224, 255, 0.8)";
    ctx.shadowBlur = 28;
    ctx.font = `900 ${Math.max(54, this.game.width * 0.085)}px 'Orbitron', 'Segoe UI', sans-serif`;
    ctx.fillText("STARFIGHTER", cx, this.game.height * 0.26);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(221, 241, 255, 0.82)";
    ctx.font = `600 ${Math.max(20, this.game.width * 0.032)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText("INTERSTELLAR STRIKE COMMAND", cx, this.game.height * 0.33);

    ctx.fillStyle = "rgba(211, 236, 255, 0.68)";
    ctx.font = `400 ${Math.max(16, this.game.width * 0.025)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText("Select mission parameters", cx, this.game.height * 0.385);

    ctx.fillStyle = "rgba(190, 218, 255, 0.55)";
    ctx.font = `400 ${Math.max(14, this.game.width * 0.022)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText("Navigate with ← → ↑ ↓  •  Tap to engage  •  Press Enter to launch", cx, this.game.height * 0.425);

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
    const width = Math.min(280, this.game.width * 0.5);
    const height = Math.max(48, this.game.height * 0.075);
    const margin = Math.max(26, this.game.height * 0.06);
    const x = (this.game.width - width) / 2;
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
      const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      if (selected) {
        gradient.addColorStop(0, "rgba(90, 209, 255, 0.35)");
        gradient.addColorStop(1, "rgba(90, 209, 255, 0.12)");
      } else {
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.08)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.05)");
      }
      ctx.fillStyle = gradient;
      ctx.strokeStyle = selected
        ? focused
          ? "rgba(140, 226, 255, 0.95)"
          : "rgba(110, 206, 255, 0.8)"
        : "rgba(140, 178, 255, 0.28)";
      ctx.lineWidth = selected ? (focused ? 3.4 : 2.4) : 1.6;
      drawCutCornerRect(ctx, 0, 0, rect.width, rect.height, 16, 22);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = selected ? "#6fdcff" : "rgba(214, 232, 255, 0.86)";
      ctx.font = `700 ${Math.max(20, this.game.width * 0.032)}px 'Orbitron', 'Segoe UI', sans-serif`;
      ctx.fillText(option.label, rect.width / 2, rect.height * 0.42);
      ctx.fillStyle = "rgba(224, 236, 255, 0.7)";
      ctx.font = `400 ${Math.max(13, this.game.width * 0.021)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.fillText(option.description, rect.width / 2, rect.height * 0.73);
      ctx.restore();
    }
    ctx.restore();
  }

  renderInstructionButton(ctx) {
    const rect = this.instructionButton ?? this.calculateInstructionButton();
    ctx.save();
    ctx.translate(rect.x, rect.y);
    const selected = this.instructionsVisible;
    const gradient = ctx.createLinearGradient(0, 0, rect.width, 0);
    gradient.addColorStop(0, selected ? "rgba(122, 231, 255, 0.5)" : "rgba(74, 142, 255, 0.28)");
    gradient.addColorStop(1, selected ? "rgba(52, 186, 255, 0.4)" : "rgba(62, 206, 255, 0.24)");
    ctx.fillStyle = gradient;
    ctx.strokeStyle = selected ? "rgba(148, 242, 255, 0.95)" : "rgba(92, 218, 255, 0.7)";
    ctx.lineWidth = 2.2;
    drawCutCornerRect(ctx, 0, 0, rect.width, rect.height, 18, 28);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    drawCutCornerRect(ctx, 0, 0, rect.width, rect.height, 18, 28);
    ctx.clip();
    ctx.fillStyle = "rgba(11, 28, 48, 0.9)";
    ctx.globalCompositeOperation = "lighter";
    ctx.fillRect(rect.width * 0.12, rect.height * 0.24, rect.width * 0.76, rect.height * 0.52);
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";

    ctx.fillStyle = "rgba(234, 248, 255, 0.9)";
    ctx.font = `700 ${Math.max(18, this.game.width * 0.03)}px 'Orbitron', 'Segoe UI', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("INSTRUCTIONS", rect.width / 2, rect.height / 2);
    ctx.restore();
  }

  renderInstructionOverlay(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(4, 8, 18, 0.9)";
    ctx.fillRect(0, 0, this.game.width, this.game.height);

    const panelWidth = Math.min(this.game.width * 0.8, 540);
    const panelHeight = Math.min(this.game.height * 0.72, 440);
    const x = (this.game.width - panelWidth) / 2;
    const y = (this.game.height - panelHeight) / 2;

    ctx.fillStyle = "rgba(12, 24, 44, 0.92)";
    ctx.strokeStyle = "rgba(130, 236, 255, 0.9)";
    ctx.lineWidth = 2.4;
    drawCutCornerRect(ctx, x, y, panelWidth, panelHeight, 26, 36);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(120, 220, 255, 0.4)";
    ctx.setLineDash([10, 12]);
    drawCutCornerRect(ctx, x + 14, y + 14, panelWidth - 28, panelHeight - 28, 20, 28);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(224, 244, 255, 0.95)";
    ctx.font = `700 ${Math.max(20, this.game.width * 0.032)}px 'Orbitron', 'Segoe UI', sans-serif`;
    ctx.fillText("操作與提示", this.game.width / 2, y + 60);

    ctx.font = `400 ${Math.max(16, this.game.width * 0.024)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.textAlign = "left";
    const lineHeight = Math.max(28, this.game.height * 0.04);
    const startX = x + 40;
    let cursorY = y + 116;
    const lines = [
      "P1：W/A/S/D 移動，V 投擲炸彈",
      "P2：方向鍵移動，/ 鍵投擲炸彈",
      "自動射擊啟動，可雙擊觸控或按炸彈鍵觸發清場",
      "P 鍵暫停，R 鍵重來，Esc 返回主選單",
      "M 鍵切換背景音樂，N 鍵切換音效",
      "手機可拖曳／點擊操作，支援觸控炸彈",
    ];
    ctx.fillStyle = "rgba(216, 234, 255, 0.85)";
    for (const line of lines) {
      ctx.fillText(line, startX, cursorY);
      cursorY += lineHeight;
    }

    ctx.textAlign = "center";
    ctx.font = `500 ${Math.max(14, this.game.width * 0.022)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillStyle = "rgba(190, 220, 255, 0.65)";
    ctx.fillText("按 Enter、Space、I 或點擊任意處關閉", this.game.width / 2, y + panelHeight - 40);

    ctx.restore();
  }

  renderSelectionHeaders(ctx) {
    ctx.save();
    ctx.textBaseline = "middle";
    ctx.font = `600 ${Math.max(14, this.game.width * 0.022)}px 'Orbitron', 'Segoe UI', sans-serif`;
    ctx.fillStyle = "rgba(160, 220, 255, 0.78)";

    if (this.optionLayout.length > 0) {
      const rowTop = this.optionLayout[0].y - Math.max(28, this.game.height * 0.05);
      ctx.textAlign = "left";
      ctx.fillText(
        "STELLAR THREAT INDEX",
        this.optionLayout[0].x,
        rowTop,
      );
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(120, 210, 255, 0.65)";
      const lastDifficulty = this.optionLayout[this.optionLayout.length - 1];
      ctx.fillText("SELECT MISSION", lastDifficulty.x + lastDifficulty.width, rowTop);
      ctx.fillStyle = "rgba(160, 220, 255, 0.78)";
    }

    if (this.playerLayout.length > 0) {
      const rowTop = this.playerLayout[0].y - Math.max(24, this.game.height * 0.045);
      ctx.textAlign = "left";
      ctx.fillText("WING CONFIGURATION", this.playerLayout[0].x, rowTop);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(120, 210, 255, 0.65)";
      const lastPlayer = this.playerLayout[this.playerLayout.length - 1];
      ctx.fillText("DEPLOYMENT ROSTER", lastPlayer.x + lastPlayer.width, rowTop);
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
      const accentHex = option.count === 1 ? "#ff6d8f" : "#7faeff";
      const accentRgb = option.count === 1 ? [255, 109, 143] : [127, 174, 255];
      ctx.save();
      ctx.translate(rect.x, rect.y);
      const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      if (selected) {
        gradient.addColorStop(0, `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, 0.28)`);
        gradient.addColorStop(1, `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, 0.12)`);
      } else {
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.08)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.04)");
      }
      ctx.fillStyle = gradient;
      ctx.strokeStyle = selected
        ? focused
          ? `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, 0.86)`
          : `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, 0.65)`
        : "rgba(160, 200, 255, 0.28)";
      ctx.lineWidth = selected ? (focused ? 3 : 2.2) : 1.6;
      drawCutCornerRect(ctx, 0, 0, rect.width, rect.height, 14, 18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = selected ? accentHex : "rgba(227, 236, 255, 0.86)";
      ctx.font = `700 ${Math.max(18, this.game.width * 0.03)}px 'Orbitron', 'Segoe UI', sans-serif`;
      ctx.fillText(option.label, rect.width / 2, rect.height * 0.44);
      ctx.fillStyle = "rgba(224, 236, 255, 0.72)";
      ctx.font = `400 ${Math.max(12, this.game.width * 0.02)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.fillText(option.description, rect.width / 2, rect.height * 0.72);
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

function drawCutCornerRect(ctx, x, y, width, height, radius, cut) {
  const r = Math.min(radius, width / 2, height / 2);
  const c = Math.min(cut, width / 3, height / 3);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + c, y + height);
  ctx.lineTo(x, y + height - c);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

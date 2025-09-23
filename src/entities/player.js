import { clamp, lerp } from "../utils.js";

const MODEL_RADIUS = 16.5;
const DEFAULT_RADIUS = MODEL_RADIUS * 0.8;

export class Player {
  constructor(game, options = {}) {
    this.game = game;
    this.playerIndex = options.playerIndex ?? 0;
    this.radius = DEFAULT_RADIUS;
    this.baseSpeed = 340;
    this.speed = this.baseSpeed;
    this.maxHealth = 3;
    this.moveSmoothing = 0.25;
    this.baseFireCooldown = 0.12;
    this.fireCooldown = this.baseFireCooldown;
    this.weaponMode = "spread";
    this.weaponLevel = 1;
    this.speedBoostTimer = 0;
    this.shieldTimer = 0;
    this.bombCapacity = 2;
    this.fireTimer = 0;
    this.invulnerableTimer = 0;
    this.spawnX = options.spawnX ?? this.game.width / 2;
    this.spawnY = options.spawnY ?? this.game.height - 96;
    this.palette = options.palette ?? this.getPaletteForIndex(this.playerIndex);
    this.isEliminated = false;
    this.reset();
  }

  reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.velocityX = 0;
    this.velocityY = 0;
    this.fireTimer = 0;
    this.health = this.maxHealth;
    this.weaponMode = "spread";
    this.weaponLevel = 1;
    this.speedBoostTimer = 0;
    this.shieldTimer = 0;
    this.invulnerableTimer = 0;
    this.isEliminated = false;
    this.updateDerivedStats();
  }

  setSpawnPosition(x, y) {
    this.spawnX = x;
    this.spawnY = y;
    if (!this.isEliminated) {
      this.x = x;
      this.y = y;
    }
  }

  update(dt, input) {
    if (this.isEliminated || this.health <= 0) {
      return [];
    }

    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer = Math.max(0, this.speedBoostTimer - dt);
      if (this.speedBoostTimer === 0) {
        this.updateDerivedStats();
      }
    }

    if (this.shieldTimer > 0) {
      this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    }

    const keyboardMove = input.getMovementVectorForPlayer(this.playerIndex);
    let moveX = keyboardMove.x;
    let moveY = keyboardMove.y;

    if (this.playerIndex === 0 && input.pointer.active) {
      const dx = input.pointer.x - this.x;
      const dy = input.pointer.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 8) {
        moveX += clamp(dx / 200, -1, 1);
        moveY += clamp(dy / 200, -1, 1);
      }
    }

    if (moveX !== 0 || moveY !== 0) {
      const length = Math.hypot(moveX, moveY) || 1;
      moveX /= length;
      moveY /= length;
    }

    this.velocityX = lerp(this.velocityX, moveX * this.speed, this.moveSmoothing);
    this.velocityY = lerp(this.velocityY, moveY * this.speed, this.moveSmoothing);

    this.x = clamp(this.x + this.velocityX * dt, this.radius, this.game.width - this.radius);
    this.y = clamp(this.y + this.velocityY * dt, this.radius, this.game.height - this.radius * 0.8);

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    }

    if (this.fireTimer > 0) {
      this.fireTimer = Math.max(0, this.fireTimer - dt);
    }

    const fired = [];
    if (this.fireTimer <= 0) {
      this.fireTimer = this.fireCooldown;
      const activeLevel = this.getStoredWeaponLevel();
      if (this.weaponMode === "laser" && activeLevel > 0) {
        const beams = activeLevel === 1 ? 1 : activeLevel === 2 ? 2 : 3;
        const offsetBase = 16;
        for (let i = 0; i < beams; i += 1) {
          const offset = (i - (beams - 1) / 2) * offsetBase;
          fired.push({
            x: this.x + offset,
            y: this.y - this.radius - 10,
            velocityY: -900,
            velocityX: 0,
            radius: 6 + activeLevel,
            friendly: true,
            damage: 2 + activeLevel,
            owner: this.playerIndex,
            type: "laser",
          });
        }
      } else if (this.weaponMode === "spread") {
        const spreadRank = Math.max(1, activeLevel);
        const bulletSpeed = -620 - spreadRank * 40;
        const patterns = [{ angle: 0, offsetX: 0, offsetY: -this.radius - 4 }];
        if (spreadRank >= 1) {
          patterns.push({ angle: -0.16, offsetX: -12, offsetY: -this.radius + 4 });
          patterns.push({ angle: 0.16, offsetX: 12, offsetY: -this.radius + 4 });
        }
        if (spreadRank >= 2) {
          patterns.push({ angle: -0.32, offsetX: -18, offsetY: -this.radius + 12 });
          patterns.push({ angle: 0.32, offsetX: 18, offsetY: -this.radius + 12 });
        }
        if (spreadRank >= 3) {
          patterns.push({ angle: -0.48, offsetX: -26, offsetY: -this.radius + 16 });
          patterns.push({ angle: 0.48, offsetX: 26, offsetY: -this.radius + 16 });
        }
        for (const pattern of patterns) {
          const speedX = Math.sin(pattern.angle) * Math.abs(bulletSpeed);
          const speedY = Math.cos(pattern.angle) * bulletSpeed;
          fired.push({
            x: this.x + pattern.offsetX,
            y: this.y + pattern.offsetY,
            velocityY: speedY,
            velocityX: speedX,
            radius: 4,
            friendly: true,
            damage: 1,
            owner: this.playerIndex,
          });
        }
      }
      if (fired.length > 0) {
        this.game.audio.playShot();
      }
    }

    return fired;
  }

  updateDerivedStats() {
    this.speed = this.baseSpeed + (this.speedBoostTimer > 0 ? 90 : 0);
    let cooldown = this.baseFireCooldown;
    const storedLevel = this.getStoredWeaponLevel();
    if (this.weaponMode === "spread") {
      const modifiers = { 1: 1, 2: 0.9, 3: 0.84 };
      cooldown *= modifiers[storedLevel] ?? 0.78;
    } else if (this.weaponMode === "laser") {
      const presets = [this.baseFireCooldown, 0.24, 0.2, 0.16];
      cooldown = presets[storedLevel] ?? 0.16;
    }
    if (this.speedBoostTimer > 0) {
      cooldown *= 0.72;
    }
    this.fireCooldown = Math.max(0.08, cooldown);
  }

  takeHit(amount = 1) {
    if (this.shieldTimer > 0) {
      this.shieldTimer = Math.max(0, this.shieldTimer - 1.5);
      return;
    }
    this.health = Math.max(0, this.health - amount);
    this.invulnerableTimer = 2;
  }

  heal(amount = 1) {
    this.health = clamp(this.health + amount, 0, this.maxHealth);
  }

  applyPowerUp(type) {
    switch (type) {
      case "bomb":
        return "bomb";
      case "speed":
        this.speedBoostTimer = 8;
        this.updateDerivedStats();
        break;
      case "spread": {
        if (this.weaponMode === "spread") {
          this.weaponLevel = Math.min(3, this.weaponLevel + 1);
        } else {
          this.weaponLevel = Math.max(1, Math.min(3, this.weaponLevel));
        }
        this.weaponMode = "spread";
        this.updateDerivedStats();
        this.weaponLevel = this.getStoredWeaponLevel();
        break;
      }
      case "laser": {
        if (this.weaponMode === "laser") {
          this.weaponLevel = Math.min(3, this.weaponLevel + 1);
        } else {
          this.weaponLevel = Math.max(1, Math.min(3, this.weaponLevel));
        }
        this.weaponMode = "laser";
        this.updateDerivedStats();
        this.weaponLevel = this.getStoredWeaponLevel();
        break;
      }
      case "health":
        this.heal(1);
        break;
      case "shield":
        this.heal(1);
        this.shieldTimer = 8;
        break;
      default:
        break;
    }
    return null;
  }

  eliminate() {
    this.isEliminated = true;
    this.health = 0;
  }

  get isInvulnerable() {
    return this.invulnerableTimer > 0 || this.shieldTimer > 0;
  }

  getStoredWeaponLevel() {
    return Math.max(1, Math.min(3, Math.round(this.weaponLevel ?? 1)));
  }

  getWeaponLabel() {
    switch (this.weaponMode) {
      case "spread":
        return "SPREAD";
      case "laser":
        return "LASER";
      default:
        return "PRIMARY";
    }
  }

  getWeaponDisplayInfo() {
    const gaugeLevel = this.getStoredWeaponLevel();
    return {
      mode: this.weaponMode,
      label: this.getWeaponLabel(),
      level: gaugeLevel,
      gaugeLevel,
    };
  }

  render(ctx) {
    if (this.isEliminated) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    const scale = this.radius / MODEL_RADIUS;

    if (this.isInvulnerable) {
      ctx.save();
      const shimmerTime = (typeof performance !== "undefined" ? performance.now() : Date.now());
      ctx.globalAlpha = 0.6 + Math.sin(shimmerTime * 0.015) * 0.1;
      ctx.strokeStyle = "rgba(255, 230, 255, 0.8)";
      ctx.lineWidth = 6 * scale;
      ctx.beginPath();
      ctx.ellipse(0, 4 * scale, this.radius + 6, this.radius + 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const hullTop = this.palette.hullTop ?? this.palette.top ?? "#ffffff";
    const hullMid = this.palette.hullMid ?? this.palette.mid ?? "#ffeaea";
    const hullBottom = this.palette.hullBottom ?? this.palette.base ?? "#d51928";
    const hullEdge = this.palette.hullEdge ?? this.palette.shadow ?? "#4e0713";
    const wingPrimary = this.palette.wingPrimary ?? this.palette.wingBase ?? "#b60e1b";
    const wingShadow = this.palette.wingShadow ?? "#2a030a";
    const trim = this.palette.trim ?? "rgba(255, 255, 255, 0.75)";
    const accent = this.palette.accent ?? "#9fd6ff";

    const wingGradient = ctx.createLinearGradient(0, -18 * scale, 0, 44 * scale);
    wingGradient.addColorStop(0, `${trim}`);
    wingGradient.addColorStop(0.45, wingPrimary);
    wingGradient.addColorStop(1, wingShadow);
    ctx.fillStyle = wingGradient;
    ctx.beginPath();
    ctx.moveTo(-38 * scale, -8 * scale);
    ctx.lineTo(-16 * scale, 6 * scale);
    ctx.lineTo(-20 * scale, 34 * scale);
    ctx.quadraticCurveTo(-42 * scale, 22 * scale, -46 * scale, 4 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(38 * scale, -8 * scale);
    ctx.lineTo(16 * scale, 6 * scale);
    ctx.lineTo(20 * scale, 34 * scale);
    ctx.quadraticCurveTo(42 * scale, 22 * scale, 46 * scale, 4 * scale);
    ctx.closePath();
    ctx.fill();

    const hullGradient = ctx.createLinearGradient(0, -44 * scale, 0, 42 * scale);
    hullGradient.addColorStop(0, hullTop);
    hullGradient.addColorStop(0.45, hullMid);
    hullGradient.addColorStop(0.8, hullBottom);
    hullGradient.addColorStop(1, hullEdge);
    ctx.fillStyle = hullGradient;
    ctx.beginPath();
    ctx.moveTo(0, -44 * scale);
    ctx.lineTo(11 * scale, -32 * scale);
    ctx.quadraticCurveTo(18 * scale, -12 * scale, 14 * scale, 18 * scale);
    ctx.lineTo(9 * scale, 46 * scale);
    ctx.quadraticCurveTo(0, 54 * scale, -9 * scale, 46 * scale);
    ctx.lineTo(-14 * scale, 18 * scale);
    ctx.quadraticCurveTo(-18 * scale, -12 * scale, -11 * scale, -32 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 3 * scale;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(0, -38 * scale);
    ctx.lineTo(0, 34 * scale);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = trim;
    ctx.beginPath();
    ctx.moveTo(-12 * scale, -22 * scale);
    ctx.lineTo(-6 * scale, -4 * scale);
    ctx.lineTo(-10 * scale, 14 * scale);
    ctx.lineTo(-18 * scale, 0);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(12 * scale, -22 * scale);
    ctx.lineTo(6 * scale, -4 * scale);
    ctx.lineTo(10 * scale, 14 * scale);
    ctx.lineTo(18 * scale, 0);
    ctx.closePath();
    ctx.fill();

    const canopy = ctx.createLinearGradient(0, -16 * scale, 0, 8 * scale);
    canopy.addColorStop(0, this.palette.canopyHighlight ?? "rgba(210, 240, 255, 0.95)");
    canopy.addColorStop(0.5, this.palette.canopyMid ?? "rgba(90, 160, 255, 0.85)");
    canopy.addColorStop(1, this.palette.canopyShadow ?? "rgba(20, 40, 80, 0.92)");
    ctx.fillStyle = canopy;
    ctx.beginPath();
    ctx.moveTo(0, -24 * scale);
    ctx.quadraticCurveTo(10 * scale, -14 * scale, 8 * scale, -2 * scale);
    ctx.quadraticCurveTo(0, 10 * scale, -8 * scale, -2 * scale);
    ctx.quadraticCurveTo(-10 * scale, -14 * scale, 0, -24 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.ellipse(-4 * scale, -10 * scale, 5 * scale, 7 * scale, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    const engineGlowLeft = ctx.createRadialGradient(-6 * scale, 38 * scale, 2 * scale, -6 * scale, 38 * scale, 16 * scale);
    engineGlowLeft.addColorStop(0, this.palette.engineCore ?? "rgba(255, 180, 120, 0.9)");
    engineGlowLeft.addColorStop(0.6, this.palette.engineMid ?? "rgba(255, 120, 40, 0.35)");
    engineGlowLeft.addColorStop(1, this.palette.engineEdge ?? "rgba(255, 80, 0, 0)");
    const engineGlowRight = ctx.createRadialGradient(6 * scale, 38 * scale, 2 * scale, 6 * scale, 38 * scale, 16 * scale);
    engineGlowRight.addColorStop(0, this.palette.engineCore ?? "rgba(255, 180, 120, 0.9)");
    engineGlowRight.addColorStop(0.6, this.palette.engineMid ?? "rgba(255, 120, 40, 0.35)");
    engineGlowRight.addColorStop(1, this.palette.engineEdge ?? "rgba(255, 80, 0, 0)");

    ctx.fillStyle = engineGlowLeft;
    ctx.beginPath();
    ctx.ellipse(-6 * scale, 38 * scale, 12 * scale, 10 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = engineGlowRight;
    ctx.beginPath();
    ctx.ellipse(6 * scale, 38 * scale, 12 * scale, 10 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `${accent}88`;
    ctx.lineWidth = 2 * scale;
    ctx.setLineDash([6 * scale, 4 * scale]);
    ctx.beginPath();
    ctx.moveTo(-20 * scale, 10 * scale);
    ctx.lineTo(-28 * scale, 26 * scale);
    ctx.moveTo(20 * scale, 10 * scale);
    ctx.lineTo(28 * scale, 26 * scale);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  getPaletteForIndex(index) {
    if (index === 1) {
      return {
        hullTop: "#f1f6ff",
        hullMid: "#d3dcff",
        hullBottom: "#2848d4",
        hullEdge: "#050a22",
        wingPrimary: "#1e3aa8",
        wingShadow: "#070d1f",
        trim: "#dfe9ff",
        accent: "#7fb4ff",
        canopyHighlight: "rgba(255, 222, 240, 0.95)",
        canopyMid: "rgba(190, 140, 255, 0.82)",
        canopyShadow: "rgba(90, 40, 120, 0.9)",
        engineCore: "rgba(120, 220, 255, 0.9)",
        engineMid: "rgba(60, 150, 255, 0.4)",
        engineEdge: "rgba(30, 80, 255, 0)",
      };
    }
    return {
      hullTop: "#fff7fb",
      hullMid: "#ffd9df",
      hullBottom: "#d72038",
      hullEdge: "#470912",
      wingPrimary: "#ff3f5f",
      wingShadow: "#2e0812",
      trim: "#ffeef5",
      accent: "#9fd6ff",
      canopyHighlight: "rgba(210, 240, 255, 0.95)",
      canopyMid: "rgba(120, 180, 255, 0.85)",
      canopyShadow: "rgba(24, 46, 92, 0.9)",
      engineCore: "rgba(255, 190, 140, 0.9)",
      engineMid: "rgba(255, 130, 50, 0.35)",
      engineEdge: "rgba(255, 90, 10, 0)",
    };
  }
}

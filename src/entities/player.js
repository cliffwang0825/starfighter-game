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
    this.spreadLevel = 0;
    this.spreadTimer = 0;
    this.weaponMode = "cannon";
    this.laserLevel = 0;
    this.laserTimer = 0;
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
    this.spreadLevel = 0;
    this.spreadTimer = 0;
    this.weaponMode = "cannon";
    this.laserLevel = 0;
    this.laserTimer = 0;
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

    if (this.laserTimer > 0) {
      this.laserTimer = Math.max(0, this.laserTimer - dt);
      if (this.laserTimer === 0) {
        this.laserLevel = 0;
        if (this.weaponMode === "laser") {
          this.weaponMode = "cannon";
          this.updateDerivedStats();
        }
      }
    }

    if (this.spreadTimer > 0) {
      this.spreadTimer = Math.max(0, this.spreadTimer - dt);
      if (this.spreadTimer === 0) {
        this.spreadLevel = 0;
        if (this.weaponMode === "spread") {
          this.weaponMode = "cannon";
        }
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
      if (this.weaponMode === "laser" && this.laserLevel > 0) {
        const beams = this.laserLevel === 1 ? 1 : this.laserLevel === 2 ? 2 : 3;
        const offsetBase = 16;
        for (let i = 0; i < beams; i += 1) {
          const offset = (i - (beams - 1) / 2) * offsetBase;
          fired.push({
            x: this.x + offset,
            y: this.y - this.radius - 10,
            velocityY: -900,
            velocityX: 0,
            radius: 6 + this.laserLevel,
            friendly: true,
            damage: 2 + this.laserLevel,
            owner: this.playerIndex,
            type: "laser",
          });
        }
      } else {
        const spreadRank = this.weaponMode === "spread" ? this.spreadLevel : 0;
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
    if (this.weaponMode === "spread" && this.spreadLevel > 0) {
      const modifiers = [1, 0.9, 0.84, 0.78];
      cooldown *= modifiers[this.spreadLevel] ?? 0.78;
    } else if (this.weaponMode === "laser" && this.laserLevel > 0) {
      const presets = [this.baseFireCooldown, 0.24, 0.2, 0.16];
      cooldown = presets[this.laserLevel] ?? 0.16;
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
      case "spread":
        this.weaponMode = "spread";
        this.spreadLevel = Math.min(3, this.spreadLevel > 0 ? this.spreadLevel + 1 : 1);
        this.spreadTimer = 12;
        this.laserLevel = 0;
        this.laserTimer = 0;
        this.updateDerivedStats();
        break;
      case "laser":
        this.weaponMode = "laser";
        this.laserLevel = Math.min(3, this.laserLevel > 0 ? this.laserLevel + 1 : 1);
        this.laserTimer = 10 + this.laserLevel * 2;
        this.spreadLevel = 0;
        this.spreadTimer = 0;
        this.updateDerivedStats();
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

    const bodyGradient = ctx.createLinearGradient(0, -40 * scale, 0, 36 * scale);
    bodyGradient.addColorStop(0, this.palette.top ?? "#ffffff");
    bodyGradient.addColorStop(0.4, this.palette.mid ?? "#ffeaea");
    bodyGradient.addColorStop(0.7, this.palette.base ?? "#d51928");
    bodyGradient.addColorStop(1, this.palette.shadow ?? "#6c0b17");
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(0, -42 * scale);
    ctx.bezierCurveTo(20 * scale, -34 * scale, 26 * scale, 8 * scale, 18 * scale, 34 * scale);
    ctx.lineTo(0, 28 * scale);
    ctx.lineTo(-18 * scale, 34 * scale);
    ctx.bezierCurveTo(-26 * scale, 8 * scale, -20 * scale, -34 * scale, 0, -42 * scale);
    ctx.closePath();
    ctx.fill();

    const wingGradient = ctx.createLinearGradient(0, -12 * scale, 0, 36 * scale);
    wingGradient.addColorStop(0, this.palette.wingHighlight ?? "#f6f6f8");
    wingGradient.addColorStop(0.6, this.palette.wingBase ?? "#b60e1b");
    wingGradient.addColorStop(1, this.palette.wingShadow ?? "#420208");
    ctx.fillStyle = wingGradient;
    ctx.beginPath();
    ctx.moveTo(-30 * scale, -4 * scale);
    ctx.lineTo(-8 * scale, 14 * scale);
    ctx.lineTo(-18 * scale, 36 * scale);
    ctx.lineTo(-42 * scale, 18 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(30 * scale, -4 * scale);
    ctx.lineTo(8 * scale, 14 * scale);
    ctx.lineTo(18 * scale, 36 * scale);
    ctx.lineTo(42 * scale, 18 * scale);
    ctx.closePath();
    ctx.fill();

    const canopy = ctx.createLinearGradient(0, -12 * scale, 0, 10 * scale);
    canopy.addColorStop(0, this.palette.canopyHighlight ?? "rgba(180, 220, 255, 0.95)");
    canopy.addColorStop(0.5, this.palette.canopyMid ?? "rgba(70, 140, 220, 0.85)");
    canopy.addColorStop(1, this.palette.canopyShadow ?? "rgba(20, 40, 80, 0.9)");
    ctx.fillStyle = canopy;
    ctx.beginPath();
    ctx.ellipse(0, -4 * scale, 16 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.ellipse(-4 * scale, -8 * scale, 6 * scale, 8 * scale, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    const engineGlow = ctx.createRadialGradient(0, 32 * scale, 2 * scale, 0, 32 * scale, 18 * scale);
    engineGlow.addColorStop(0, this.palette.engineCore ?? "rgba(255, 180, 120, 0.9)");
    engineGlow.addColorStop(0.6, this.palette.engineMid ?? "rgba(255, 120, 40, 0.35)");
    engineGlow.addColorStop(1, this.palette.engineEdge ?? "rgba(255, 80, 0, 0)");
    ctx.fillStyle = engineGlow;
    ctx.beginPath();
    ctx.ellipse(0, 32 * scale, 18 * scale, 12 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  getPaletteForIndex(index) {
    if (index === 1) {
      return {
        top: "#e4f4ff",
        mid: "#cfd8ff",
        base: "#2c4fd8",
        shadow: "#081038",
        wingHighlight: "#e2e9ff",
        wingBase: "#1e3aa8",
        wingShadow: "#040924",
        canopyHighlight: "rgba(255, 200, 200, 0.95)",
        canopyMid: "rgba(240, 120, 140, 0.85)",
        canopyShadow: "rgba(130, 40, 60, 0.9)",
        engineCore: "rgba(130, 220, 255, 0.9)",
        engineMid: "rgba(80, 170, 255, 0.35)",
        engineEdge: "rgba(30, 110, 255, 0)",
      };
    }
    return {
      top: "#ffffff",
      mid: "#ffeaea",
      base: "#d51928",
      shadow: "#6c0b17",
      wingHighlight: "#f6f6f8",
      wingBase: "#b60e1b",
      wingShadow: "#420208",
      canopyHighlight: "rgba(180, 220, 255, 0.95)",
      canopyMid: "rgba(70, 140, 220, 0.85)",
      canopyShadow: "rgba(20, 40, 80, 0.9)",
      engineCore: "rgba(255, 180, 120, 0.9)",
      engineMid: "rgba(255, 120, 40, 0.35)",
      engineEdge: "rgba(255, 80, 0, 0)",
    };
  }
}

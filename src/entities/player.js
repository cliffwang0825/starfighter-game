import { clamp, lerp } from "../utils.js";

export class Player {
  constructor(game) {
    this.game = game;
    this.radius = 16.5;
    this.baseSpeed = 340;
    this.speed = this.baseSpeed;
    this.maxHealth = 3;
    this.moveSmoothing = 0.25;
    this.baseFireCooldown = 0.12;
    this.fireCooldown = this.baseFireCooldown;
    this.spreadLevel = 0;
    this.spreadTimer = 0;
    this.speedBoostTimer = 0;
    this.shieldTimer = 0;
    this.bombCapacity = 2;
    this.fireTimer = 0;
    this.invulnerableTimer = 0;
    this.reset();
  }

  reset() {
    this.x = this.game.width / 2;
    this.y = this.game.height - 96;
    this.velocityX = 0;
    this.velocityY = 0;
    this.fireTimer = 0;
    this.health = this.maxHealth;
    this.spreadLevel = 0;
    this.spreadTimer = 0;
    this.speedBoostTimer = 0;
    this.shieldTimer = 0;
    this.updateDerivedStats();
  }

  update(dt, input) {
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer = Math.max(0, this.speedBoostTimer - dt);
      if (this.speedBoostTimer === 0) {
        this.updateDerivedStats();
      }
    }

    if (this.spreadTimer > 0) {
      this.spreadTimer = Math.max(0, this.spreadTimer - dt);
      if (this.spreadTimer === 0) {
        this.spreadLevel = 0;
        this.updateDerivedStats();
      }
    }

    if (this.shieldTimer > 0) {
      this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    }

    const keyboardMove = input.getMovementVector();
    let moveX = keyboardMove.x;
    let moveY = keyboardMove.y;

    if (input.pointer.active) {
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
      this.fireTimer -= dt;
    }

    const fired = [];
    if (input.isFiring() && this.fireTimer <= 0) {
      this.fireTimer = this.fireCooldown;
      const bulletSpeed = -620 - this.spreadLevel * 40;
      const patterns = [{ angle: 0, offsetX: 0, offsetY: -this.radius - 4 }];
      if (this.spreadLevel >= 1) {
        patterns.push({ angle: -0.16, offsetX: -12, offsetY: -this.radius + 4 });
        patterns.push({ angle: 0.16, offsetX: 12, offsetY: -this.radius + 4 });
      }
      if (this.spreadLevel >= 2) {
        patterns.push({ angle: -0.32, offsetX: -18, offsetY: -this.radius + 12 });
        patterns.push({ angle: 0.32, offsetX: 18, offsetY: -this.radius + 12 });
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
        });
      }
      this.game.audio.playShot();
    }

    return fired;
  }

  updateDerivedStats() {
    this.speed = this.baseSpeed + (this.speedBoostTimer > 0 ? 90 : 0);
    this.fireCooldown = this.baseFireCooldown * (this.speedBoostTimer > 0 ? 0.72 : 1);
    if (this.spreadLevel > 0) {
      this.fireCooldown *= 0.9;
    }
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
        this.spreadLevel = Math.min(2, this.spreadLevel + 1);
        this.spreadTimer = 12;
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

  get isInvulnerable() {
    return this.invulnerableTimer > 0 || this.shieldTimer > 0;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const scale = this.radius / 16.5;

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
    bodyGradient.addColorStop(0, "#ffffff");
    bodyGradient.addColorStop(0.4, "#ffeaea");
    bodyGradient.addColorStop(0.7, "#d51928");
    bodyGradient.addColorStop(1, "#6c0b17");
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
    wingGradient.addColorStop(0, "#f6f6f8");
    wingGradient.addColorStop(0.6, "#b60e1b");
    wingGradient.addColorStop(1, "#420208");
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
    canopy.addColorStop(0, "rgba(180, 220, 255, 0.95)");
    canopy.addColorStop(0.5, "rgba(70, 140, 220, 0.85)");
    canopy.addColorStop(1, "rgba(20, 40, 80, 0.9)");
    ctx.fillStyle = canopy;
    ctx.beginPath();
    ctx.ellipse(0, -4 * scale, 16 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.ellipse(-4 * scale, -8 * scale, 6 * scale, 8 * scale, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    const engineGlow = ctx.createRadialGradient(0, 32 * scale, 2 * scale, 0, 32 * scale, 18 * scale);
    engineGlow.addColorStop(0, "rgba(255, 180, 120, 0.9)");
    engineGlow.addColorStop(0.6, "rgba(255, 120, 40, 0.35)");
    engineGlow.addColorStop(1, "rgba(255, 80, 0, 0)");
    ctx.fillStyle = engineGlow;
    ctx.beginPath();
    ctx.ellipse(0, 32 * scale, 18 * scale, 12 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

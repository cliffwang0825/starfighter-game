import { clamp, randChoice, randRange } from "../utils.js";

const COLORS = ["#ff6b6b", "#ffd166", "#ff9f1c", "#ff66c4"];

export class Enemy {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.radius = config.radius ?? 18;
    this.speedY = config.speedY ?? 90;
    this.amplitude = config.amplitude ?? 0;
    this.frequency = config.frequency ?? 0;
    this.health = config.health ?? 3;
    this.fireCooldown = config.fireCooldown ?? 1.8;
    this.fireTimer = randRange(0.2, this.fireCooldown);
    this.color = randChoice(COLORS);
    this.age = 0;
    this.scoreValue = config.scoreValue ?? 150;
    this.bounds = config.bounds;
  }

  update(dt) {
    this.age += dt;
    this.y += this.speedY * dt;
    if (this.amplitude > 0) {
      const offset = Math.sin(this.age * this.frequency) * this.amplitude;
      this.x = clamp(this.x + offset * dt * 6, this.radius, this.bounds.width - this.radius);
    }

    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = this.fireCooldown;
      return {
        x: this.x,
        y: this.y + this.radius,
        velocityY: 220,
        radius: 5,
        friendly: false,
      };
    }
    return null;
  }

  takeHit(damage = 1) {
    this.health -= damage;
    return this.health <= 0;
  }

  isOffscreen(height) {
    return this.y - this.radius > height;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(0, this.radius + 2);
    ctx.lineTo(this.radius, -this.radius * 0.4);
    ctx.lineTo(0, -this.radius - 6);
    ctx.lineTo(-this.radius, -this.radius * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.beginPath();
    ctx.arc(0, -this.radius * 0.2, this.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

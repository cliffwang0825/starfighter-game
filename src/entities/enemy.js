import { clamp, randChoice, randRange } from "../utils.js";

const FUSELAGE_COLORS = [
  { hull: "#1a2330", trim: "#2b7abf", glow: "#5bc0ff" },
  { hull: "#0c111a", trim: "#3f8dd6", glow: "#7cd0ff" },
  { hull: "#101823", trim: "#1f6ca8", glow: "#66b0ff" },
  { hull: "#080c12", trim: "#2e5e98", glow: "#6fbaff" },
];

export class Enemy {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.radius = config.radius ?? 15;
    this.speedY = config.speedY ?? 110;
    this.amplitude = config.amplitude ?? 0;
    this.frequency = config.frequency ?? 0;
    this.health = config.health ?? 3;
    this.fireCooldown = config.fireCooldown ?? 1.6;
    this.burst = config.burst ?? 1;
    this.burstSpread = config.burstSpread ?? 0.2;
    this.fireTimer = randRange(0.2, this.fireCooldown);
    this.color = randChoice(FUSELAGE_COLORS);
    this.age = 0;
    this.scoreValue = config.scoreValue ?? 150;
    this.bounds = config.bounds;
    this.dropType = config.dropType ?? null;
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
      const volley = [];
      const spreadCount = Math.max(1, this.burst);
      for (let i = 0; i < spreadCount; i += 1) {
        const lerpFactor = spreadCount === 1 ? 0 : i / (spreadCount - 1);
        const angle = (lerpFactor - 0.5) * this.burstSpread * Math.PI;
        volley.push({
          x: this.x,
          y: this.y + this.radius,
          velocityY: 220 * Math.cos(angle),
          velocityX: 160 * Math.sin(angle),
          radius: 5,
          friendly: false,
          damage: 1,
        });
      }
      return volley;
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
    const scale = this.radius / 15;

    const hullGradient = ctx.createLinearGradient(0, -36 * scale, 0, 30 * scale);
    hullGradient.addColorStop(0, "#1b2635");
    hullGradient.addColorStop(0.45, this.color.trim);
    hullGradient.addColorStop(0.8, this.color.hull);
    ctx.fillStyle = hullGradient;
    ctx.beginPath();
    ctx.moveTo(0, -38 * scale);
    ctx.bezierCurveTo(20 * scale, -30 * scale, 26 * scale, 12 * scale, 14 * scale, 32 * scale);
    ctx.lineTo(0, 26 * scale);
    ctx.lineTo(-14 * scale, 32 * scale);
    ctx.bezierCurveTo(-26 * scale, 12 * scale, -20 * scale, -30 * scale, 0, -38 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.color.hull;
    ctx.beginPath();
    ctx.moveTo(-28 * scale, -6 * scale);
    ctx.lineTo(-10 * scale, 10 * scale);
    ctx.lineTo(-18 * scale, 36 * scale);
    ctx.lineTo(-40 * scale, 20 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(28 * scale, -6 * scale);
    ctx.lineTo(10 * scale, 10 * scale);
    ctx.lineTo(18 * scale, 36 * scale);
    ctx.lineTo(40 * scale, 20 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.color.trim;
    ctx.beginPath();
    ctx.moveTo(-16 * scale, -24 * scale);
    ctx.lineTo(-4 * scale, -4 * scale);
    ctx.lineTo(-14 * scale, 18 * scale);
    ctx.lineTo(-30 * scale, 0);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(16 * scale, -24 * scale);
    ctx.lineTo(4 * scale, -4 * scale);
    ctx.lineTo(14 * scale, 18 * scale);
    ctx.lineTo(30 * scale, 0);
    ctx.closePath();
    ctx.fill();

    const visor = ctx.createLinearGradient(0, -12 * scale, 0, 6 * scale);
    visor.addColorStop(0, "rgba(120, 200, 255, 0.85)");
    visor.addColorStop(1, "rgba(10, 30, 50, 0.9)");
    ctx.fillStyle = visor;
    ctx.beginPath();
    ctx.ellipse(0, -2 * scale, 14 * scale, 12 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    const glow = ctx.createRadialGradient(0, 30 * scale, 2 * scale, 0, 30 * scale, 18 * scale);
    glow.addColorStop(0, this.color.glow);
    glow.addColorStop(0.6, "rgba(90, 180, 255, 0.3)");
    glow.addColorStop(1, "rgba(90, 180, 255, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, 30 * scale, 16 * scale, 12 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class BombWave {
  constructor(x, y, radius, color = "#9fd6ff") {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.life = 0.65;
    this.elapsed = 0;
  }

  update(dt) {
    this.elapsed += dt;
    return this.elapsed < this.life;
  }

  render(ctx) {
    const progress = Math.min(1, this.elapsed / this.life);
    const outerRadius = this.radius * (0.2 + progress * 0.85);
    const innerRadius = outerRadius * (0.45 + progress * 0.25);
    const haloOpacity = 0.6 * (1 - progress * 0.75);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalCompositeOperation = "lighter";

    ctx.globalAlpha = haloOpacity;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = Math.max(0, haloOpacity - 0.15);
    ctx.lineWidth = Math.max(outerRadius * 0.08, 12);
    ctx.strokeStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    ctx.stroke();

    const gradient = ctx.createRadialGradient(0, 0, innerRadius, 0, 0, outerRadius * 1.15);
    gradient.addColorStop(0, `${this.color}11`);
    gradient.addColorStop(0.45, `${this.color}05`);
    gradient.addColorStop(1, `${this.color}00`);
    ctx.globalAlpha = 1;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

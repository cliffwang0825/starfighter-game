export class Explosion {
  constructor(x, y, color = "#ffd166", radius = 26, life = 0.45) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.life = life;
    this.elapsed = 0;
    this.baseRadius = radius;
  }

  update(dt) {
    this.elapsed += dt;
    return this.elapsed < this.life;
  }

  render(ctx) {
    const progress = Math.min(1, this.elapsed / this.life);
    const radius = 12 + progress * this.baseRadius;
    const opacity = 1 - progress;
    const gradient = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.9 * opacity})`);
    gradient.addColorStop(0.4, `${this.color}${Math.floor(opacity * 160)
      .toString(16)
      .padStart(2, "0")}`);
    gradient.addColorStop(1, `${this.color}00`);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

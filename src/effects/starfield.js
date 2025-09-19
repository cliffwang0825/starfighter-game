import { randRange } from "../utils.js";

export class Starfield {
  constructor(game, density = 120) {
    this.game = game;
    this.density = density;
    this.stars = [];
    this.speed = 120;
    this._populate();
  }

  _populate() {
    const area = (this.game.width * this.game.height) / 10000;
    const targetCount = Math.max(this.density, area * this.density * 0.4);
    this.stars = [];
    for (let i = 0; i < targetCount; i += 1) {
      this.stars.push(this._makeStar(Math.random() * this.game.width, Math.random() * this.game.height));
    }
  }

  _makeStar(x, y) {
    return {
      x,
      y,
      size: randRange(1, 3.5),
      speedMultiplier: randRange(0.4, 1.2),
      twinkleOffset: randRange(0, Math.PI * 2),
    };
  }

  onResize() {
    this._populate();
  }

  update(dt) {
    for (const star of this.stars) {
      star.y += this.speed * star.speedMultiplier * dt;
      if (star.y > this.game.height) {
        star.x = Math.random() * this.game.width;
        star.y = -star.size;
      }
    }
  }

  render(ctx, time) {
    ctx.save();
    ctx.fillStyle = "rgba(8, 14, 28, 0.8)";
    ctx.fillRect(0, 0, this.game.width, this.game.height);

    for (const star of this.stars) {
      const twinkle = Math.sin(time * 0.0018 + star.twinkleOffset) * 0.25 + 0.75;
      ctx.fillStyle = `rgba(150, 200, 255, ${twinkle})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

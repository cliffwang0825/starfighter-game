import { clamp, lerp } from "../utils.js";

export class Player {
  constructor(game) {
    this.game = game;
    this.radius = 18;
    this.reset();
    this.fireCooldown = 0.12;
    this.fireTimer = 0;
    this.invulnerableTimer = 0;
    this.moveSmoothing = 0.25;
    this.speed = 320;
  }

  reset() {
    this.x = this.game.width / 2;
    this.y = this.game.height - 96;
    this.velocityX = 0;
    this.velocityY = 0;
  }

  update(dt, input) {
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
      fired.push({
        x: this.x,
        y: this.y - this.radius,
        velocityY: -560,
        radius: 4,
        friendly: true,
      });
      fired.push({
        x: this.x - 10,
        y: this.y - this.radius + 6,
        velocityY: -560,
        radius: 4,
        friendly: true,
      });
      fired.push({
        x: this.x + 10,
        y: this.y - this.radius + 6,
        velocityY: -560,
        radius: 4,
        friendly: true,
      });
    }

    return fired;
  }

  takeHit() {
    this.invulnerableTimer = 2;
  }

  get isInvulnerable() {
    return this.invulnerableTimer > 0;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowColor = "rgba(90, 209, 255, 0.6)";
    ctx.shadowBlur = 15;
    ctx.fillStyle = this.isInvulnerable ? "rgba(130, 215, 255, 0.6)" : "#5ad1ff";
    ctx.beginPath();
    ctx.moveTo(0, -this.radius - 4);
    ctx.lineTo(this.radius * 0.8, this.radius);
    ctx.lineTo(0, this.radius * 0.4);
    ctx.lineTo(-this.radius * 0.8, this.radius);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(90, 209, 255, 0.4)";
    ctx.beginPath();
    ctx.ellipse(0, this.radius * 0.6, this.radius * 0.9, this.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

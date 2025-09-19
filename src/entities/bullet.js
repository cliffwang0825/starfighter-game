export function updateBullets(bullets, dt, height) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.y += bullet.velocityY * dt;
    if (bullet.y + bullet.radius < -64 || bullet.y - bullet.radius > height + 64) {
      bullets.splice(i, 1);
    }
  }
}

export function renderBullets(ctx, bullets) {
  for (const bullet of bullets) {
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.fillStyle = bullet.friendly ? "#8ef0ff" : "#ffa6a6";
    ctx.beginPath();
    ctx.ellipse(0, 0, bullet.radius * 0.8, bullet.radius * 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

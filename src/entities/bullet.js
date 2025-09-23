export function updateBullets(bullets, dt, height, options = {}) {
  const { width = null } = options;
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.x += (bullet.velocityX ?? 0) * dt;
    bullet.y += bullet.velocityY * dt;
    const offscreenVertically = bullet.y + bullet.radius < -64 || bullet.y - bullet.radius > height + 64;
    const offscreenHorizontally =
      width == null ? false : bullet.x + bullet.radius < -64 || bullet.x - bullet.radius > width + 64;
    if (offscreenVertically || offscreenHorizontally) {
      bullets.splice(i, 1);
    }
  }
}

export function renderBullets(ctx, bullets) {
  for (const bullet of bullets) {
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    const vx = bullet.velocityX ?? 0;
    const vy = bullet.velocityY ?? -1;
    const angle = Math.atan2(-vy, vx);
    ctx.rotate(isNaN(angle) ? 0 : angle + Math.PI / 2);
    const isLaser = bullet.type === "laser";
    const length = bullet.radius * (isLaser ? 3.6 : 2.2);
    const gradient = ctx.createLinearGradient(0, -length, 0, length);
    if (bullet.friendly) {
      if (isLaser) {
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(0.3, "#d4f3ff");
        gradient.addColorStop(0.7, "#64e1ff");
        gradient.addColorStop(1, "#1aa3ff");
      } else {
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(0.4, "#8ef0ff");
        gradient.addColorStop(1, "#1cb3ff");
      }
    } else {
      gradient.addColorStop(0, "#ffded9");
      gradient.addColorStop(0.6, "#ff7b7b");
      gradient.addColorStop(1, "#ff3b3b");
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    const width = bullet.radius * (isLaser ? 0.55 : 0.8);
    ctx.ellipse(0, 0, width, length, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

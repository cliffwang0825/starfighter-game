export function updateBullets(bullets, dt, height) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.x += (bullet.velocityX ?? 0) * dt;
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
    const angle = Math.atan2(-(bullet.velocityY ?? 0), bullet.velocityX ?? 0);
    ctx.rotate(isNaN(angle) ? 0 : angle + Math.PI / 2);
    const laser = bullet.type === "laser";
    const length = bullet.radius * (laser ? 3.6 : 2.2);
    const gradient = ctx.createLinearGradient(0, -length, 0, length);
    if (bullet.friendly) {
      if (laser) {
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
    const width = bullet.radius * (laser ? 0.55 : 0.8);
    ctx.ellipse(0, 0, width, length, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

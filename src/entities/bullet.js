export function updateBullets(bullets, dt, height, options = {}) {
  const { width = null, seekingTargets = null, boss = null } = options;
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    if (bullet.homing) {
      applyHomingSteer(bullet, dt, seekingTargets, boss);
    }
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

function applyHomingSteer(bullet, dt, seekingTargets, boss) {
  const potentialTargets = [];
  if (Array.isArray(seekingTargets)) {
    for (const target of seekingTargets) {
      if (!target || target.health <= 0) continue;
      potentialTargets.push(target);
    }
  }
  if (boss && !boss.isDefeated) {
    potentialTargets.push(boss);
  }
  if (potentialTargets.length === 0) {
    return;
  }
  let closest = null;
  let closestDist = Infinity;
  for (const target of potentialTargets) {
    const dx = target.x - bullet.x;
    const dy = target.y - bullet.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < closestDist) {
      closest = target;
      closestDist = distSq;
    }
  }
  if (!closest) return;

  const desiredAngle = Math.atan2(closest.y - bullet.y, closest.x - bullet.x);
  const vx = bullet.velocityX ?? 0;
  const vy = bullet.velocityY ?? -1;
  const currentAngle = Math.atan2(vy, vx === 0 && vy === 0 ? 1 : vx);
  let angleDiff = normalizeAngle(desiredAngle - currentAngle);
  const turnRate = bullet.homing.turnRate ?? 4;
  const maxTurn = turnRate * dt;
  angleDiff = clamp(angleDiff, -maxTurn, maxTurn);
  const newAngle = currentAngle + angleDiff;
  const speed = bullet.homing.speed ?? Math.hypot(bullet.velocityX, bullet.velocityY) || 420;
  bullet.velocityX = Math.cos(newAngle) * speed;
  bullet.velocityY = Math.sin(newAngle) * speed;
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

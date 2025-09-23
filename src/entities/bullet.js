import { distanceSquared, lerp } from "../utils.js";

export function updateBullets(bullets, dt, height, options = {}) {
  const { width = null, seekingTargets = null, boss = null } = options;
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    if (bullet.seeksEnemies && (seekingTargets?.length || boss)) {
      const target = findSeekingTarget(bullet, seekingTargets, boss);
      if (target) {
        const maxSpeed = bullet.maxSpeed ?? Math.hypot(bullet.velocityX ?? 0, bullet.velocityY ?? 0) || 480;
        const desiredX = target.x - bullet.x;
        const desiredY = target.y - bullet.y;
        const desiredLength = Math.hypot(desiredX, desiredY) || 1;
        const desiredVX = (desiredX / desiredLength) * maxSpeed;
        const desiredVY = (desiredY / desiredLength) * maxSpeed;
        const steering = Math.min(1, (bullet.seekStrength ?? 4) * dt);
        const currentVX = bullet.velocityX ?? 0;
        const currentVY = bullet.velocityY ?? -maxSpeed;
        bullet.velocityX = lerp(currentVX, desiredVX, steering);
        bullet.velocityY = lerp(currentVY, desiredVY, steering);
        const speed = Math.hypot(bullet.velocityX, bullet.velocityY) || 1;
        if (speed > maxSpeed) {
          bullet.velocityX = (bullet.velocityX / speed) * maxSpeed;
          bullet.velocityY = (bullet.velocityY / speed) * maxSpeed;
        }
      }
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
    const isMissile = bullet.type === "missile";
    if (isMissile) {
      const scale = Math.max(1, bullet.radius / 6);
      const bodyGradient = ctx.createLinearGradient(0, -14 * scale, 0, 12 * scale);
      bodyGradient.addColorStop(0, "#ffffff");
      bodyGradient.addColorStop(1, bullet.trailColor ?? "#9fd6ff");
      ctx.fillStyle = bodyGradient;
      ctx.strokeStyle = (bullet.trailColor ?? "#9fd6ff") + "cc";
      ctx.lineWidth = 1.6 * scale;
      ctx.beginPath();
      ctx.moveTo(0, -16 * scale);
      ctx.lineTo(6 * scale, 4 * scale);
      ctx.lineTo(0, 12 * scale);
      ctx.lineTo(-6 * scale, 4 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = bullet.trailColor ?? "#9fd6ff";
      ctx.beginPath();
      ctx.moveTo(0, 12 * scale);
      ctx.quadraticCurveTo(4 * scale, 18 * scale, 0, 24 * scale);
      ctx.quadraticCurveTo(-4 * scale, 18 * scale, 0, 12 * scale);
      ctx.fill();
    } else {
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
    }
    ctx.restore();
  }
}

function findSeekingTarget(bullet, enemies, boss) {
  let closest = null;
  let closestDist = Infinity;
  if (Array.isArray(enemies)) {
    for (const enemy of enemies) {
      if (!enemy || enemy.health <= 0) continue;
      const dist = distanceSquared(bullet.x, bullet.y, enemy.x, enemy.y);
      if (dist < closestDist) {
        closestDist = dist;
        closest = enemy;
      }
    }
  }
  if (boss && !boss.isDefeated) {
    const dist = distanceSquared(bullet.x, bullet.y, boss.x, boss.y);
    if (dist < closestDist) {
      closest = boss;
    }
  }
  return closest;
}

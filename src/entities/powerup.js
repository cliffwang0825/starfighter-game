import { clamp } from "../utils.js";

const PALETTE = {
  bomb: { base: "#ffcf5a", glow: "#ffe6a1", stroke: "#b88928", detail: "#fff3c8" },
  speed: { base: "#4fe3c1", glow: "#9fffe6", stroke: "#1e7f6a", detail: "#e0fff5" },
  spread: { base: "#ff7bd5", glow: "#ffc5f2", stroke: "#a2478e", detail: "#ffe8f8" },
  laser: { base: "#9f87ff", glow: "#e3dcff", stroke: "#4d3ab3", detail: "#f3f0ff" },
  shield: { base: "#6fb3ff", glow: "#c9e4ff", stroke: "#2d6cb2", detail: "#eff7ff" },
  health: { base: "#ff6d7a", glow: "#ffb6bf", stroke: "#9e2a34", detail: "#ffe5e8" },
};

export class PowerUp {
  constructor({ x, y, type }) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 18;
    this.speedY = 70;
    this.bobTimer = 0;
  }

  update(dt, height) {
    this.bobTimer += dt;
    this.y += this.speedY * dt;
    return this.y - this.radius <= height + 40;
  }

  render(ctx) {
    const palette = PALETTE[this.type];
    ctx.save();
    ctx.translate(this.x, this.y + Math.sin(this.bobTimer * 3) * 6);
    const gradient = ctx.createRadialGradient(0, 0, 4, 0, 0, this.radius);
    gradient.addColorStop(0, palette.glow);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
    ctx.fill();

    const shieldGradient = ctx.createLinearGradient(0, -this.radius, 0, this.radius);
    shieldGradient.addColorStop(0, clampColor(palette.base, 1.2));
    shieldGradient.addColorStop(1, palette.base);
    ctx.fillStyle = shieldGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius, this.radius * 0.84, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * 0.92, this.radius * 0.78, 0, 0, Math.PI * 2);
    ctx.stroke();

    drawPowerupIcon(ctx, this.type, palette);

    ctx.restore();
  }
}

function clampColor(hex, factor) {
  const value = parseInt(hex.slice(1), 16);
  let r = (value >> 16) & 0xff;
  let g = (value >> 8) & 0xff;
  let b = value & 0xff;
  r = clamp(Math.floor(r * factor), 0, 255);
  g = clamp(Math.floor(g * factor), 0, 255);
  b = clamp(Math.floor(b * factor), 0, 255);
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function drawPowerupIcon(ctx, type, palette) {
  switch (type) {
    case "bomb":
      drawBombIcon(ctx, palette);
      break;
    case "speed":
      drawSpeedIcon(ctx, palette);
      break;
    case "spread":
      drawSpreadIcon(ctx, palette);
      break;
    case "laser":
      drawLaserIcon(ctx, palette);
      break;
    case "health":
      drawHealthIcon(ctx, palette);
      break;
    case "shield":
    default:
      drawShieldIcon(ctx, palette);
      break;
  }
}

function drawBombIcon(ctx, palette) {
  ctx.save();
  ctx.strokeStyle = palette.stroke;
  ctx.lineWidth = 2;
  ctx.fillStyle = palette.base;
  ctx.beginPath();
  const spikes = 7;
  const outer = 12;
  const inner = 5;
  for (let i = 0; i < spikes * 2; i += 1) {
    const angle = (Math.PI / spikes) * i;
    const radius = i % 2 === 0 ? outer : inner;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = palette.detail;
  ctx.font = "700 14px 'Inter', 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("B", 0, 0);
  ctx.restore();
}

function drawSpeedIcon(ctx, palette) {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.stroke;
  const noseWidth = 12;
  const noseHeight = 16;
  for (let i = -1; i <= 1; i += 1) {
    ctx.save();
    ctx.translate(i * 6, 2 - Math.abs(i) * 2);
    ctx.fillStyle = palette.base;
    ctx.beginPath();
    ctx.moveTo(0, -noseHeight / 2);
    ctx.lineTo(noseWidth / 2, noseHeight / 2);
    ctx.lineTo(-noseWidth / 2, noseHeight / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = palette.detail;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(0, 6, 10, 5, 0, 0, Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawSpreadIcon(ctx, palette) {
  ctx.save();
  ctx.strokeStyle = palette.stroke;
  ctx.fillStyle = palette.base;
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 6, 10);
    ctx.lineTo(i * 12 - 3, -8);
    ctx.quadraticCurveTo(i * 6, -14, i * 12 + 3, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = palette.detail;
  ctx.font = "700 14px 'Inter', 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("S", 0, 2);
  ctx.restore();
}

function drawLaserIcon(ctx, palette) {
  ctx.save();
  const gradient = ctx.createLinearGradient(-14, 0, 14, 0);
  gradient.addColorStop(0, palette.detail);
  gradient.addColorStop(0.5, palette.base);
  gradient.addColorStop(1, palette.detail);
  ctx.fillStyle = gradient;
  drawRoundedRectPath(ctx, -14, -4, 28, 8, 4);
  ctx.fill();
  ctx.strokeStyle = palette.stroke;
  ctx.lineWidth = 2.2;
  drawRoundedRectPath(ctx, -16, -6, 32, 12, 6);
  ctx.stroke();
  ctx.fillStyle = palette.detail;
  ctx.font = "700 14px 'Inter', 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("L", 0, 0);
  ctx.restore();
}

function drawHealthIcon(ctx, palette) {
  ctx.save();
  ctx.fillStyle = palette.base;
  ctx.strokeStyle = palette.stroke;
  ctx.lineWidth = 2;
  drawRoundedRectPath(ctx, -5, -12, 10, 24, 3);
  ctx.fill();
  ctx.stroke();
  drawRoundedRectPath(ctx, -12, -5, 24, 10, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = palette.detail;
  ctx.font = "700 13px 'Inter', 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("H", 0, 0);
  ctx.restore();
}

function drawShieldIcon(ctx, palette) {
  ctx.save();
  ctx.fillStyle = palette.base;
  ctx.strokeStyle = palette.stroke;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.quadraticCurveTo(10, -9, 9, -2);
  ctx.quadraticCurveTo(0, 12, 0, 12);
  ctx.lineTo(-9, -2);
  ctx.quadraticCurveTo(-10, -9, 0, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = palette.detail;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.quadraticCurveTo(6, -6, 5.5, -1);
  ctx.quadraticCurveTo(0, 6, 0, 6);
  ctx.quadraticCurveTo(-5.5, -1, -6, -6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawRoundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

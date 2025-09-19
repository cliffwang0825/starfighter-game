import { clamp } from "../utils.js";

const PALETTE = {
  bomb: { base: "#ffcf5a", glow: "#ffe6a1", label: "B" },
  speed: { base: "#4fe3c1", glow: "#9fffe6", label: "S" },
  spread: { base: "#ff7bd5", glow: "#ffc5f2", label: "SP" },
  laser: { base: "#9f87ff", glow: "#e3dcff", label: "L" },
  shield: { base: "#6fb3ff", glow: "#c9e4ff", label: "H" },
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
    ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * 0.92, this.radius * 0.78, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    const fontSize = palette.label.length > 1 ? this.radius * 0.7 : this.radius * 0.95;
    ctx.font = `600 ${fontSize}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(palette.label, 0, 1);

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

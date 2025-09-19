import { clamp, randChoice, randRange } from "../utils.js";
import { Enemy } from "./enemy.js";

const BOSS_TYPES = [
  {
    id: "vanguard",
    health: 120,
    radius: 66,
    palette: {
      hull: "#0d141e",
      trim: "#2f74c8",
      accent: "#58b0ff",
      glow: "#93d8ff",
    },
    behaviour: (boss, dt, player) => {
      boss.waveTimer = (boss.waveTimer || 0) + dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.sweepTimer = (boss.sweepTimer || 0) + dt;
      boss.x = clamp(
        boss.x + Math.sin(boss.sweepTimer * 0.6) * 80 * dt,
        boss.radius,
        boss.game.width - boss.radius,
      );
      const bullets = [];
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(1.8, boss);
        const baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
        const volleyCount = scaledCount(3, boss);
        const offset = -(volleyCount - 1) / 2;
        for (let i = 0; i < volleyCount; i += 1) {
          const angle = baseAngle + (offset + i) * 0.2;
          bullets.push(makeBossBullet(boss, angle, 260, 8));
        }
      }
      if (boss.waveTimer >= scaledInterval(4.5, boss)) {
        boss.waveTimer = 0;
        const waveCount = scaledCount(5, boss);
        const offset = -(waveCount - 1) / 2;
        for (let i = 0; i < waveCount; i += 1) {
          const angle = Math.PI / 2 + (offset + i) * 0.18;
          bullets.push(makeBossBullet(boss, angle, 220, 6));
        }
      }
      return { bullets, spawns: [] };
    },
    render: renderVanguard,
  },
  {
    id: "hangar",
    health: 160,
    radius: 78,
    palette: {
      hull: "#090b12",
      trim: "#1d3a5f",
      accent: "#4fa8ff",
      glow: "#72d6ff",
    },
    behaviour: (boss, dt, player) => {
      boss.sweepTimer = (boss.sweepTimer || 0) + dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.spawnTimer = (boss.spawnTimer || 0) - dt;
      boss.x = clamp(
        boss.x + Math.sin(boss.sweepTimer * 0.45) * 120 * dt,
        boss.radius,
        boss.game.width - boss.radius,
      );
      const bullets = [];
      const spawns = [];
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(1.2, boss);
        const arcs = Math.max(3, scaledCount(6, boss));
        for (let i = 0; i < arcs; i += 1) {
          const angle = Math.PI / 2 + (i / (arcs - 1) - 0.5) * 0.9;
          bullets.push(makeBossBullet(boss, angle, 300, 7));
        }
      }
      boss.secondaryTimer = (boss.secondaryTimer || 0) - dt;
      if (boss.secondaryTimer <= 0) {
        boss.secondaryTimer = scaledInterval(2.4, boss);
        const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
        bullets.push(makeBossBeam(boss, angle));
      }
      if (boss.spawnTimer <= 0) {
        boss.spawnTimer = scaledInterval(6 + randRange(0, 2), boss);
        spawns.push(
          makeMinion(boss, {
            x: boss.x - 60,
            y: boss.y + 30,
            amplitude: 24,
            frequency: 2.5,
            fireCooldown: 1.4,
            health: 4,
            speedY: 140,
            scoreValue: 250,
            dropType: randChoice(["speed", "spread"]),
          }),
        );
        spawns.push(
          makeMinion(boss, {
            x: boss.x + 60,
            y: boss.y + 30,
            amplitude: 24,
            frequency: 2.5,
            fireCooldown: 1.4,
            health: 4,
            speedY: 140,
            scoreValue: 250,
            dropType: randChoice(["bomb", "shield", "laser"]),
          }),
        );
      }
      return { bullets, spawns };
    },
    render: renderCarrier,
  },
  {
    id: "sentinel",
    health: 220,
    radius: 90,
    palette: {
      hull: "#05070c",
      trim: "#1a2840",
      accent: "#3f7ce0",
      glow: "#8bd0ff",
    },
    behaviour: (boss, dt, player) => {
      boss.sweepTimer = (boss.sweepTimer || 0) + dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.secondaryTimer = (boss.secondaryTimer || 0) - dt;
      boss.spawnTimer = (boss.spawnTimer || 0) - dt;
      boss.x = clamp(
        boss.x + Math.sin(boss.sweepTimer * 0.35) * 140 * dt + Math.cos(boss.sweepTimer * 0.8) * 60 * dt,
        boss.radius,
        boss.game.width - boss.radius,
      );
      const bullets = [];
      const spawns = [];
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(0.8, boss);
        const rings = Math.max(6, scaledCount(10, boss));
        for (let i = 0; i < rings; i += 1) {
          const angle = (i / rings) * Math.PI * 2;
          bullets.push(makeBossBullet(boss, angle, 260 + randRange(-20, 20), 8));
        }
      }
      if (boss.secondaryTimer <= 0) {
        boss.secondaryTimer = scaledInterval(3.2, boss);
        const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
        const spreadCount = Math.max(1, scaledCount(5, boss));
        const offset = -(spreadCount - 1) / 2;
        for (let i = 0; i < spreadCount; i += 1) {
          bullets.push(makeBossBullet(boss, angle + (offset + i) * 0.08, 320, 7));
        }
      }
      if (boss.spawnTimer <= 0) {
        boss.spawnTimer = scaledInterval(7, boss);
        for (let i = -1; i <= 1; i += 2) {
          spawns.push(
            makeMinion(boss, {
              x: boss.x + i * 90,
              y: boss.y + 50,
              amplitude: 30,
              frequency: 2.8,
              fireCooldown: 1.1,
              health: 5,
              speedY: 120,
              scoreValue: 320,
              dropType: randChoice(["bomb", "speed", "spread", "shield", "laser"]),
            }),
          );
        }
      }
      return { bullets, spawns };
    },
    render: renderSentinel,
  },
];

const BOSS_COLOR_VARIANTS = [
  { hull: "#361218", trim: "#ff5a63", accent: "#ffb3a2", glow: "#ffd4c6" },
  { hull: "#d9dde4", trim: "#f7f8fb", accent: "#ffffff", glow: "#f0f4ff" },
  { hull: "#2d153f", trim: "#8e6dff", accent: "#d9baff", glow: "#f6e7ff" },
  { hull: "#0d141e", trim: "#2f74c8", accent: "#58b0ff", glow: "#93d8ff" },
  { hull: "#3b2a07", trim: "#c99a1c", accent: "#ffd96d", glow: "#ffe7ab" },
];

let bossColorIndex = 0;

export function resetBossPaletteCycle() {
  bossColorIndex = 0;
}

export class Boss {
  constructor(game, stageIndex, difficulty) {
    this.game = game;
    const definition = BOSS_TYPES[stageIndex % BOSS_TYPES.length];
    const paletteVariant = BOSS_COLOR_VARIANTS[bossColorIndex % BOSS_COLOR_VARIANTS.length];
    bossColorIndex += 1;
    this.definition = { ...definition, palette: paletteVariant };
    this.difficulty = difficulty ?? {};
    const diff = getDifficulty(this);
    this.maxHealth = Math.max(1, Math.round(this.definition.health * diff.bossHealthMultiplier));
    this.health = this.maxHealth;
    this.radius = this.definition.radius;
    this.x = game.width / 2;
    this.y = -this.radius * 1.4;
    this.targetY = game.height * 0.28;
    this.entrySpeed = 160;
    this.active = false;
    this.entryProgress = 0;
    this.time = 0;
  }

  update(dt, player) {
    this.time += dt;
    if (!this.active) {
      this.y += this.entrySpeed * dt;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.active = true;
      }
      return { bullets: [], spawns: [] };
    }
    const result = this.definition.behaviour(this, dt, player);
    for (const bullet of result.bullets) {
      bullet.friendly = false;
    }
    return result;
  }

  takeHit(damage = 1) {
    this.health = Math.max(0, this.health - damage);
    return this.health <= 0;
  }

  render(ctx) {
    this.definition.render(ctx, this);
  }

  get isDefeated() {
    return this.health <= 0;
  }
}

function makeBossBullet(boss, angle, speed, radius) {
  return {
    x: boss.x,
    y: boss.y + boss.radius * 0.4,
    velocityX: Math.cos(angle) * speed,
    velocityY: Math.sin(angle) * speed,
    radius,
    friendly: false,
    damage: 1,
  };
}

function makeBossBeam(boss, angle) {
  const speed = 420;
  return {
    x: boss.x,
    y: boss.y + boss.radius * 0.4,
    velocityX: Math.cos(angle) * speed,
    velocityY: Math.sin(angle) * speed,
    radius: 10,
    friendly: false,
    damage: 2,
  };
}

function getDifficulty(boss) {
  return {
    bossHealthMultiplier: boss.difficulty?.bossHealthMultiplier ?? 1,
    bossFireRateMultiplier: boss.difficulty?.bossFireRateMultiplier ?? 1,
    bossBulletMultiplier: boss.difficulty?.bossBulletMultiplier ?? 1,
    enemyHealthMultiplier: boss.difficulty?.enemyHealthMultiplier ?? 1,
    enemyFireRateMultiplier: boss.difficulty?.enemyFireRateMultiplier ?? 1,
    enemyExtraProjectiles: boss.difficulty?.enemyExtraProjectiles ?? 0,
  };
}

function scaledInterval(base, boss) {
  const diff = getDifficulty(boss);
  return base / diff.bossFireRateMultiplier;
}

function scaledCount(base, boss) {
  const diff = getDifficulty(boss);
  return Math.max(1, Math.round(base * diff.bossBulletMultiplier));
}

function makeMinion(boss, config) {
  const diff = getDifficulty(boss);
  const baseHealth = config.health ?? 3;
  const baseBurst = config.burst ?? 1;
  const baseCooldown = config.fireCooldown ?? 1.6;
  return new Enemy({
    ...config,
    bounds: boss.game,
    health: Math.max(1, Math.round(baseHealth * diff.enemyHealthMultiplier)),
    burst: Math.max(1, Math.round(baseBurst + diff.enemyExtraProjectiles)),
    fireCooldown: baseCooldown / diff.enemyFireRateMultiplier,
  });
}

function renderVanguard(ctx, boss) {
  renderBackdrop(ctx, boss);
  const { palette } = boss.definition;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  const scale = boss.radius / 88;

  const hullGradient = ctx.createLinearGradient(0, -120 * scale, 0, 100 * scale);
  hullGradient.addColorStop(0, "#202a3c");
  hullGradient.addColorStop(0.5, palette.trim);
  hullGradient.addColorStop(0.9, palette.hull);
  ctx.fillStyle = hullGradient;
  ctx.beginPath();
  ctx.moveTo(0, -120 * scale);
  ctx.bezierCurveTo(80 * scale, -60 * scale, 96 * scale, 40 * scale, 52 * scale, 110 * scale);
  ctx.lineTo(0, 84 * scale);
  ctx.lineTo(-52 * scale, 110 * scale);
  ctx.bezierCurveTo(-96 * scale, 40 * scale, -80 * scale, -60 * scale, 0, -120 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.hull;
  ctx.beginPath();
  ctx.moveTo(-110 * scale, -20 * scale);
  ctx.lineTo(-32 * scale, 26 * scale);
  ctx.lineTo(-60 * scale, 110 * scale);
  ctx.lineTo(-144 * scale, 50 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(110 * scale, -20 * scale);
  ctx.lineTo(32 * scale, 26 * scale);
  ctx.lineTo(60 * scale, 110 * scale);
  ctx.lineTo(144 * scale, 50 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.ellipse(0, -20 * scale, 60 * scale, 40 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.beginPath();
  ctx.ellipse(-16 * scale, -28 * scale, 18 * scale, 14 * scale, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  const glow = ctx.createRadialGradient(0, 100 * scale, 10 * scale, 0, 100 * scale, 90 * scale);
  glow.addColorStop(0, palette.glow);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 100 * scale, 100 * scale, 60 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderCarrier(ctx, boss) {
  renderBackdrop(ctx, boss);
  const { palette } = boss.definition;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  const scale = boss.radius / 104;

  const hullGradient = ctx.createLinearGradient(0, -150 * scale, 0, 120 * scale);
  hullGradient.addColorStop(0, "#161f2a");
  hullGradient.addColorStop(0.55, palette.trim);
  hullGradient.addColorStop(1, palette.hull);
  ctx.fillStyle = hullGradient;
  ctx.beginPath();
  ctx.moveTo(0, -150 * scale);
  ctx.bezierCurveTo(120 * scale, -40 * scale, 120 * scale, 100 * scale, 0, 150 * scale);
  ctx.bezierCurveTo(-120 * scale, 100 * scale, -120 * scale, -40 * scale, 0, -150 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.hull;
  ctx.beginPath();
  ctx.moveTo(-150 * scale, -10 * scale);
  ctx.lineTo(-48 * scale, 70 * scale);
  ctx.lineTo(-70 * scale, 150 * scale);
  ctx.lineTo(-190 * scale, 60 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(150 * scale, -10 * scale);
  ctx.lineTo(48 * scale, 70 * scale);
  ctx.lineTo(70 * scale, 150 * scale);
  ctx.lineTo(190 * scale, 60 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.rect(-80 * scale, -40 * scale, 160 * scale, 80 * scale);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.beginPath();
  ctx.rect(-90 * scale, -20 * scale, 180 * scale, 40 * scale);
  ctx.fill();

  const hangarGlow = ctx.createRadialGradient(0, 120 * scale, 20 * scale, 0, 120 * scale, 120 * scale);
  hangarGlow.addColorStop(0, palette.glow);
  hangarGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = hangarGlow;
  ctx.beginPath();
  ctx.ellipse(0, 120 * scale, 130 * scale, 90 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderSentinel(ctx, boss) {
  renderBackdrop(ctx, boss);
  const { palette } = boss.definition;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  const scale = boss.radius / 120;

  const hullGradient = ctx.createLinearGradient(0, -180 * scale, 0, 160 * scale);
  hullGradient.addColorStop(0, "#1b222f");
  hullGradient.addColorStop(0.45, palette.trim);
  hullGradient.addColorStop(0.8, palette.hull);
  ctx.fillStyle = hullGradient;
  ctx.beginPath();
  ctx.moveTo(0, -180 * scale);
  ctx.bezierCurveTo(110 * scale, -120 * scale, 150 * scale, 60 * scale, 120 * scale, 160 * scale);
  ctx.lineTo(0, 140 * scale);
  ctx.lineTo(-120 * scale, 160 * scale);
  ctx.bezierCurveTo(-150 * scale, 60 * scale, -110 * scale, -120 * scale, 0, -180 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.hull;
  ctx.beginPath();
  ctx.moveTo(-190 * scale, -40 * scale);
  ctx.lineTo(-80 * scale, 80 * scale);
  ctx.lineTo(-120 * scale, 180 * scale);
  ctx.lineTo(-240 * scale, 80 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(190 * scale, -40 * scale);
  ctx.lineTo(80 * scale, 80 * scale);
  ctx.lineTo(120 * scale, 180 * scale);
  ctx.lineTo(240 * scale, 80 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.ellipse(0, -40 * scale, 80 * scale, 60 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.26)";
  ctx.beginPath();
  ctx.ellipse(-24 * scale, -54 * scale, 22 * scale, 18 * scale, Math.PI / 7, 0, Math.PI * 2);
  ctx.fill();

  const thrusterGlow = ctx.createRadialGradient(0, 150 * scale, 20 * scale, 0, 150 * scale, 140 * scale);
  thrusterGlow.addColorStop(0, palette.glow);
  thrusterGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = thrusterGlow;
  ctx.beginPath();
  ctx.ellipse(0, 150 * scale, 150 * scale, 110 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderBackdrop(ctx, boss) {
  ctx.save();
  const paletteGlow = boss.definition?.palette?.glow;
  const gradient = ctx.createRadialGradient(
    boss.x,
    boss.y,
    40,
    boss.x,
    boss.y,
    boss.radius * 2.6,
  );
  gradient.addColorStop(0, paletteGlow ? hexToRgba(paletteGlow, 0.45) : "rgba(40, 80, 130, 0.45)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, boss.game.width, boss.game.height);
  ctx.restore();
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized
        .split("")
        .map((char) => char + char)
        .join("")
    : normalized;
  const intVal = parseInt(value, 16);
  const r = (intVal >> 16) & 0xff;
  const g = (intVal >> 8) & 0xff;
  const b = intVal & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

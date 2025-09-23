import { clamp, randChoice, randRange } from "../utils.js";
import { Enemy } from "./enemy.js";

const BOSS_TYPES = [
  {
    id: "vanguard",
    name: "Crimson Star Dreadnought",
    health: 120,
    radius: 66,
    behaviour: (boss, dt, target) => {
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
        const baseAngle = Math.atan2(target.y - boss.y, target.x - boss.x);
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
    name: "Ironclad Nebula Carrier",
    health: 160,
    radius: 78,
    behaviour: (boss, dt, target) => {
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
        const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
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
            dropType: randChoice(["speed", "spread", "health"]),
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
            dropType: randChoice(["bomb", "shield", "laser", "health"]),
          }),
        );
      }
      return { bullets, spawns };
    },
    render: renderCarrier,
  },
  {
    id: "sentinel",
    name: "Voidborn Sentinel Fortress",
    health: 220,
    radius: 90,
    behaviour: (boss, dt, target) => {
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
        const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
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
              dropType: randChoice(["bomb", "speed", "spread", "shield", "laser", "health"]),
            }),
          );
        }
      }
      return { bullets, spawns };
    },
    render: renderSentinel,
  },
  {
    id: "harrier",
    name: "Eclipse War Cruiser",
    health: 140,
    radius: 74,
    behaviour: (boss, dt, target) => {
      boss.sweepTimer = (boss.sweepTimer || 0) + dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.strafeTimer = (boss.strafeTimer || 0) - dt;
      boss.x = clamp(
        boss.x + Math.sin(boss.sweepTimer * 0.75) * 160 * dt,
        boss.radius,
        boss.game.width - boss.radius,
      );
      boss.y = boss.targetY + Math.sin(boss.sweepTimer * 1.4) * 12;
      const bullets = [];
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(0.85, boss);
        const baseAngle = Math.atan2(target.y - boss.y, target.x - boss.x);
        const volley = Math.max(3, scaledCount(5, boss));
        const offset = -(volley - 1) / 2;
        for (let i = 0; i < volley; i += 1) {
          bullets.push(makeBossBullet(boss, baseAngle + (offset + i) * 0.12, 320, 6));
        }
      }
      if (boss.strafeTimer <= 0) {
        boss.strafeTimer = scaledInterval(2.6, boss);
        const sideCount = Math.max(4, scaledCount(6, boss));
        for (let i = 0; i < sideCount; i += 1) {
          const angle = Math.PI / 2 + (i / (sideCount - 1) - 0.5) * 0.6;
          bullets.push(makeBossBullet(boss, angle, 260, 5));
        }
      }
      return { bullets, spawns: [] };
    },
    render: renderHarrier,
  },
  {
    id: "dreadnought",
    name: "Astral Titan Dreadnought",
    health: 260,
    radius: 96,
    behaviour: (boss, dt, target) => {
      boss.sweepTimer = (boss.sweepTimer || 0) + dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.beamTimer = (boss.beamTimer || 0) - dt;
      boss.x = clamp(
        boss.x + Math.sin(boss.sweepTimer * 0.35) * 110 * dt,
        boss.radius,
        boss.game.width - boss.radius,
      );
      const bullets = [];
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(1.35, boss);
        const arcs = Math.max(5, scaledCount(7, boss));
        for (let i = 0; i < arcs; i += 1) {
          const angle = Math.PI / 2 + (i / (arcs - 1) - 0.5) * 0.9;
          bullets.push(makeBossBullet(boss, angle, 260, 7));
        }
      }
      if (boss.beamTimer <= 0) {
        boss.beamTimer = scaledInterval(3.4, boss);
        const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
        bullets.push(makeBossBeam(boss, angle));
        bullets.push(makeBossBeam(boss, angle + 0.15));
        bullets.push(makeBossBeam(boss, angle - 0.15));
      }
      return { bullets, spawns: [] };
    },
    render: renderDreadnought,
  },
  {
    id: "maelstrom",
    name: "Galactic Maelstrom Behemoth",
    health: 200,
    radius: 88,
    behaviour: (boss, dt, target) => {
      boss.orbitTimer = (boss.orbitTimer || 0) + dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.secondaryTimer = (boss.secondaryTimer || 0) - dt;
      boss.x = clamp(
        boss.x + Math.cos(boss.orbitTimer * 0.6) * 90 * dt,
        boss.radius,
        boss.game.width - boss.radius,
      );
      boss.y = boss.targetY + Math.sin(boss.orbitTimer * 0.9) * 20;
      const bullets = [];
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(1.1, boss);
        const ring = Math.max(8, scaledCount(12, boss));
        for (let i = 0; i < ring; i += 1) {
          const angle = (i / ring) * Math.PI * 2 + boss.orbitTimer * 0.6;
          bullets.push(makeBossBullet(boss, angle, 240, 6));
        }
      }
      if (boss.secondaryTimer <= 0) {
        boss.secondaryTimer = scaledInterval(2.8, boss);
        const baseAngle = Math.atan2(target.y - boss.y, target.x - boss.x);
        const split = Math.max(2, scaledCount(4, boss));
        for (let i = 0; i < split; i += 1) {
          const offset = (i - (split - 1) / 2) * 0.12;
          bullets.push(makeBossBullet(boss, baseAngle + offset, 300, 6));
        }
      }
      return { bullets, spawns: [] };
    },
    render: renderMaelstrom,
  },
  {
    id: "paladin",
    name: "Celestial Paladin Battleship",
    health: 210,
    radius: 92,
    behaviour: (boss, dt, target) => {
      boss.swayTimer = (boss.swayTimer || 0) + dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.spawnTimer = (boss.spawnTimer || 0) - dt;
      boss.x = clamp(
        boss.x + Math.sin(boss.swayTimer * 0.5) * 100 * dt,
        boss.radius,
        boss.game.width - boss.radius,
      );
      boss.y = boss.targetY + Math.sin(boss.swayTimer * 1.2) * 14;
      const bullets = [];
      const spawns = [];
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(0.9, boss);
        const offsets = [-0.25, -0.08, 0.08, 0.25];
        for (const offset of offsets) {
          bullets.push(makeBossBullet(boss, Math.PI / 2 + offset, 320, 5));
        }
      }
      if (boss.spawnTimer <= 0) {
        boss.spawnTimer = scaledInterval(5.4, boss);
        spawns.push(
          makeMinion(boss, {
            x: boss.x - 90,
            y: boss.y + 40,
            amplitude: 28,
            frequency: 2.6,
            fireCooldown: 1.6,
            health: 5,
            speedY: 130,
            scoreValue: 280,
            dropType: randChoice(["shield", "speed", "health"]),
          }),
        );
        spawns.push(
          makeMinion(boss, {
            x: boss.x + 90,
            y: boss.y + 40,
            amplitude: 28,
            frequency: 2.6,
            fireCooldown: 1.6,
            health: 5,
            speedY: 130,
            scoreValue: 280,
            dropType: randChoice(["laser", "bomb", "health"]),
          }),
        );
      }
      return { bullets, spawns };
    },
    render: renderPaladin,
  },
  {
    id: "obliterator",
    name: "Obsidian Obliterator Flagship",
    health: 240,
    radius: 86,
    behaviour: (boss, dt, target) => {
      boss.dashTimer = (boss.dashTimer || 0) - dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.mineTimer = (boss.mineTimer || 0) - dt;
      boss.dashDirection = boss.dashDirection ?? 1;
      if (boss.dashTimer <= 0) {
        boss.dashTimer = scaledInterval(4.2, boss);
        boss.dashDirection *= -1;
      }
      boss.x = clamp(
        boss.x + boss.dashDirection * 160 * dt,
        boss.radius,
        boss.game.width - boss.radius,
      );
      const bullets = [];
      const spawns = [];
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(1.6, boss);
        const dropCount = Math.max(2, scaledCount(3, boss));
        for (let i = 0; i < dropCount; i += 1) {
          const offset = i - (dropCount - 1) / 2;
          bullets.push({
            x: boss.x + offset * 28,
            y: boss.y + boss.radius * 0.6,
            velocityX: offset * 40,
            velocityY: 210 + Math.abs(offset) * 30,
            radius: 10,
            friendly: false,
            damage: 2,
          });
        }
      }
      if (boss.mineTimer <= 0) {
        boss.mineTimer = scaledInterval(5.2, boss);
        spawns.push(
          makeMinion(boss, {
            x: boss.x,
            y: boss.y + boss.radius,
            amplitude: 0,
            frequency: 0,
            fireCooldown: 2.4,
            health: 6,
            speedY: 150,
            scoreValue: 340,
            dropType: randChoice(["bomb", "spread", "shield", "health"]),
          }),
        );
      }
      return { bullets, spawns };
    },
    render: renderObliterator,
  },
  {
    id: "mirage",
    name: "Phantom Mirage Battlecruiser",
    health: 180,
    radius: 80,
    behaviour: (boss, dt, target) => {
      boss.phaseTimer = (boss.phaseTimer || scaledInterval(4, boss)) - dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      const bullets = [];
      if (boss.phaseTimer <= 0) {
        boss.phaseTimer = scaledInterval(4, boss);
        boss.x = clamp(randRange(boss.radius, boss.game.width - boss.radius), boss.radius, boss.game.width - boss.radius);
        const ring = Math.max(6, scaledCount(8, boss));
        for (let i = 0; i < ring; i += 1) {
          const angle = (i / ring) * Math.PI * 2;
          bullets.push(makeBossBullet(boss, angle, 240, 5));
        }
      }
      boss.y = clamp(boss.y + (boss.targetY - boss.y) * dt * 2, boss.radius, boss.targetY);
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(1, boss);
        const baseAngle = Math.atan2(target.y - boss.y, target.x - boss.x);
        const fan = Math.max(4, scaledCount(6, boss));
        for (let i = 0; i < fan; i += 1) {
          const offset = (i - (fan - 1) / 2) * 0.1;
          bullets.push(makeBossBullet(boss, baseAngle + offset, 300, 5));
        }
      }
      return { bullets, spawns: [] };
    },
    render: renderMirage,
  },
  {
    id: "nova",
    name: "Aurora Nova Juggernaut",
    health: 280,
    radius: 98,
    behaviour: (boss, dt, target) => {
      boss.chargeTimer = (boss.chargeTimer || 0) + dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.x = clamp(
        boss.x + Math.sin(boss.chargeTimer * 0.3) * 90 * dt,
        boss.radius,
        boss.game.width - boss.radius,
      );
      const bullets = [];
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(1.2, boss);
        const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
        bullets.push(makeBossBeam(boss, angle));
      }
      const chargeThreshold = scaledInterval(4.5, boss);
      if (boss.chargeTimer >= chargeThreshold) {
        boss.chargeTimer = 0;
        const burst = Math.max(12, scaledCount(16, boss));
        for (let i = 0; i < burst; i += 1) {
          const angle = (i / burst) * Math.PI * 2;
          bullets.push(makeBossBullet(boss, angle, 280, 7));
        }
      }
      return { bullets, spawns: [] };
    },
    render: renderNova,
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

export const BOSS_COUNT = BOSS_TYPES.length;

export function resetBossPaletteCycle() {
  bossColorIndex = 0;
}

export class Boss {
  constructor(game, bossIndex, difficulty) {
    this.game = game;
    const definition = BOSS_TYPES[bossIndex % BOSS_TYPES.length];
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

  update(dt, players = []) {
    this.time += dt;
    if (!this.active) {
      this.y += this.entrySpeed * dt;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.active = true;
      }
      return { bullets: [], spawns: [] };
    }
    const target = selectTarget(this, players);
    const result = this.definition.behaviour(this, dt, target, players);
    const bullets = result?.bullets ?? [];
    for (const bullet of bullets) {
      bullet.friendly = false;
    }
    return { bullets, spawns: result?.spawns ?? [] };
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
  return Math.max(1, Math.round(base * diff.bossBulletMultiplier * 0.5));
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
    burst: Math.max(1, Math.round(Math.max(1, baseBurst + diff.enemyExtraProjectiles) * 0.5)),
    fireCooldown: baseCooldown / diff.enemyFireRateMultiplier,
  });
}

function selectTarget(boss, players) {
  if (!players?.length) {
    return { x: boss.game.width / 2, y: boss.game.height * 0.5 };
  }
  let best = players[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const player of players) {
    if (!player || player.isEliminated) continue;
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = player;
    }
  }
  return best ?? { x: boss.game.width / 2, y: boss.game.height * 0.5 };
}
function renderVanguard(ctx, boss) {
  renderBackdrop(ctx, boss);
  const { palette } = boss.definition;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  const scale = boss.radius / 88;

  const hullGradient = ctx.createLinearGradient(0, -120 * scale, 0, 100 * scale);
  hullGradient.addColorStop(0, palette.trim);
  hullGradient.addColorStop(0.5, palette.accent);
  hullGradient.addColorStop(1, palette.hull);
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
  hullGradient.addColorStop(0, palette.trim);
  hullGradient.addColorStop(0.55, palette.accent);
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
  hullGradient.addColorStop(0, palette.trim);
  hullGradient.addColorStop(0.45, palette.accent);
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

function renderHarrier(ctx, boss) {
  renderBackdrop(ctx, boss);
  const { palette } = boss.definition;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  const scale = boss.radius / 90;

  const hullGradient = ctx.createLinearGradient(0, -140 * scale, 0, 100 * scale);
  hullGradient.addColorStop(0, palette.accent);
  hullGradient.addColorStop(0.6, palette.trim);
  hullGradient.addColorStop(1, palette.hull);
  ctx.fillStyle = hullGradient;
  ctx.beginPath();
  ctx.moveTo(0, -140 * scale);
  ctx.lineTo(44 * scale, -40 * scale);
  ctx.lineTo(28 * scale, 92 * scale);
  ctx.lineTo(0, 78 * scale);
  ctx.lineTo(-28 * scale, 92 * scale);
  ctx.lineTo(-44 * scale, -40 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.hull;
  ctx.beginPath();
  ctx.moveTo(-110 * scale, -20 * scale);
  ctx.lineTo(-54 * scale, 24 * scale);
  ctx.lineTo(-74 * scale, 110 * scale);
  ctx.lineTo(-150 * scale, 40 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(110 * scale, -20 * scale);
  ctx.lineTo(54 * scale, 24 * scale);
  ctx.lineTo(74 * scale, 110 * scale);
  ctx.lineTo(150 * scale, 40 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.ellipse(0, -30 * scale, 40 * scale, 30 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  const engineGlow = ctx.createRadialGradient(0, 90 * scale, 8 * scale, 0, 90 * scale, 70 * scale);
  engineGlow.addColorStop(0, palette.glow);
  engineGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = engineGlow;
  ctx.beginPath();
  ctx.ellipse(0, 90 * scale, 80 * scale, 50 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderDreadnought(ctx, boss) {
  renderBackdrop(ctx, boss);
  const { palette } = boss.definition;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  const scale = boss.radius / 120;

  ctx.fillStyle = palette.hull;
  ctx.beginPath();
  ctx.rect(-110 * scale, -90 * scale, 220 * scale, 180 * scale);
  ctx.fill();

  ctx.fillStyle = palette.trim;
  ctx.beginPath();
  ctx.rect(-140 * scale, -30 * scale, 280 * scale, 60 * scale);
  ctx.fill();

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.rect(-60 * scale, -70 * scale, 120 * scale, 140 * scale);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.beginPath();
  ctx.rect(-70 * scale, -10 * scale, 140 * scale, 20 * scale);
  ctx.fill();

  const glow = ctx.createRadialGradient(0, 100 * scale, 10 * scale, 0, 100 * scale, 140 * scale);
  glow.addColorStop(0, palette.glow);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 100 * scale, 170 * scale, 120 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderMaelstrom(ctx, boss) {
  renderBackdrop(ctx, boss);
  const { palette } = boss.definition;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  const scale = boss.radius / 110;

  const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 100 * scale);
  coreGradient.addColorStop(0, palette.accent);
  coreGradient.addColorStop(1, palette.hull);
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, 100 * scale, 100 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = palette.trim;
  ctx.lineWidth = 10 * scale;
  ctx.beginPath();
  ctx.arc(0, 0, 120 * scale, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 70 * scale, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.beginPath();
  ctx.ellipse(-20 * scale, -20 * scale, 40 * scale, 60 * scale, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  const glow = ctx.createRadialGradient(0, 0, 20 * scale, 0, 0, 150 * scale);
  glow.addColorStop(0, palette.glow);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 0, 180 * scale, 160 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderPaladin(ctx, boss) {
  renderBackdrop(ctx, boss);
  const { palette } = boss.definition;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  const scale = boss.radius / 115;

  ctx.fillStyle = palette.hull;
  ctx.beginPath();
  ctx.rect(-30 * scale, -130 * scale, 60 * scale, 260 * scale);
  ctx.fill();

  ctx.beginPath();
  ctx.rect(-130 * scale, -30 * scale, 260 * scale, 60 * scale);
  ctx.fill();

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.ellipse(0, 0, 70 * scale, 70 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.trim;
  ctx.beginPath();
  ctx.ellipse(0, -90 * scale, 40 * scale, 50 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, 90 * scale, 40 * scale, 50 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  const glow = ctx.createRadialGradient(0, 0, 10 * scale, 0, 0, 150 * scale);
  glow.addColorStop(0, palette.glow);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 0, 180 * scale, 140 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderObliterator(ctx, boss) {
  renderBackdrop(ctx, boss);
  const { palette } = boss.definition;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  const scale = boss.radius / 100;

  ctx.fillStyle = palette.hull;
  ctx.beginPath();
  ctx.moveTo(0, -130 * scale);
  ctx.lineTo(90 * scale, -20 * scale);
  ctx.lineTo(50 * scale, 120 * scale);
  ctx.lineTo(-50 * scale, 120 * scale);
  ctx.lineTo(-90 * scale, -20 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.trim;
  ctx.beginPath();
  ctx.moveTo(-120 * scale, -10 * scale);
  ctx.lineTo(-40 * scale, 30 * scale);
  ctx.lineTo(-60 * scale, 130 * scale);
  ctx.lineTo(-150 * scale, 50 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(120 * scale, -10 * scale);
  ctx.lineTo(40 * scale, 30 * scale);
  ctx.lineTo(60 * scale, 130 * scale);
  ctx.lineTo(150 * scale, 50 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.rect(-30 * scale, -40 * scale, 60 * scale, 80 * scale);
  ctx.fill();

  const glow = ctx.createRadialGradient(0, 110 * scale, 20 * scale, 0, 110 * scale, 90 * scale);
  glow.addColorStop(0, palette.glow);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 110 * scale, 120 * scale, 80 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderMirage(ctx, boss) {
  renderBackdrop(ctx, boss);
  const { palette } = boss.definition;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  const scale = boss.radius / 85;

  ctx.fillStyle = palette.hull;
  ctx.beginPath();
  ctx.moveTo(0, -120 * scale);
  ctx.lineTo(90 * scale, 80 * scale);
  ctx.lineTo(0, 40 * scale);
  ctx.lineTo(-90 * scale, 80 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.trim;
  ctx.beginPath();
  ctx.moveTo(0, -70 * scale);
  ctx.lineTo(60 * scale, 40 * scale);
  ctx.lineTo(0, 10 * scale);
  ctx.lineTo(-60 * scale, 40 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.ellipse(0, -40 * scale, 40 * scale, 50 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  const glow = ctx.createRadialGradient(0, 70 * scale, 12 * scale, 0, 70 * scale, 90 * scale);
  glow.addColorStop(0, palette.glow);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 70 * scale, 120 * scale, 70 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderNova(ctx, boss) {
  renderBackdrop(ctx, boss);
  const { palette } = boss.definition;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  const scale = boss.radius / 110;

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI / 4) * i;
    const x = Math.cos(angle) * 110 * scale;
    const y = Math.sin(angle) * 110 * scale;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.hull;
  ctx.beginPath();
  ctx.ellipse(0, 0, 70 * scale, 70 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.trim;
  ctx.beginPath();
  ctx.ellipse(0, 0, 40 * scale, 40 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  const glow = ctx.createRadialGradient(0, 0, 20 * scale, 0, 0, 150 * scale);
  glow.addColorStop(0, palette.glow);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 0, 200 * scale, 200 * scale, 0, 0, Math.PI * 2);
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

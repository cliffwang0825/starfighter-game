import { clamp, randChoice, randRange } from "../utils.js";
import { Enemy } from "./enemy.js";

const BOSS_TYPES = [
  {
    id: "vanguard",
    health: 120,
    radius: 88,
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
        boss.weaponTimer = 1.8;
        const baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
        for (let i = -1; i <= 1; i += 1) {
          const angle = baseAngle + i * 0.2;
          bullets.push(makeBossBullet(boss, angle, 260, 8));
        }
      }
      if (boss.waveTimer >= 4.5) {
        boss.waveTimer = 0;
        for (let i = 0; i < 5; i += 1) {
          const angle = Math.PI / 2 + (i - 2) * 0.18;
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
    radius: 104,
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
        boss.weaponTimer = 1.2;
        const arcs = 6;
        for (let i = 0; i < arcs; i += 1) {
          const angle = Math.PI / 2 + (i / (arcs - 1) - 0.5) * 0.9;
          bullets.push(makeBossBullet(boss, angle, 300, 7));
        }
      }
      boss.secondaryTimer = (boss.secondaryTimer || 0) - dt;
      if (boss.secondaryTimer <= 0) {
        boss.secondaryTimer = 2.4;
        const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
        bullets.push(makeBossBeam(boss, angle));
      }
      if (boss.spawnTimer <= 0) {
        boss.spawnTimer = 6 + randRange(0, 2);
        spawns.push(
          new Enemy({
            x: boss.x - 60,
            y: boss.y + 30,
            amplitude: 24,
            frequency: 2.5,
            fireCooldown: 1.4,
            bounds: boss.game,
            health: 4,
            speedY: 140,
            scoreValue: 250,
            dropType: randChoice(["speed", "spread"]),
          }),
        );
        spawns.push(
          new Enemy({
            x: boss.x + 60,
            y: boss.y + 30,
            amplitude: 24,
            frequency: 2.5,
            fireCooldown: 1.4,
            bounds: boss.game,
            health: 4,
            speedY: 140,
            scoreValue: 250,
            dropType: randChoice(["bomb", "shield"]),
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
    radius: 120,
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
        boss.weaponTimer = 0.8;
        const rings = 10;
        for (let i = 0; i < rings; i += 1) {
          const angle = (i / rings) * Math.PI * 2;
          bullets.push(makeBossBullet(boss, angle, 260 + randRange(-20, 20), 8));
        }
      }
      if (boss.secondaryTimer <= 0) {
        boss.secondaryTimer = 3.2;
        const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
        for (let i = -2; i <= 2; i += 1) {
          bullets.push(makeBossBullet(boss, angle + i * 0.08, 320, 7));
        }
      }
      if (boss.spawnTimer <= 0) {
        boss.spawnTimer = 7;
        for (let i = -1; i <= 1; i += 2) {
          spawns.push(
            new Enemy({
              x: boss.x + i * 90,
              y: boss.y + 50,
              amplitude: 30,
              frequency: 2.8,
              fireCooldown: 1.1,
              bounds: boss.game,
              health: 5,
              speedY: 120,
              scoreValue: 320,
              dropType: randChoice(["bomb", "speed", "spread", "shield"]),
            }),
          );
        }
      }
      return { bullets, spawns };
    },
    render: renderSentinel,
  },
];

export class Boss {
  constructor(game, stageIndex) {
    this.game = game;
    this.definition = BOSS_TYPES[stageIndex % BOSS_TYPES.length];
    this.maxHealth = this.definition.health;
    this.health = this.definition.health;
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
  const gradient = ctx.createRadialGradient(
    boss.x,
    boss.y,
    40,
    boss.x,
    boss.y,
    boss.radius * 2.6,
  );
  gradient.addColorStop(0, "rgba(40, 80, 130, 0.45)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, boss.game.width, boss.game.height);
  ctx.restore();
}

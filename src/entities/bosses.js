import { clamp, randChoice, randRange, maybeDropFrom } from "../utils.js";
import { Enemy } from "./enemy.js";

const DEFAULT_PHASE_THRESHOLDS = [0.4];
const DEFAULT_PHASE_SCALE = [1, 0.74, 0.6];

const BOSS_TYPES = [
  {
    id: "vanguard",
    name: "Crimson Star Dreadnought",
    health: 120,
    radius: 66,
    behaviour: (boss, dt, target) => {
      const phaseTwo = boss.phase >= 2;
      boss.waveTimer = (boss.waveTimer || 0) + dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.secondaryTimer = (boss.secondaryTimer || 0) - dt;
      boss.sweepTimer = (boss.sweepTimer || 0) + dt;
      const swaySpeed = phaseTwo ? 0.85 : 0.6;
      const swayAmplitude = phaseTwo ? 120 : 80;
      boss.x = clamp(
        boss.x + Math.sin(boss.sweepTimer * swaySpeed) * swayAmplitude * dt,
        boss.radius,
        boss.game.width - boss.radius,
      );
      const charging = handlePhaseCharge(boss, dt, target, {
        speed: phaseTwo ? 270 : 220,
        interval: [3.6, 5.4],
        diveDepth: 0.72,
      });
      if (!charging) {
        boss.y = clamp(boss.y + (boss.targetY - boss.y) * Math.min(2.6 * dt, 1), boss.radius, boss.targetY);
      }
      const bullets = [];
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(phaseTwo ? 1.25 : 1.8, boss, { ignorePhase: true });
        const baseAngle = Math.atan2(target.y - boss.y, target.x - boss.x);
        const volleyCount = phaseTwo ? scaledCount(4, boss, { ignorePhase: true }) : scaledCount(3, boss, { ignorePhase: true });
        const offset = -(volleyCount - 1) / 2;
        for (let i = 0; i < volleyCount; i += 1) {
          const angle = baseAngle + (offset + i) * (phaseTwo ? 0.16 : 0.2);
          bullets.push(makeBossBullet(boss, angle, phaseTwo ? 320 : 260, phaseTwo ? 9 : 8));
        }
      }
      if (boss.waveTimer >= scaledInterval(phaseTwo ? 3.6 : 4.5, boss, { ignorePhase: true })) {
        boss.waveTimer = 0;
        const waveCount = scaledCount(phaseTwo ? 6 : 5, boss, { ignorePhase: true });
        const offset = -(waveCount - 1) / 2;
        for (let i = 0; i < waveCount; i += 1) {
          const angle = Math.PI / 2 + (offset + i) * (phaseTwo ? 0.16 : 0.18);
          bullets.push(makeBossBullet(boss, angle, phaseTwo ? 260 : 220, 6));
        }
      }
      if (phaseTwo && boss.secondaryTimer <= 0) {
        boss.secondaryTimer = scaledInterval(2.6, boss, { ignorePhase: true });
        const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
        bullets.push(makeBossBeam(boss, angle + 0.08));
        bullets.push(makeBossBeam(boss, angle - 0.08));
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
      const phaseTwo = boss.phase >= 2;
      boss.sweepTimer = (boss.sweepTimer || 0) + dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.spawnTimer = (boss.spawnTimer || 0) - dt;
      boss.secondaryTimer = (boss.secondaryTimer || 0) - dt;
      const swaySpeed = phaseTwo ? 0.55 : 0.45;
      const swayAmplitude = phaseTwo ? 150 : 120;
      boss.x = clamp(
        boss.x + Math.sin(boss.sweepTimer * swaySpeed) * swayAmplitude * dt,
        boss.radius,
        boss.game.width - boss.radius,
      );
      boss.y = boss.targetY + Math.sin(boss.sweepTimer * (phaseTwo ? 1.4 : 1)) * (phaseTwo ? 22 : 14);
      const bullets = [];
      const spawns = [];
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(phaseTwo ? 0.9 : 1.2, boss, { ignorePhase: true });
        const arcs = Math.max(3, scaledCount(phaseTwo ? 7 : 6, boss, { ignorePhase: true }));
        for (let i = 0; i < arcs; i += 1) {
          const angle = Math.PI / 2 + (i / (arcs - 1) - 0.5) * (phaseTwo ? 1.05 : 0.9);
          bullets.push(makeBossBullet(boss, angle, phaseTwo ? 320 : 300, phaseTwo ? 8 : 7));
        }
      }
      if (boss.secondaryTimer <= 0) {
        boss.secondaryTimer = scaledInterval(phaseTwo ? 1.8 : 2.4, boss, { ignorePhase: true });
        const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
        bullets.push(makeBossBeam(boss, angle));
        if (phaseTwo) {
          bullets.push(makeBossBeam(boss, angle + 0.18));
          bullets.push(makeBossBeam(boss, angle - 0.18));
        }
      }
      if (boss.spawnTimer <= 0) {
        boss.spawnTimer = scaledInterval((phaseTwo ? 4.2 : 6) + randRange(0, phaseTwo ? 1.2 : 2), boss, { ignorePhase: true });
        spawns.push(
          makeMinion(boss, {
            x: boss.x - 60,
            y: boss.y + 30,
            amplitude: 24,
            frequency: phaseTwo ? 3 : 2.5,
            fireCooldown: phaseTwo ? 1.1 : 1.4,
            health: phaseTwo ? 5 : 4,
            speedY: 150,
            scoreValue: 250,
            dropType: maybeDropFrom(["speed", "spread", "health"]),
          }),
        );
        spawns.push(
          makeMinion(boss, {
            x: boss.x + 60,
            y: boss.y + 30,
            amplitude: 24,
            frequency: phaseTwo ? 3 : 2.5,
            fireCooldown: phaseTwo ? 1.1 : 1.4,
            health: phaseTwo ? 5 : 4,
            speedY: 150,
            scoreValue: 250,
            dropType: maybeDropFrom(["bomb", "shield", "laser", "health"]),
          }),
        );
        if (phaseTwo) {
          spawns.push(
            makeMinion(boss, {
              x: boss.x,
              y: boss.y + 40,
              amplitude: 8,
              frequency: 1.8,
              fireCooldown: 0.9,
              health: 3,
              speedY: 200,
              burst: 2,
              scoreValue: 320,
              dropType: maybeDropFrom(["bomb", "shield", "laser"]),
            }),
          );
        }
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
      const phaseTwo = boss.phase >= 2;
      boss.sweepTimer = (boss.sweepTimer || 0) + dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.secondaryTimer = (boss.secondaryTimer || 0) - dt;
      boss.spawnTimer = (boss.spawnTimer || 0) - dt;
      const swaySpeed = phaseTwo ? 0.42 : 0.35;
      boss.x = clamp(
        boss.x + Math.sin(boss.sweepTimer * swaySpeed) * (phaseTwo ? 170 : 140) * dt + Math.cos(boss.sweepTimer * (phaseTwo ? 1 : 0.8)) * 60 * dt,
        boss.radius,
        boss.game.width - boss.radius,
      );
      boss.y = boss.targetY + Math.sin(boss.sweepTimer * (phaseTwo ? 1.1 : 0.9)) * (phaseTwo ? 24 : 16);
      const bullets = [];
      const spawns = [];
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(phaseTwo ? 0.65 : 0.8, boss, { ignorePhase: true });
        const rings = Math.max(6, scaledCount(phaseTwo ? 12 : 10, boss, { ignorePhase: true }));
        for (let i = 0; i < rings; i += 1) {
          const angle = (i / rings) * Math.PI * 2 + boss.sweepTimer * (phaseTwo ? 0.3 : 0.18);
          bullets.push(makeBossBullet(boss, angle, (phaseTwo ? 300 : 260) + randRange(-20, 20), phaseTwo ? 9 : 8));
        }
      }
      if (boss.secondaryTimer <= 0) {
        boss.secondaryTimer = scaledInterval(phaseTwo ? 2.2 : 3.2, boss, { ignorePhase: true });
        const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
        const spreadCount = Math.max(1, scaledCount(phaseTwo ? 7 : 5, boss, { ignorePhase: true }));
        const offset = -(spreadCount - 1) / 2;
        for (let i = 0; i < spreadCount; i += 1) {
          bullets.push(makeBossBullet(boss, angle + (offset + i) * (phaseTwo ? 0.06 : 0.08), phaseTwo ? 340 : 320, 7));
        }
      }
      if (boss.spawnTimer <= 0) {
        boss.spawnTimer = scaledInterval(phaseTwo ? 5.2 : 7, boss, { ignorePhase: true });
        for (let i = -1; i <= 1; i += 2) {
          spawns.push(
            makeMinion(boss, {
              x: boss.x + i * 90,
              y: boss.y + 50,
              amplitude: 30,
              frequency: phaseTwo ? 3.2 : 2.8,
              fireCooldown: phaseTwo ? 0.9 : 1.1,
              health: phaseTwo ? 6 : 5,
              speedY: phaseTwo ? 150 : 120,
              scoreValue: 320,
              dropType: maybeDropFrom(["bomb", "speed", "spread", "shield", "laser", "health"]),
            }),
          );
        }
        if (phaseTwo) {
          spawns.push(
            makeMinion(boss, {
              x: boss.x,
              y: boss.y + 60,
              amplitude: 12,
              frequency: 3.6,
              fireCooldown: 0.8,
              burst: 3,
              health: 6,
              speedY: 160,
              scoreValue: 360,
              dropType: maybeDropFrom(["shield", "laser", "health"]),
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
      const phaseTwo = boss.phase >= 2;
      boss.sweepTimer = (boss.sweepTimer || 0) + dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.strafeTimer = (boss.strafeTimer || 0) - dt;
      const sweepSpeed = phaseTwo ? 0.95 : 0.75;
      boss.x = clamp(
        boss.x + Math.sin(boss.sweepTimer * sweepSpeed) * (phaseTwo ? 200 : 160) * dt,
        boss.radius,
        boss.game.width - boss.radius,
      );
      const charging = handlePhaseCharge(boss, dt, target, {
        speed: phaseTwo ? 320 : 260,
        interval: [3, 4.6],
        duration: phaseTwo ? 1.4 : 1.1,
        diveDepth: 0.76,
      });
      if (!charging) {
        boss.y = boss.targetY + Math.sin(boss.sweepTimer * (phaseTwo ? 1.6 : 1.4)) * (phaseTwo ? 18 : 12);
      }
      const bullets = [];
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(phaseTwo ? 0.6 : 0.85, boss, { ignorePhase: true });
        const baseAngle = Math.atan2(target.y - boss.y, target.x - boss.x);
        const volley = Math.max(3, scaledCount(phaseTwo ? 6 : 5, boss, { ignorePhase: true }));
        const offset = -(volley - 1) / 2;
        for (let i = 0; i < volley; i += 1) {
          bullets.push(makeBossBullet(boss, baseAngle + (offset + i) * (phaseTwo ? 0.1 : 0.12), phaseTwo ? 360 : 320, 6));
        }
      }
      if (boss.strafeTimer <= 0) {
        boss.strafeTimer = scaledInterval(phaseTwo ? 1.8 : 2.6, boss, { ignorePhase: true });
        const sideCount = Math.max(4, scaledCount(phaseTwo ? 7 : 6, boss, { ignorePhase: true }));
        for (let i = 0; i < sideCount; i += 1) {
          const angle = Math.PI / 2 + (i / (sideCount - 1) - 0.5) * (phaseTwo ? 0.5 : 0.6);
          bullets.push(makeBossBullet(boss, angle, phaseTwo ? 300 : 260, 5));
        }
      }
      if (phaseTwo) {
        boss.chargeBurstTimer = (boss.chargeBurstTimer || 0) - dt;
        if (boss.chargeBurstTimer <= 0) {
          boss.chargeBurstTimer = scaledInterval(2.4, boss, { ignorePhase: true });
          const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
          bullets.push(makeBossBeam(boss, angle));
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
      const phaseTwo = boss.phase >= 2;
      boss.sweepTimer = (boss.sweepTimer || 0) + dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.beamTimer = (boss.beamTimer || 0) - dt;
      boss.secondaryTimer = (boss.secondaryTimer || 0) - dt;
      boss.x = clamp(
        boss.x + Math.sin(boss.sweepTimer * (phaseTwo ? 0.45 : 0.35)) * (phaseTwo ? 140 : 110) * dt,
        boss.radius,
        boss.game.width - boss.radius,
      );
      const charging = handlePhaseCharge(boss, dt, target, {
        speed: phaseTwo ? 300 : 240,
        interval: [4.2, 6.4],
        duration: 1.5,
        diveDepth: 0.7,
      });
      if (!charging) {
        boss.y = clamp(boss.y + (boss.targetY - boss.y) * Math.min(2.2 * dt, 1), boss.radius, boss.targetY);
      }
      const bullets = [];
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(phaseTwo ? 1 : 1.35, boss, { ignorePhase: true });
        const arcs = Math.max(5, scaledCount(phaseTwo ? 9 : 7, boss, { ignorePhase: true }));
        for (let i = 0; i < arcs; i += 1) {
          const angle = Math.PI / 2 + (i / (arcs - 1) - 0.5) * (phaseTwo ? 1 : 0.9);
          bullets.push(makeBossBullet(boss, angle, phaseTwo ? 300 : 260, 7));
        }
      }
      if (boss.beamTimer <= 0) {
        boss.beamTimer = scaledInterval(phaseTwo ? 2.6 : 3.4, boss, { ignorePhase: true });
        const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
        bullets.push(makeBossBeam(boss, angle));
        bullets.push(makeBossBeam(boss, angle + 0.15));
        bullets.push(makeBossBeam(boss, angle - 0.15));
        if (phaseTwo) {
          bullets.push(makeBossBeam(boss, angle + 0.32));
          bullets.push(makeBossBeam(boss, angle - 0.32));
        }
      }
      if (phaseTwo && boss.secondaryTimer <= 0) {
        boss.secondaryTimer = scaledInterval(2.8, boss, { ignorePhase: true });
        const burst = Math.max(10, scaledCount(8, boss, { ignorePhase: true })) + 2;
        for (let i = 0; i < burst; i += 1) {
          const angle = (i / burst) * Math.PI * 2 + boss.sweepTimer * 0.4;
          bullets.push(makeBossBullet(boss, angle, 280, 6));
        }
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
      const phaseTwo = boss.phase >= 2;
      boss.orbitTimer = (boss.orbitTimer || 0) + dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.secondaryTimer = (boss.secondaryTimer || 0) - dt;
      boss.tertiaryTimer = (boss.tertiaryTimer || 0) - dt;
      const orbitSpeed = phaseTwo ? 0.75 : 0.6;
      boss.x = clamp(
        boss.x + Math.cos(boss.orbitTimer * orbitSpeed) * (phaseTwo ? 120 : 90) * dt,
        boss.radius,
        boss.game.width - boss.radius,
      );
      boss.y = boss.targetY + Math.sin(boss.orbitTimer * (phaseTwo ? 1.2 : 0.9)) * (phaseTwo ? 26 : 20);
      const bullets = [];
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(phaseTwo ? 0.8 : 1.1, boss, { ignorePhase: true });
        const ring = Math.max(8, scaledCount(phaseTwo ? 14 : 12, boss, { ignorePhase: true }));
        for (let i = 0; i < ring; i += 1) {
          const angle = (i / ring) * Math.PI * 2 + boss.orbitTimer * (phaseTwo ? 0.8 : 0.6);
          bullets.push(makeBossBullet(boss, angle, phaseTwo ? 280 : 240, 6));
        }
      }
      if (boss.secondaryTimer <= 0) {
        boss.secondaryTimer = scaledInterval(phaseTwo ? 2 : 2.8, boss, { ignorePhase: true });
        const baseAngle = Math.atan2(target.y - boss.y, target.x - boss.x);
        const split = Math.max(2, scaledCount(phaseTwo ? 6 : 4, boss, { ignorePhase: true }));
        for (let i = 0; i < split; i += 1) {
          const offset = (i - (split - 1) / 2) * (phaseTwo ? 0.1 : 0.12);
          bullets.push(makeBossBullet(boss, baseAngle + offset, phaseTwo ? 340 : 300, 6));
        }
      }
      if (phaseTwo && boss.tertiaryTimer <= 0) {
        boss.tertiaryTimer = scaledInterval(3.6, boss, { ignorePhase: true });
        const waves = 6;
        for (let i = 0; i < waves; i += 1) {
          const angle = Math.atan2(target.y - boss.y, target.x - boss.x) + (i - (waves - 1) / 2) * 0.18;
          bullets.push(makeBossBullet(boss, angle, 260, 8));
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
      const phaseTwo = boss.phase >= 2;
      boss.swayTimer = (boss.swayTimer || 0) + dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.spawnTimer = (boss.spawnTimer || 0) - dt;
      boss.secondaryTimer = (boss.secondaryTimer || 0) - dt;
      boss.x = clamp(
        boss.x + Math.sin(boss.swayTimer * (phaseTwo ? 0.65 : 0.5)) * (phaseTwo ? 130 : 100) * dt,
        boss.radius,
        boss.game.width - boss.radius,
      );
      boss.y = boss.targetY + Math.sin(boss.swayTimer * (phaseTwo ? 1.5 : 1.2)) * (phaseTwo ? 18 : 14);
      const bullets = [];
      const spawns = [];
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(phaseTwo ? 0.65 : 0.9, boss, { ignorePhase: true });
        const offsets = phaseTwo ? [-0.32, -0.16, 0, 0.16, 0.32] : [-0.25, -0.08, 0.08, 0.25];
        for (const offset of offsets) {
          bullets.push(makeBossBullet(boss, Math.PI / 2 + offset, phaseTwo ? 360 : 320, 5));
        }
      }
      if (phaseTwo && boss.secondaryTimer <= 0) {
        boss.secondaryTimer = scaledInterval(2.4, boss, { ignorePhase: true });
        const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
        bullets.push(makeBossBeam(boss, angle));
      }
      if (boss.spawnTimer <= 0) {
        boss.spawnTimer = scaledInterval(phaseTwo ? 3.8 : 5.4, boss, { ignorePhase: true });
        spawns.push(
          makeMinion(boss, {
            x: boss.x - 90,
            y: boss.y + 40,
            amplitude: 28,
            frequency: phaseTwo ? 3 : 2.6,
            fireCooldown: phaseTwo ? 1.2 : 1.6,
            health: phaseTwo ? 6 : 5,
            speedY: phaseTwo ? 150 : 130,
            scoreValue: 280,
            dropType: maybeDropFrom(["shield", "speed", "health"]),
          }),
        );
        spawns.push(
          makeMinion(boss, {
            x: boss.x + 90,
            y: boss.y + 40,
            amplitude: 28,
            frequency: phaseTwo ? 3 : 2.6,
            fireCooldown: phaseTwo ? 1.2 : 1.6,
            health: phaseTwo ? 6 : 5,
            speedY: phaseTwo ? 150 : 130,
            scoreValue: 280,
            dropType: maybeDropFrom(["laser", "bomb", "health"]),
          }),
        );
        if (phaseTwo) {
          spawns.push(
            makeMinion(boss, {
              x: boss.x,
              y: boss.y + 60,
              amplitude: 14,
              frequency: 3.2,
              fireCooldown: 1,
              health: 5,
              speedY: 180,
              burst: 3,
              scoreValue: 320,
              dropType: maybeDropFrom(["bomb", "shield", "health"]),
            }),
          );
        }
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
      const phaseTwo = boss.phase >= 2;
      boss.dashTimer = (boss.dashTimer || 0) - dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.mineTimer = (boss.mineTimer || 0) - dt;
      boss.secondaryTimer = (boss.secondaryTimer || 0) - dt;
      boss.dashDirection = boss.dashDirection ?? 1;
      if (boss.dashTimer <= 0) {
        boss.dashTimer = scaledInterval(phaseTwo ? 3.1 : 4.2, boss, { ignorePhase: true });
        boss.dashDirection *= -1;
      }
      boss.x = clamp(
        boss.x + boss.dashDirection * (phaseTwo ? 200 : 160) * dt,
        boss.radius,
        boss.game.width - boss.radius,
      );
      if (phaseTwo) {
        const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
        boss.y = clamp(boss.y + Math.sin(angle) * 60 * dt, boss.radius, boss.targetY + 80);
      } else {
        boss.y = clamp(boss.y + (boss.targetY - boss.y) * Math.min(2 * dt, 1), boss.radius, boss.targetY);
      }
      const bullets = [];
      const spawns = [];
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(phaseTwo ? 1 : 1.6, boss, { ignorePhase: true });
        const dropCount = Math.max(2, scaledCount(phaseTwo ? 4 : 3, boss, { ignorePhase: true }));
        for (let i = 0; i < dropCount; i += 1) {
          const offset = i - (dropCount - 1) / 2;
          bullets.push({
            x: boss.x + offset * 28,
            y: boss.y + boss.radius * 0.6,
            velocityX: offset * 60,
            velocityY: 230 + Math.abs(offset) * (phaseTwo ? 40 : 30),
            radius: phaseTwo ? 12 : 10,
            friendly: false,
            damage: phaseTwo ? 3 : 2,
          });
        }
      }
      if (boss.secondaryTimer <= 0 && phaseTwo) {
        boss.secondaryTimer = scaledInterval(2.8, boss, { ignorePhase: true });
        const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
        bullets.push(makeBossBeam(boss, angle));
      }
      if (boss.mineTimer <= 0) {
        boss.mineTimer = scaledInterval(phaseTwo ? 3.6 : 5.2, boss, { ignorePhase: true });
        spawns.push(
          makeMinion(boss, {
            x: boss.x,
            y: boss.y + boss.radius,
            amplitude: phaseTwo ? 10 : 0,
            frequency: phaseTwo ? 2.2 : 0,
            fireCooldown: phaseTwo ? 1.6 : 2.4,
            health: phaseTwo ? 7 : 6,
            speedY: phaseTwo ? 180 : 150,
            scoreValue: 340,
            dropType: maybeDropFrom(["bomb", "spread", "shield", "health"]),
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
      const phaseTwo = boss.phase >= 2;
      boss.phaseTimer = (boss.phaseTimer || scaledInterval(phaseTwo ? 3 : 4, boss, { ignorePhase: true })) - dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.secondaryTimer = (boss.secondaryTimer || 0) - dt;
      const bullets = [];
      if (boss.phaseTimer <= 0) {
        boss.phaseTimer = scaledInterval(phaseTwo ? 3 : 4, boss, { ignorePhase: true });
        boss.x = clamp(randRange(boss.radius, boss.game.width - boss.radius), boss.radius, boss.game.width - boss.radius);
        const ring = Math.max(6, scaledCount(phaseTwo ? 10 : 8, boss, { ignorePhase: true }));
        for (let i = 0; i < ring; i += 1) {
          const angle = (i / ring) * Math.PI * 2;
          bullets.push(makeBossBullet(boss, angle, phaseTwo ? 280 : 240, 5));
        }
      }
      boss.y = clamp(boss.y + (boss.targetY - boss.y) * dt * (phaseTwo ? 3 : 2), boss.radius, boss.targetY);
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(phaseTwo ? 0.75 : 1, boss, { ignorePhase: true });
        const baseAngle = Math.atan2(target.y - boss.y, target.x - boss.x);
        const fan = Math.max(4, scaledCount(phaseTwo ? 7 : 6, boss, { ignorePhase: true }));
        for (let i = 0; i < fan; i += 1) {
          const offset = (i - (fan - 1) / 2) * (phaseTwo ? 0.08 : 0.1);
          bullets.push(makeBossBullet(boss, baseAngle + offset, phaseTwo ? 340 : 300, 5));
        }
      }
      if (phaseTwo && boss.secondaryTimer <= 0) {
        boss.secondaryTimer = scaledInterval(2.2, boss, { ignorePhase: true });
        const burst = 6;
        for (let i = 0; i < burst; i += 1) {
          const angle = Math.atan2(target.y - boss.y, target.x - boss.x) + (i - (burst - 1) / 2) * 0.14;
          bullets.push(makeBossBullet(boss, angle, 260, 6));
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
      const phaseTwo = boss.phase >= 2;
      boss.chargeTimer = (boss.chargeTimer || 0) + dt;
      boss.weaponTimer = (boss.weaponTimer || 0) - dt;
      boss.secondaryTimer = (boss.secondaryTimer || 0) - dt;
      boss.x = clamp(
        boss.x + Math.sin(boss.chargeTimer * (phaseTwo ? 0.45 : 0.3)) * (phaseTwo ? 120 : 90) * dt,
        boss.radius,
        boss.game.width - boss.radius,
      );
      boss.y = boss.targetY + Math.sin(boss.chargeTimer * (phaseTwo ? 1.1 : 0.8)) * (phaseTwo ? 20 : 12);
      const bullets = [];
      if (boss.weaponTimer <= 0) {
        boss.weaponTimer = scaledInterval(phaseTwo ? 0.9 : 1.2, boss, { ignorePhase: true });
        const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
        bullets.push(makeBossBeam(boss, angle));
        if (phaseTwo) {
          bullets.push(makeBossBeam(boss, angle + 0.18));
          bullets.push(makeBossBeam(boss, angle - 0.18));
        }
      }
      const chargeThreshold = scaledInterval(phaseTwo ? 3.2 : 4.5, boss, { ignorePhase: true });
      if (boss.chargeTimer >= chargeThreshold) {
        boss.chargeTimer = 0;
        const burst = Math.max(12, scaledCount(phaseTwo ? 20 : 16, boss, { ignorePhase: true }));
        for (let i = 0; i < burst; i += 1) {
          const angle = (i / burst) * Math.PI * 2;
          bullets.push(makeBossBullet(boss, angle, phaseTwo ? 340 : 280, 7));
        }
      }
      if (phaseTwo && boss.secondaryTimer <= 0) {
        boss.secondaryTimer = scaledInterval(2.4, boss, { ignorePhase: true });
        const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
        const volley = 6;
        for (let i = 0; i < volley; i += 1) {
          const offset = (i - (volley - 1) / 2) * 0.12;
          bullets.push(makeBossBullet(boss, angle + offset, 300, 6));
        }
      }
      return { bullets, spawns: [] };
    },
    render: renderNova,
  },
];

const FINAL_BOSS_PALETTE = {
  hull: "#15020f",
  trim: "#ff5a91",
  accent: "#ffd86d",
  glow: "#ff9bd4",
};

const FINAL_BOSS_TEMPLATE = {
  id: "void_emperor",
  name: "Oblivion Apex Sovereign",
  health: 720,
  radius: 140,
  phaseThresholds: [0.65, 0.4],
  phaseScale: [1, 0.82, 0.68],
  targetOffset: 0.24,
  entrySpeed: 120,
  palette: FINAL_BOSS_PALETTE,
  behaviour: finalBossBehaviour,
  render: renderFinalSovereign,
  onPhaseChange: (boss, phase) => {
    if (phase === 2) {
      boss.targetY = boss.game.height * 0.3;
    } else if (phase === 3) {
      boss.targetY = boss.game.height * 0.34;
    }
  },
};

const BOSS_COLOR_VARIANTS = [
  { hull: "#361218", trim: "#ff5a63", accent: "#ffb3a2", glow: "#ffd4c6" },
  { hull: "#d9dde4", trim: "#f7f8fb", accent: "#ffffff", glow: "#f0f4ff" },
  { hull: "#2d153f", trim: "#8e6dff", accent: "#d9baff", glow: "#f6e7ff" },
  { hull: "#0d141e", trim: "#2f74c8", accent: "#58b0ff", glow: "#93d8ff" },
  { hull: "#3b2a07", trim: "#c99a1c", accent: "#ffd96d", glow: "#ffe7ab" },
];

let bossColorIndex = 0;

export const BOSS_COUNT = BOSS_TYPES.length;
export const FINAL_BOSS_ID = FINAL_BOSS_TEMPLATE.id;

export function resetBossPaletteCycle() {
  bossColorIndex = 0;
}

export function createFinalBoss(game, difficulty) {
  return new Boss(game, { ...FINAL_BOSS_TEMPLATE }, difficulty);
}

export class Boss {
  constructor(game, bossInput, difficulty) {
    this.game = game;
    const { definition, palette } = resolveBossDefinition(bossInput);
    const paletteVariant = palette ?? BOSS_COLOR_VARIANTS[bossColorIndex % BOSS_COLOR_VARIANTS.length];
    bossColorIndex += palette ? 0 : 1;
    this.definition = { ...definition, palette: paletteVariant };
    this.difficulty = difficulty ?? {};
    const diff = getDifficulty(this);
    this.maxHealth = Math.max(1, Math.round(this.definition.health * diff.bossHealthMultiplier));
    this.health = this.maxHealth;
    this.baseRadius = this.definition.radius;
    this.phaseScale = this.definition.phaseScale ?? DEFAULT_PHASE_SCALE;
    this.phaseThresholds = [...(this.definition.phaseThresholds ?? DEFAULT_PHASE_THRESHOLDS)].sort((a, b) => b - a);
    this.phase = 1;
    this.nextPhaseIndex = 0;
    this.debris = [];
    this.phaseFlashTimer = 0;
    this.radius = this.getPhaseRadius(this.phase);
    this.x = game.width / 2;
    this.y = -this.radius * 1.4;
    this.targetY = game.height * (this.definition.targetOffset ?? 0.28);
    this.entrySpeed = this.definition.entrySpeed ?? 160;
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
      this.updateDebris(dt);
      return { bullets: [], spawns: [] };
    }
    const target = selectTarget(this, players);
    const result = this.definition.behaviour(this, dt, target, players) || {};
    const bullets = result?.bullets ?? [];
    for (const bullet of bullets) {
      bullet.friendly = false;
    }
    this.updateDebris(dt);
    return { bullets, spawns: result?.spawns ?? [] };
  }

  takeHit(damage = 1) {
    this.health = Math.max(0, this.health - damage);
    this.evaluatePhaseChange();
    return this.health <= 0;
  }

  render(ctx) {
    if (this.phaseFlashTimer > 0) {
      ctx.save();
      const alpha = Math.max(0, Math.min(1, this.phaseFlashTimer / 0.6));
      const radius = this.radius * (1.8 - alpha * 0.6);
      const gradient = ctx.createRadialGradient(this.x, this.y, this.radius * 0.6, this.x, this.y, radius);
      gradient.addColorStop(0, `rgba(255, 168, 96, ${0.35 * alpha})`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.game.width, this.game.height);
      ctx.restore();
    }
    renderDebris(ctx, this);
    this.definition.render(ctx, this);
  }

  get isDefeated() {
    return this.health <= 0;
  }

  evaluatePhaseChange() {
    let transformed = false;
    while (
      this.nextPhaseIndex < this.phaseThresholds.length &&
      this.health <= this.maxHealth * this.phaseThresholds[this.nextPhaseIndex]
    ) {
      this.phase += 1;
      this.nextPhaseIndex += 1;
      this.applyPhaseChange();
      transformed = true;
    }
    return transformed;
  }

  applyPhaseChange() {
    this.radius = this.getPhaseRadius(this.phase);
    this.phaseFlashTimer = 0.6;
    spawnPhaseDebris(this);
    if (typeof this.definition.onPhaseChange === "function") {
      this.definition.onPhaseChange(this, this.phase);
    }
  }

  getPhaseRadius(phase) {
    const scale = this.phaseScale[Math.min(this.phaseScale.length - 1, Math.max(0, phase - 1))] ?? 1;
    return Math.max(40, Math.round(this.baseRadius * scale));
  }

  updateDebris(dt) {
    if (this.phaseFlashTimer > 0) {
      this.phaseFlashTimer = Math.max(0, this.phaseFlashTimer - dt);
    }
    if (!this.debris?.length) return;
    for (const piece of this.debris) {
      piece.vy += 180 * dt;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.life -= dt;
      piece.rotation += piece.spin * dt;
    }
    this.debris = this.debris.filter((piece) => piece.life > 0);
  }
}

function resolveBossDefinition(input) {
  if (typeof input === "number") {
    const definition = BOSS_TYPES[input % BOSS_TYPES.length];
    return { definition, palette: null };
  }
  if (input && typeof input === "object") {
    const providedPalette = input.palette ?? null;
    return { definition: { ...input }, palette: providedPalette };
  }
  const fallback = BOSS_TYPES[0];
  const paletteVariant = BOSS_COLOR_VARIANTS[bossColorIndex % BOSS_COLOR_VARIANTS.length];
  return { definition: fallback, palette: paletteVariant };
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

function spawnPhaseDebris(boss) {
  const count = 8 + Math.round(Math.random() * 4);
  if (!boss.debris) {
    boss.debris = [];
  }
  const palette = boss.definition?.palette ?? {};
  for (let i = 0; i < count; i += 1) {
    const life = randRange(0.9, 1.6);
    boss.debris.push({
      x: randRange(-boss.radius * 0.7, boss.radius * 0.7),
      y: randRange(-boss.radius * 0.2, boss.radius * 0.4),
      vx: randRange(-80, 80),
      vy: randRange(60, 140),
      life,
      totalLife: life,
      rotation: randRange(0, Math.PI * 2),
      spin: randRange(-6, 6),
      width: randRange(16, 28),
      height: randRange(6, 16),
      color: palette.accent ?? "#ffbdbd",
      edge: palette.trim ?? "#ffe0c2",
    });
  }
}

function renderDebris(ctx, boss) {
  if (!boss.debris?.length) return;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  for (const piece of boss.debris) {
    const fade = Math.max(0, Math.min(1, piece.life / piece.totalLife));
    ctx.save();
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.rotation);
    ctx.globalAlpha = 0.55 * fade;
    ctx.fillStyle = piece.color;
    ctx.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
    ctx.globalAlpha = 0.35 * fade;
    ctx.fillStyle = piece.edge;
    ctx.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height * 0.35);
    ctx.restore();
  }
  ctx.restore();
}

function handlePhaseCharge(boss, dt, target, config = {}) {
  if (boss.phase < 2) {
    boss.phaseCharging = false;
    boss.phaseChargeCooldown = randRange(
      config.interval?.[0] ?? 4,
      config.interval?.[1] ?? 6,
    );
    return false;
  }
  const intervalMin = config.interval?.[0] ?? 4.2;
  const intervalMax = config.interval?.[1] ?? 6.4;
  boss.phaseChargeCooldown = (boss.phaseChargeCooldown ?? randRange(intervalMin, intervalMax)) - dt;
  if (boss.phaseChargeCooldown <= 0 && !boss.phaseCharging) {
    boss.phaseCharging = true;
    boss.phaseChargeCooldown = randRange(intervalMin, intervalMax);
    boss.phaseChargeTimer = config.duration ?? 1.2;
    boss.phaseRetreatTimer = 0;
    boss.phaseChargeVelocityX = 0;
    boss.phaseChargeVelocityY = 0;
    boss.phaseChargeTarget = target
      ? { x: target.x, y: Math.min(target.y, boss.game.height * (config.diveDepth ?? 0.75)) }
      : { x: boss.game.width / 2, y: boss.game.height * (config.diveDepth ?? 0.75) };
  }
  if (boss.phaseCharging) {
    boss.phaseChargeTimer -= dt;
    const speed = config.speed ?? 240;
    const angle = Math.atan2(boss.phaseChargeTarget.y - boss.y, boss.phaseChargeTarget.x - boss.x);
    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;
    boss.phaseChargeVelocityX = velocityX;
    boss.phaseChargeVelocityY = velocityY;
    boss.x = clamp(boss.x + velocityX * dt, boss.radius, boss.game.width - boss.radius);
    boss.y = clamp(
      boss.y + velocityY * dt,
      boss.radius,
      boss.game.height * (config.diveDepth ?? 0.75),
    );
    if (boss.phaseChargeTimer <= 0 || Math.abs(boss.y - boss.phaseChargeTarget.y) < 12) {
      boss.phaseCharging = false;
      boss.phaseRetreatTimer = config.recovery ?? 0.8;
      boss.phaseRetreatDuration = boss.phaseRetreatTimer;
    }
    return true;
  }
  if (boss.phaseRetreatTimer > 0) {
    const duration = boss.phaseRetreatDuration ?? config.recovery ?? 0.8;
    boss.phaseRetreatTimer = Math.max(0, boss.phaseRetreatTimer - dt);
    const t = duration > 0 ? boss.phaseRetreatTimer / duration : 0;
    const easing = t * t;
    const velocityX = boss.phaseChargeVelocityX ?? 0;
    const velocityY = boss.phaseChargeVelocityY ?? 0;
    boss.x = clamp(boss.x + velocityX * dt * easing, boss.radius, boss.game.width - boss.radius);
    boss.y = clamp(
      boss.y + velocityY * dt * easing,
      boss.radius,
      boss.game.height * (config.diveDepth ?? 0.75),
    );
    if (boss.phaseRetreatTimer <= 0) {
      boss.phaseChargeVelocityX = 0;
      boss.phaseChargeVelocityY = 0;
    }
    return true;
  }
  boss.y = clamp(boss.y + (boss.targetY - boss.y) * Math.min(3 * dt, 1), boss.radius, boss.targetY);
  return false;
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

function scaledInterval(base, boss, options = {}) {
  const diff = getDifficulty(boss);
  let interval = base / diff.bossFireRateMultiplier;
  if (!options.ignorePhase) {
    if (boss.phase >= 3) {
      interval *= 0.6;
    } else if (boss.phase >= 2) {
      interval *= 0.75;
    }
  }
  return interval;
}

function scaledCount(base, boss, options = {}) {
  const diff = getDifficulty(boss);
  let count = Math.max(1, Math.round(base * diff.bossBulletMultiplier * 0.5));
  if (!options.ignorePhase) {
    if (boss.phase >= 3) {
      count += 2;
    } else if (boss.phase >= 2) {
      count += 1;
    }
  }
  return count;
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

function finalBossBehaviour(boss, dt, target) {
  const phase = boss.phase;
  boss.sweepTimer = (boss.sweepTimer || 0) + dt;
  boss.weaponTimer = (boss.weaponTimer || 0) - dt;
  boss.secondaryTimer = (boss.secondaryTimer || 0) - dt;
  boss.ringTimer = (boss.ringTimer || 0) - dt;
  boss.voidChargeTimer = (boss.voidChargeTimer ?? randRange(5, 7)) - dt;

  const swaySpeed = phase >= 3 ? 0.42 : phase >= 2 ? 0.36 : 0.3;
  const swayAmplitude = phase >= 3 ? 170 : phase >= 2 ? 150 : 130;
  boss.x = clamp(
    boss.x + Math.sin(boss.sweepTimer * swaySpeed) * swayAmplitude * dt,
    boss.radius,
    boss.game.width - boss.radius,
  );
  boss.y = boss.targetY + Math.sin(boss.sweepTimer * (phase >= 3 ? 1.1 : phase >= 2 ? 0.95 : 0.75)) * (phase >= 3 ? 28 : phase >= 2 ? 22 : 16);

  const bullets = [];
  if (boss.weaponTimer <= 0) {
    const interval = phase >= 3 ? 0.75 : phase >= 2 ? 0.95 : 1.25;
    boss.weaponTimer = scaledInterval(interval, boss, { ignorePhase: true });
    const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
    const volley = phase >= 3 ? 6 : phase >= 2 ? 5 : 4;
    const offset = -(volley - 1) / 2;
    for (let i = 0; i < volley; i += 1) {
      bullets.push(
        makeBossBullet(
          boss,
          angle + (offset + i) * (phase >= 3 ? 0.08 : 0.1),
          phase >= 3 ? 380 : phase >= 2 ? 340 : 300,
          phase >= 3 ? 10 : 9,
        ),
      );
    }
  }

  if (boss.secondaryTimer <= 0) {
    const interval = phase >= 3 ? 2 : phase >= 2 ? 2.4 : 3.2;
    boss.secondaryTimer = scaledInterval(interval, boss, { ignorePhase: true });
    const burst = phase >= 3 ? 18 : phase >= 2 ? 14 : 10;
    for (let i = 0; i < burst; i += 1) {
      const angle = (i / burst) * Math.PI * 2 + boss.sweepTimer * (phase >= 3 ? 0.6 : 0.4);
      bullets.push(makeBossBullet(boss, angle, phase >= 3 ? 320 : 280, 7));
    }
  }

  if (boss.ringTimer <= 0) {
    const interval = phase >= 3 ? 5 : phase >= 2 ? 5.8 : 7;
    boss.ringTimer = scaledInterval(interval, boss, { ignorePhase: true });
    const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
    bullets.push(makeBossBeam(boss, angle));
    bullets.push(makeBossBeam(boss, angle + 0.14));
    bullets.push(makeBossBeam(boss, angle - 0.14));
    if (phase >= 2) {
      bullets.push(makeBossBeam(boss, angle + 0.3));
      bullets.push(makeBossBeam(boss, angle - 0.3));
    }
    if (phase >= 3) {
      bullets.push(makeBossBeam(boss, angle + 0.46));
      bullets.push(makeBossBeam(boss, angle - 0.46));
    }
  }

  if (phase >= 2 && boss.voidChargeTimer <= 0) {
    boss.voidChargeTimer = randRange(4.5, 6.2);
    boss.voidChargeDuration = phase >= 3 ? 2 : 1.4;
    boss.voidChargeTarget = target
      ? { x: target.x, y: Math.min(target.y, boss.game.height * 0.78) }
      : { x: boss.game.width / 2, y: boss.game.height * 0.78 };
  }

  if (boss.voidChargeDuration > 0) {
    boss.voidChargeDuration -= dt;
    const chargeSpeed = phase >= 3 ? 280 : 240;
    const angle = Math.atan2(boss.voidChargeTarget.y - boss.y, boss.voidChargeTarget.x - boss.x);
    boss.x = clamp(boss.x + Math.cos(angle) * chargeSpeed * dt, boss.radius, boss.game.width - boss.radius);
    boss.y = clamp(boss.y + Math.sin(angle) * chargeSpeed * dt, boss.radius, boss.game.height * 0.78);
    if (boss.voidChargeDuration <= 0) {
      boss.voidAftershockTimer = 0.6;
    }
  } else {
    boss.y = clamp(boss.y + (boss.targetY - boss.y) * Math.min(1.8 * dt, 1), boss.radius, boss.targetY);
  }

  if (boss.voidAftershockTimer > 0) {
    boss.voidAftershockTimer -= dt;
    if (boss.voidAftershockTimer <= 0) {
      const echo = 8 + phase * 4;
      for (let i = 0; i < echo; i += 1) {
        const angle = (i / echo) * Math.PI * 2;
        bullets.push(makeBossBullet(boss, angle, phase >= 3 ? 320 : 280, 6));
      }
    }
  }

  return { bullets, spawns: [] };
}

function renderFinalSovereign(ctx, boss) {
  renderBackdrop(ctx, boss);
  const { palette } = boss.definition;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  const scale = boss.radius / 140;

  // Outer halo
  const halo = ctx.createRadialGradient(0, 0, 40 * scale, 0, 0, 260 * scale);
  halo.addColorStop(0, hexToRgba(palette.glow, 0.55));
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.ellipse(0, 0, 260 * scale, 220 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Core body
  const hullGradient = ctx.createLinearGradient(0, -180 * scale, 0, 200 * scale);
  hullGradient.addColorStop(0, palette.trim);
  hullGradient.addColorStop(0.5, palette.accent);
  hullGradient.addColorStop(1, palette.hull);
  ctx.fillStyle = hullGradient;
  ctx.beginPath();
  ctx.moveTo(0, -200 * scale);
  ctx.bezierCurveTo(180 * scale, -120 * scale, 200 * scale, 80 * scale, 120 * scale, 200 * scale);
  ctx.lineTo(0, 150 * scale);
  ctx.lineTo(-120 * scale, 200 * scale);
  ctx.bezierCurveTo(-200 * scale, 80 * scale, -180 * scale, -120 * scale, 0, -200 * scale);
  ctx.closePath();
  ctx.fill();

  // Inner core
  ctx.fillStyle = palette.hull;
  ctx.beginPath();
  ctx.ellipse(0, -30 * scale, 120 * scale, 90 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.trim;
  ctx.beginPath();
  ctx.ellipse(0, -30 * scale, 70 * scale, 48 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  const phase = boss.phase;
  if (phase >= 2) {
    ctx.strokeStyle = hexToRgba(palette.accent, 0.8);
    ctx.lineWidth = 8 * scale;
    ctx.beginPath();
    ctx.arc(0, -30 * scale, 96 * scale, Math.PI * 0.15, Math.PI * 0.85, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -30 * scale, 96 * scale, Math.PI * 1.15, Math.PI * 1.85, false);
    ctx.stroke();
  }

  if (phase >= 3) {
    ctx.fillStyle = hexToRgba(palette.accent, 0.7);
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * Math.PI * 2;
      const x = Math.cos(angle) * 150 * scale;
      const y = Math.sin(angle) * 110 * scale + 80 * scale;
      ctx.beginPath();
      ctx.ellipse(x, y, 26 * scale, 44 * scale, angle, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Energy spine
  const spineGradient = ctx.createLinearGradient(-20 * scale, -180 * scale, 20 * scale, 200 * scale);
  spineGradient.addColorStop(0, hexToRgba(palette.accent, 0.9));
  spineGradient.addColorStop(1, hexToRgba(palette.trim, 0.6));
  ctx.fillStyle = spineGradient;
  ctx.beginPath();
  ctx.moveTo(-20 * scale, -180 * scale);
  ctx.lineTo(20 * scale, -180 * scale);
  ctx.lineTo(60 * scale, 200 * scale);
  ctx.lineTo(-60 * scale, 200 * scale);
  ctx.closePath();
  ctx.fill();

  // Cockpit glow
  const glow = ctx.createRadialGradient(0, -40 * scale, 20 * scale, 0, -40 * scale, 120 * scale);
  glow.addColorStop(0, hexToRgba(palette.glow, 0.8));
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, -40 * scale, 140 * scale, 100 * scale, 0, 0, Math.PI * 2);
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

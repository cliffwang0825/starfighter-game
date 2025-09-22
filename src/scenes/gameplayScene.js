import { Explosion } from "../effects/explosion.js";
import { Starfield } from "../effects/starfield.js";
import { updateBullets, renderBullets } from "../entities/bullet.js";
import { Enemy, StrafeEnemy, BomberEnemy } from "../entities/enemy.js";
import { Player } from "../entities/player.js";
import { PowerUp } from "../entities/powerup.js";
import { Boss, resetBossPaletteCycle, BOSS_COUNT } from "../entities/bosses.js";
import { distanceSquared, randChoice, randRange } from "../utils.js";
import { DebriefScene } from "./debriefScene.js";

export const DIFFICULTY_PRESETS = [
  {
    id: "easy",
    label: "Easy",
    description: "輕鬆巡航",
    enemyHealthMultiplier: 0.75,
    enemyFireRateMultiplier: 0.85,
    enemyExtraProjectiles: -1,
    bossHealthMultiplier: 0.85,
    bossFireRateMultiplier: 0.85,
    bossBulletMultiplier: 0.8,
    spawnDelayMultiplier: 1.15,
  },
  {
    id: "medium",
    label: "Medium",
    description: "正規出擊",
    enemyHealthMultiplier: 1,
    enemyFireRateMultiplier: 1,
    enemyExtraProjectiles: 0,
    bossHealthMultiplier: 1,
    bossFireRateMultiplier: 1,
    bossBulletMultiplier: 1,
    spawnDelayMultiplier: 1,
  },
  {
    id: "hard",
    label: "Hard",
    description: "危機四伏",
    enemyHealthMultiplier: 1.3,
    enemyFireRateMultiplier: 1.15,
    enemyExtraProjectiles: 1,
    bossHealthMultiplier: 1.35,
    bossFireRateMultiplier: 1.2,
    bossBulletMultiplier: 1.25,
    spawnDelayMultiplier: 0.8,
  },
];

const STAR_COLOR_CHOICES = [
  "rgba(150, 220, 255, 0.45)",
  "rgba(255, 214, 170, 0.45)",
  "rgba(206, 180, 255, 0.45)",
  "rgba(182, 250, 210, 0.45)",
  "rgba(255, 236, 210, 0.45)",
];

const PLAYER_MAX_LIVES = 3;
const PLAYER_COLLISION_RADIUS = 19;
const HEALTH_PER_LIFE = 3;
const BOMB_DAMAGE = 18;
const BOMB_COOLDOWN = 0.8;
const PLAYER_COUNT = 2;

const STAGES = [
  {
    name: "Outer Rim Patrol",
    palette: { top: "#02070f", bottom: "#0b1f3b", star: "rgba(126, 188, 255, 0.85)" },
    spawnDelay: [1.6, 2.4],
    duration: 65,
    scoreThreshold: 2000,
    bossIndex: 0,
  },
  {
    name: "Nebula Siege",
    palette: { top: "#040812", bottom: "#102447", star: "rgba(150, 206, 255, 0.9)" },
    spawnDelay: [1.2, 2.0],
    duration: 80,
    scoreThreshold: 4200,
    bossIndex: 1,
  },
  {
    name: "Nightfall Offensive",
    palette: { top: "#05040b", bottom: "#131d38", star: "rgba(180, 220, 255, 0.92)" },
    spawnDelay: [0.9, 1.6],
    duration: 90,
    scoreThreshold: 7600,
    bossIndex: 2,
  },
];

export class GameplayScene {
  constructor(game, difficulty = DIFFICULTY_PRESETS[1]) {
    this.game = game;
    this.difficulty = difficulty ?? DIFFICULTY_PRESETS[1];
    this.starfield = new Starfield(game, 220);
    this.starfield.setBrightness(0.5);
    this.players = Array.from({ length: PLAYER_COUNT }, (_, index) => new Player(game, { playerIndex: index }));
    this.playerLives = Array.from({ length: PLAYER_COUNT }, () => PLAYER_MAX_LIVES);
    this.playerBombs = this.players.map((player) => player.bombCapacity);
    this.bombTimers = new Array(PLAYER_COUNT).fill(0);
    this.activePlayerCount = PLAYER_COUNT;
    this.score = 0;
    this.time = 0;
    this.stageIndex = 0;
    this.stageTime = 0;
    this.waveTimer = 0;
    this.spawnDelay = 2;
    this.boss = null;
    this.bossWarningTimer = 0;
    this.bossSpawned = false;
    this.bombFlashTimer = 0;
    this.levelBannerTimer = 0;
    this.levelBannerText = "";
    this.levelBannerSubtitle = "";
    this.currentStarColor = null;
    this.paused = false;
    this.bossCycleIndex = 0;

    this.playerBullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.effects = [];
    this.powerUps = [];

    resetBossPaletteCycle();
    this.applyStagePalette(STAGES[this.stageIndex]);
    this.layoutPlayers();
    this.players.forEach((player) => player.reset());
    this.spawnDelay = randRange(...STAGES[this.stageIndex].spawnDelay) * this.difficulty.spawnDelayMultiplier;
    this.game.audio.setMusicStage(0);
  }

  onResize() {
    this.starfield.onResize();
    this.layoutPlayers();
    this.players.forEach((player, index) => {
      if (this.playerLives[index] > 0) {
        player.reset();
        player.invulnerableTimer = 1.5;
      } else {
        player.eliminate();
      }
    });
    this.activePlayerCount = this.getActivePlayers().length;
  }

  update(dt) {
    const input = this.game.input;

    if (input.wasKeyPressed("KeyR")) {
      this.restartScene();
      return;
    }

    if (input.wasKeyPressed("KeyP")) {
      this.paused = !this.paused;
      if (!this.paused) {
        this.game.audio.resume();
      }
    }

    if (input.wasKeyPressed("KeyN")) {
      this.game.audio.toggleMute();
    }

    if (this.paused) {
      this.starfield.update(dt * 0.5);
      return;
    }

    this.time += dt;
    this.stageTime += dt;
    this.starfield.update(dt);
    if (this.levelBannerTimer > 0) {
      this.levelBannerTimer = Math.max(0, this.levelBannerTimer - dt);
    }

    const activePlayers = this.getActivePlayers();
    this.activePlayerCount = activePlayers.length;
    const playerRefs = activePlayers.map(({ player }) => player);
    for (const { player } of activePlayers) {
      const fired = player.update(dt, input);
      if (fired.length) {
        this.playerBullets.push(...fired);
      }
    }

    this.handleBombInput(dt, activePlayers);

    this.waveTimer += dt;
    if (!this.boss && this.stageTime < 30 && this.waveTimer >= this.spawnDelay) {
      this.waveTimer = 0;
      this.spawnWave();
      this.spawnDelay = randRange(...STAGES[this.stageIndex].spawnDelay) * this.difficulty.spawnDelayMultiplier;
    }

    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      const shots = enemy.update(dt);
      if (shots) {
        if (Array.isArray(shots)) {
          this.enemyBullets.push(...shots);
        } else {
          this.enemyBullets.push(shots);
        }
      }
      if (enemy.isOffscreen(this.game.height)) {
        this.enemies.splice(i, 1);
      }
    }

    if (this.boss) {
      const { bullets, spawns } = this.boss.update(dt, playerRefs);
      if (bullets?.length) {
        this.enemyBullets.push(...bullets);
      }
      if (spawns?.length) {
        this.enemies.push(...spawns);
      }
      if (this.boss.isDefeated) {
        this.score += 4000;
        this.game.audio.playExplosion(1.1);
        this.effects.push(new Explosion(this.boss.x, this.boss.y, "#9fd6ff", 120));
        this.dropBossRewards();
        this.boss = null;
        this.advanceStage();
      }
    } else if (this.shouldSummonBoss()) {
      this.bossWarningTimer = 3;
      this.game.audio.playBossWarning();
      this.game.audio.setMusicStage(this.stageIndex + 1);
      this.bossSpawned = true;
      const bossIndex = this.bossCycleIndex % BOSS_COUNT;
      this.boss = new Boss(this.game, bossIndex, this.difficulty);
      this.bossCycleIndex = (this.bossCycleIndex + 1) % BOSS_COUNT;
    }

    if (this.bossWarningTimer > 0) {
      this.bossWarningTimer = Math.max(0, this.bossWarningTimer - dt);
    }

    updateBullets(this.playerBullets, dt, this.game.height);
    updateBullets(this.enemyBullets, dt, this.game.height);

    for (let i = this.powerUps.length - 1; i >= 0; i -= 1) {
      const powerUp = this.powerUps[i];
      const alive = powerUp.update(dt, this.game.height);
      if (!alive) {
        this.powerUps.splice(i, 1);
        continue;
      }
      for (const { index, player } of activePlayers) {
        const distSq = distanceSquared(powerUp.x, powerUp.y, player.x, player.y);
        if (distSq < (powerUp.radius + player.radius) ** 2) {
          const payload = player.applyPowerUp(powerUp.type);
          if (payload === "bomb") {
            this.playerBombs[index] = Math.min(player.bombCapacity, this.playerBombs[index] + 1);
          }
          this.game.audio.playPowerUp();
          this.effects.push(new Explosion(powerUp.x, powerUp.y, "#bdeaff", 36));
          this.powerUps.splice(i, 1);
          break;
        }
      }
    }

    this.handleCollisions(activePlayers);

    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      const alive = this.effects[i].update(dt);
      if (!alive) {
        this.effects.splice(i, 1);
      }
    }
  }

  handleBombInput(dt, activePlayers) {
    for (let i = 0; i < this.bombTimers.length; i += 1) {
      this.bombTimers[i] = Math.max(0, this.bombTimers[i] - dt);
    }
    if (this.bombFlashTimer > 0) {
      this.bombFlashTimer = Math.max(0, this.bombFlashTimer - dt);
    }
    const input = this.game.input;
    const doubleTap = input.consumeDoubleTap();
    for (const { index } of activePlayers) {
      if (this.playerBombs[index] <= 0 || this.bombTimers[index] > 0) continue;
      const requested = input.wasBombPressed(index) || (index === 0 && doubleTap);
      if (requested) {
        this.activateBomb(index);
      }
    }
  }

  activateBomb(playerIndex) {
    const player = this.players[playerIndex];
    if (!player || player.isEliminated) return;
    this.playerBombs[playerIndex] -= 1;
    this.bombTimers[playerIndex] = BOMB_COOLDOWN;
    this.bombFlashTimer = 0.6;
    this.game.audio.playBomb();
    this.game.audio.playExplosion(0.9);
    const flashColor = playerIndex === 0 ? "#9fd6ff" : "#7fb0ff";
    this.effects.push(new Explosion(player.x, player.y, flashColor, 160));
    for (const enemy of this.enemies) {
      this.effects.push(new Explosion(enemy.x, enemy.y, "#ffa26f", 80));
      this.score += enemy.scoreValue;
    }
    this.enemies = [];
    this.enemyBullets = [];
    if (this.boss) {
      const defeated = this.boss.takeHit(BOMB_DAMAGE);
      if (defeated) {
        this.score += 4000;
        this.effects.push(new Explosion(this.boss.x, this.boss.y, "#ffffff", 140));
        this.dropBossRewards();
        this.boss = null;
        this.advanceStage();
      }
    }
  }

  shouldSummonBoss() {
    return !this.boss && !this.bossSpawned && this.stageTime >= 30 && this.enemies.length === 0;
  }

  advanceStage() {
    const previousIndex = this.stageIndex;
    this.stageIndex = Math.min(this.stageIndex + 1, STAGES.length - 1);
    const stage = STAGES[this.stageIndex];
    this.stageTime = 0;
    this.waveTimer = 0;
    this.spawnDelay = randRange(...stage.spawnDelay) * this.difficulty.spawnDelayMultiplier;
    this.applyStagePalette(stage);
    this.game.audio.setMusicStage(this.stageIndex);
    this.bossSpawned = false;
    this.bossWarningTimer = 0;
    this.levelBannerTimer = 3.2;
    const levelNumber = this.stageIndex + 1;
    this.levelBannerText = "晉級到下一個 LEVEL";
    this.levelBannerSubtitle = `Level ${levelNumber}: ${stage.name}`;
    if (this.stageIndex === previousIndex && previousIndex === STAGES.length - 1) {
      this.levelBannerSubtitle = `${stage.name} — Final Push`;
    }
  }

  dropBossRewards() {
    if (!this.boss) return;
    for (const type of ["bomb", "spread", "laser", "speed", "shield"]) {
      this.powerUps.push(
        new PowerUp({
          x: this.boss.x + randRange(-60, 60),
          y: this.boss.y + randRange(-20, 40),
          type,
        }),
      );
    }
  }

  applyStagePalette(stage) {
    const nextStarColor = pickStarColor(this.currentStarColor);
    this.currentStarColor = nextStarColor;
    this.starfield.setPalette({ ...stage.palette, star: nextStarColor });
    this.starfield.setBrightness(0.5);
  }

  spawnWave() {
    switch (this.stageIndex) {
      case 0:
        this.spawnStageOneWave();
        break;
      case 1:
        this.spawnStageTwoWave();
        break;
      default:
        this.spawnStageThreeWave();
        break;
    }
  }

  spawnStageOneWave() {
    const width = this.game.width;
    const pattern = randChoice(["v", "zigzag", "column"]);
    if (pattern === "v") {
      const center = width / 2;
      for (let i = 0; i < 5; i += 1) {
        this.enemies.push(
          this.createEnemy({
            x: center + (i - 2) * 64,
            y: -80 - i * 46,
            amplitude: 18,
            frequency: 2.1,
            fireCooldown: 2.3,
            dropType: i === 2 ? "spread" : null,
          }),
        );
      }
    } else if (pattern === "zigzag") {
      const lanes = 4;
      for (let i = 0; i < lanes; i += 1) {
        this.enemies.push(
          this.createEnemy({
            x: (width / lanes) * (i + 0.5),
            y: -i * 70 - 60,
            amplitude: 46,
            frequency: 2.6 + i * 0.4,
            fireCooldown: 1.8,
            dropType: i === lanes - 1 ? "speed" : null,
          }),
        );
      }
    } else {
      const count = 6;
      for (let i = 0; i < count; i += 1) {
        this.enemies.push(
          this.createEnemy({
            x: ((i + 1) / (count + 1)) * width,
            y: -i * 50 - 70,
            amplitude: 0,
            fireCooldown: 1.5,
            dropType: i === 0 ? "bomb" : null,
          }),
        );
      }
    }
  }

  spawnStageTwoWave() {
    const width = this.game.width;
    const pattern = randChoice(["sweep", "spiral", "pincer", "striker"]);
    if (pattern === "sweep") {
      const count = 7;
      for (let i = 0; i < count; i += 1) {
        this.enemies.push(
          this.createEnemy({
            x: ((i + 0.5) / count) * width,
            y: -i * 60 - 80,
            amplitude: 48,
            frequency: 3.2,
            fireCooldown: 1.3,
            burst: 2,
            dropType: i === 3 ? "shield" : null,
          }),
        );
      }
    } else if (pattern === "spiral") {
      const center = width / 2;
      for (let i = 0; i < 8; i += 1) {
        this.enemies.push(
          this.createEnemy({
            x: center + Math.sin(i * 0.8) * 160,
            y: -i * 50 - 80,
            amplitude: 32,
            frequency: 4.2,
            fireCooldown: 1.4,
            burst: 3,
            dropType: i === 5 ? "laser" : i === 2 ? "speed" : null,
          }),
        );
      }
    } else if (pattern === "striker") {
      const lanes = 3;
      for (let i = 0; i < lanes; i += 1) {
        const direction = i % 2 === 0 ? -1 : 1;
        this.enemies.push(
          this.createEnemy({
            variant: "strafe",
            x: direction === -1 ? this.game.width - 80 : 80,
            y: -i * 80 - 100,
            speedY: 150,
            horizontalSpeed: 220,
            horizontalDirection: direction,
            fireCooldown: 1.1,
            burst: 3,
            scoreValue: 220,
            dropType: i === 1 ? "speed" : null,
          }),
        );
      }
    } else {
      const left = this.createEnemy({
        x: width * 0.28,
        y: -90,
        amplitude: 0,
        fireCooldown: 1.1,
        burst: 3,
        burstSpread: 0.35,
        health: 5,
        dropType: "bomb",
      });
      const right = this.createEnemy({
        x: width * 0.72,
        y: -120,
        amplitude: 0,
        fireCooldown: 1.1,
        burst: 3,
        burstSpread: 0.35,
        health: 5,
        dropType: "spread",
      });
      this.enemies.push(left, right);
    }
  }

  spawnStageThreeWave() {
    const width = this.game.width;
    const pattern = randChoice(["blade", "barrage", "spear", "bombing"]);
    if (pattern === "blade") {
      for (let i = 0; i < 9; i += 1) {
        this.enemies.push(
          this.createEnemy({
            x: ((i + 0.5) / 9) * width,
            y: -i * 44 - 90,
            amplitude: 52,
            frequency: 4.4,
            fireCooldown: 1.1,
            burst: 3,
            dropType: i % 3 === 0 ? randChoice(["speed", "shield"]) : null,
          }),
        );
      }
    } else if (pattern === "barrage") {
      const center = width / 2;
      for (let i = 0; i < 6; i += 1) {
        this.enemies.push(
          this.createEnemy({
            x: center + (i - 2.5) * 60,
            y: -i * 68 - 110,
            amplitude: 28,
            frequency: 5,
            fireCooldown: 0.95,
            burst: 4,
            burstSpread: 0.4,
            dropType: i === 2 ? "bomb" : null,
          }),
        );
      }
    } else if (pattern === "bombing") {
      const count = 5;
      for (let i = 0; i < count; i += 1) {
        this.enemies.push(
          this.createEnemy({
            variant: "bomber",
            x: ((i + 0.5) / count) * width,
            y: -i * 90 - 140,
            speedY: 130,
            fireCooldown: 1.7,
            wobbleAmplitude: 50,
            wobbleFrequency: 1.1,
            health: 5,
            scoreValue: 260,
            dropType: i === 2 ? "bomb" : null,
          }),
        );
      }
    } else {
      const spearCount = 3;
      for (let i = 0; i < spearCount; i += 1) {
        this.enemies.push(
          this.createEnemy({
            x: width * ((i + 1) / (spearCount + 1)),
            y: -i * 80 - 120,
            amplitude: 0,
            fireCooldown: 0.85,
            burst: 4,
            burstSpread: 0.5,
            health: 6,
            speedY: 150,
            dropType: i === 1 ? "laser" : i === 0 ? "spread" : null,
          }),
        );
      }
    }
  }

  createEnemy(config) {
    const baseHealth = config.health ?? 3;
    const baseBurst = config.burst ?? 1;
    const baseCooldown = config.fireCooldown ?? 1.6;
    const variant = config.variant;
    const health = Math.max(1, Math.round(baseHealth * this.difficulty.enemyHealthMultiplier));
    const burst = Math.max(1, Math.round(baseBurst + this.difficulty.enemyExtraProjectiles));
    const fireCooldown = baseCooldown / this.difficulty.enemyFireRateMultiplier;
    const { variant: _ignoredVariant, ...enemyConfig } = config;
    const sharedConfig = {
      bounds: this.game,
      ...enemyConfig,
      health,
      burst,
      fireCooldown,
    };
    switch (variant) {
      case "strafe":
        return new StrafeEnemy(sharedConfig);
      case "bomber":
        return new BomberEnemy(sharedConfig);
      default:
        return new Enemy(sharedConfig);
    }
  }

  handleCollisions(activePlayers) {
    for (let i = this.playerBullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.playerBullets[i];
      let hit = false;
      if (this.boss) {
        const distSq = distanceSquared(bullet.x, bullet.y, this.boss.x, this.boss.y);
        if (distSq <= (this.boss.radius + bullet.radius) ** 2) {
          this.playerBullets.splice(i, 1);
          const defeated = this.boss.takeHit(bullet.damage ?? 1);
          this.game.audio.playExplosion(0.4);
          this.effects.push(new Explosion(bullet.x, bullet.y, "#9fd6ff", 44));
          if (defeated) {
            this.score += 4000;
            this.effects.push(new Explosion(this.boss.x, this.boss.y, "#ffffff", 140));
            this.dropBossRewards();
            this.boss = null;
            this.advanceStage();
          }
          hit = true;
        }
      }
      if (hit) continue;
      for (let j = this.enemies.length - 1; j >= 0; j -= 1) {
        const enemy = this.enemies[j];
        const distanceSq = distanceSquared(bullet.x, bullet.y, enemy.x, enemy.y);
        const radii = bullet.radius + enemy.radius;
        if (distanceSq <= radii * radii) {
          this.playerBullets.splice(i, 1);
          const defeated = enemy.takeHit(bullet.damage ?? 1);
          this.effects.push(new Explosion(enemy.x, enemy.y, "#ffa26f", 42));
          if (defeated) {
            this.enemies.splice(j, 1);
            this.score += enemy.scoreValue;
            this.game.audio.playExplosion(0.5);
            if (enemy.dropType) {
              this.powerUps.push(new PowerUp({ x: enemy.x, y: enemy.y, type: enemy.dropType }));
            } else if (Math.random() < 0.032) {
              const types = ["bomb", "spread", "laser", "speed", "shield"];
              this.powerUps.push(new PowerUp({ x: enemy.x, y: enemy.y, type: randChoice(types) }));
            }
          }
          hit = true;
          break;
        }
      }
    }

    if (activePlayers.length === 0) {
      return;
    }

    for (let i = this.enemyBullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.enemyBullets[i];
      let hit = false;
      for (const { index, player } of activePlayers) {
        if (player.isInvulnerable || player.isEliminated) continue;
        const distanceSq = distanceSquared(bullet.x, bullet.y, player.x, player.y);
        const radii = bullet.radius + player.radius * 0.8;
        if (distanceSq <= radii * radii) {
          this.enemyBullets.splice(i, 1);
          this.registerPlayerHit(index, bullet.damage ?? 1);
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }

    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      let collided = false;
      for (const { index, player } of activePlayers) {
        if (player.isInvulnerable || player.isEliminated) continue;
        const distanceSq = distanceSquared(enemy.x, enemy.y, player.x, player.y);
        if (distanceSq <= PLAYER_COLLISION_RADIUS * PLAYER_COLLISION_RADIUS) {
          this.effects.push(new Explosion(enemy.x, enemy.y, "#ffa26f", 48));
          this.enemies.splice(i, 1);
          this.score += enemy.scoreValue;
          this.game.audio.playExplosion(0.6);
          this.registerPlayerHit(index);
          collided = true;
          break;
        }
      }
      if (collided) {
        continue;
      }
    }

    if (this.boss) {
      for (const { index, player } of activePlayers) {
        if (player.isInvulnerable || player.isEliminated) continue;
        const distSq = distanceSquared(player.x, player.y, this.boss.x, this.boss.y);
        if (distSq <= (this.boss.radius * 0.75 + player.radius) ** 2) {
          this.registerPlayerHit(index, 2);
        }
      }
    }
  }

  registerPlayerHit(playerIndex, damage = 1) {
    const player = this.players[playerIndex];
    if (!player || player.isInvulnerable || player.isEliminated) return;
    player.takeHit(damage);
    this.game.audio.playHit();
    this.effects.push(new Explosion(player.x, player.y, playerIndex === 0 ? "#8ef0ff" : "#7fb0ff", 60));
    if (player.health <= 0) {
      this.playerLives[playerIndex] -= 1;
      if (this.playerLives[playerIndex] <= 0) {
        player.eliminate();
        this.activePlayerCount = Math.max(0, this.activePlayerCount - 1);
        if (this.activePlayerCount <= 0) {
          this.game.setScene(new DebriefScene(this.game, { score: this.score }));
        }
        return;
      }
      player.reset();
      player.invulnerableTimer = 2;
      this.playerBombs[playerIndex] = player.bombCapacity;
      this.bombTimers[playerIndex] = 0;
    }
  }

  render(ctx) {
    this.starfield.render(ctx, this.time * 1000);

    if (this.boss) {
      this.boss.render(ctx);
    }

    renderBullets(ctx, this.enemyBullets);
    for (const enemy of this.enemies) {
      enemy.render(ctx);
    }

    renderBullets(ctx, this.playerBullets);
    for (const player of this.players) {
      player.render(ctx);
    }

    for (const powerUp of this.powerUps) {
      powerUp.render(ctx);
    }

    for (const effect of this.effects) {
      effect.render(ctx);
    }

    this.renderHud(ctx);

    if (this.paused) {
      ctx.save();
      ctx.fillStyle = "rgba(5, 8, 16, 0.6)";
      ctx.fillRect(0, 0, this.game.width, this.game.height);
      ctx.fillStyle = "#f8fbff";
      ctx.font = `700 ${Math.max(42, this.game.width * 0.06)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", this.game.width / 2, this.game.height / 2);
      ctx.font = `400 ${Math.max(18, this.game.width * 0.028)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.fillText("Press P to resume", this.game.width / 2, this.game.height / 2 + 42);
      ctx.restore();
    }
  }

  renderHud(ctx) {
    ctx.save();
    const hudHeight = 156;
    ctx.fillStyle = "rgba(5, 8, 16, 0.62)";
    ctx.fillRect(12, 12, this.game.width - 24, hudHeight);

    ctx.fillStyle = "#f8fbff";
    ctx.font = `600 ${Math.max(22, this.game.width * 0.035)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${this.score}`, 24, 48);

    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.font = `500 ${Math.max(18, this.game.width * 0.028)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText(`Stage: ${STAGES[this.stageIndex].name} (${this.difficulty.label})`, 24, 78);

    this.renderMetadata(ctx);
    this.renderPlayerPanels(ctx, 24, 96, this.game.width - 48);
    this.renderAudioHint(ctx);

    if (this.boss) {
      this.renderBossHealth(ctx);
    } else if (this.bossWarningTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.sin(this.bossWarningTimer * 10) * 0.25 + 0.55;
      ctx.fillStyle = "#ff6b6b";
      ctx.font = `700 ${Math.max(26, this.game.width * 0.04)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("BOSS INBOUND", this.game.width / 2, this.game.height * 0.22);
      ctx.restore();
    }

    if (this.bombFlashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = this.bombFlashTimer * 0.8;
      ctx.fillStyle = "rgba(120, 200, 255, 0.35)";
      ctx.fillRect(0, 0, this.game.width, this.game.height);
      ctx.restore();
    }

    if (this.levelBannerTimer > 0) {
      this.renderLevelBanner(ctx);
    }

    ctx.restore();
  }

  renderPlayerPanels(ctx, startX, y, width) {
    const panelHeight = 58;
    const panelWidth = Math.min(240, width / PLAYER_COUNT - 16);
    const spacing = PLAYER_COUNT > 1 ? (width - panelWidth * PLAYER_COUNT) / (PLAYER_COUNT - 1) : 0;
    for (let i = 0; i < PLAYER_COUNT; i += 1) {
      const x = startX + i * (panelWidth + spacing);
      this.renderPlayerPanel(ctx, i, x, y, panelWidth, panelHeight);
    }
  }

  renderPlayerPanel(ctx, index, x, y, width, height) {
    const player = this.players[index];
    const lives = this.playerLives[index];
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    ctx.font = `600 ${Math.max(14, this.game.width * 0.022)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(`P${index + 1}`, 10, 18);
    ctx.font = `400 ${Math.max(12, this.game.width * 0.018)}px 'Inter', 'Segoe UI', sans-serif`;
    const controlText = index === 0 ? "WASD • Bomb V" : "Arrow Keys • Bomb M";
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillText(controlText, 10, 34);

    if (player.isEliminated || lives <= 0) {
      ctx.fillStyle = "rgba(255, 120, 120, 0.75)";
      ctx.font = `600 ${Math.max(16, this.game.width * 0.024)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText("DOWN", width - 10, 20);
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.font = `500 ${Math.max(14, this.game.width * 0.02)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText(`Lives ${lives}`, width - 10, 18);
    }

    ctx.textAlign = "left";
    ctx.translate(0, height - 20);
    const barWidth = width - 80;
    const barHeight = 10;
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fillRect(10, 0, barWidth, barHeight);
    const health = player.isEliminated ? 0 : player.health;
    const segmentWidth = (barWidth - (HEALTH_PER_LIFE - 1) * 2) / HEALTH_PER_LIFE;
    for (let i = 0; i < HEALTH_PER_LIFE; i += 1) {
      ctx.fillStyle = i < health ? "#ff5f5f" : "rgba(255, 255, 255, 0.25)";
      ctx.fillRect(10 + i * (segmentWidth + 2), 0, segmentWidth, barHeight);
    }

    const bombBaseX = 10 + barWidth + 12;
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    for (let i = 0; i < player.bombCapacity; i += 1) {
      ctx.beginPath();
      ctx.arc(bombBaseX + i * 16, barHeight / 2, 6, 0, Math.PI * 2);
      ctx.fillStyle = i < this.playerBombs[index] ? "#ffcf5a" : "rgba(255, 255, 255, 0.25)";
      ctx.fill();
    }

    ctx.restore();
  }

  renderBossHealth(ctx) {
    ctx.save();
    const width = this.game.width - 120;
    const height = 16;
    const x = 60;
    const y = 12 + 156 + 12;
    ctx.fillStyle = "rgba(5, 8, 16, 0.72)";
    ctx.fillRect(x, y, width, height + 24);
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.font = `600 ${Math.max(20, this.game.width * 0.03)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("Boss Hull", this.game.width / 2, y + 20);
    const ratio = this.boss.health / this.boss.maxHealth;
    ctx.fillStyle = "#4fa8ff";
    ctx.fillRect(x + 12, y + 28, (width - 24) * ratio, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 12, y + 28, width - 24, height);
    ctx.restore();
  }

  renderAudioHint(ctx) {
    ctx.save();
    const enabled = this.game.audio.enabled;
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = `400 ${Math.max(14, this.game.width * 0.022)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(
      `BGM: ${enabled ? "ON" : "OFF"} (N) • Pause (P) • Restart (R)`,
      this.game.width - 24,
      this.game.height - 24,
    );
    ctx.restore();
  }

  renderMetadata(ctx) {
    ctx.save();
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.font = `600 ${Math.max(18, this.game.width * 0.028)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText("Cliff Wang", this.game.width - 24, 40);
    ctx.font = `400 ${Math.max(14, this.game.width * 0.022)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillText("v1.0 • 2024-05-01", this.game.width - 24, 64);
    ctx.restore();
  }

  renderLevelBanner(ctx) {
    ctx.save();
    const progress = Math.min(1, this.levelBannerTimer / 3.2);
    ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.85;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = `700 ${Math.max(36, this.game.width * 0.06)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(this.levelBannerText, this.game.width / 2, this.game.height * 0.26);
    ctx.font = `500 ${Math.max(18, this.game.width * 0.03)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText(this.levelBannerSubtitle, this.game.width / 2, this.game.height * 0.32 + 28);
    ctx.restore();
  }

  getActivePlayers() {
    const active = [];
    for (let i = 0; i < PLAYER_COUNT; i += 1) {
      if (this.playerLives[i] > 0 && !this.players[i].isEliminated) {
        active.push({ index: i, player: this.players[i] });
      }
    }
    return active;
  }

  layoutPlayers() {
    const baselineY = this.game.height - 96;
    const spacing = this.game.width / (PLAYER_COUNT + 1);
    for (let i = 0; i < PLAYER_COUNT; i += 1) {
      const player = this.players[i];
      const spawnX = spacing * (i + 1);
      player.setSpawnPosition(spawnX, baselineY);
    }
  }

  restartScene() {
    this.game.setScene(new GameplayScene(this.game, this.difficulty));
  }
}

function pickStarColor(previousColor) {
  let selection = randChoice(STAR_COLOR_CHOICES);
  if (STAR_COLOR_CHOICES.length > 1) {
    let guard = 0;
    while (selection === previousColor && guard < 5) {
      selection = randChoice(STAR_COLOR_CHOICES);
      guard += 1;
    }
  }
  return selection;
}

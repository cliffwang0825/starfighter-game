import { Explosion } from "../effects/explosion.js";
import { Starfield } from "../effects/starfield.js";
import { updateBullets, renderBullets } from "../entities/bullet.js";
import { Enemy } from "../entities/enemy.js";
import { Player } from "../entities/player.js";
import { PowerUp } from "../entities/powerup.js";
import { Boss } from "../entities/bosses.js";
import { distanceSquared, randChoice, randRange } from "../utils.js";
import { DebriefScene } from "./debriefScene.js";

const PLAYER_MAX_LIVES = 3;
const COLLISION_RADIUS = 32;
const HEALTH_PER_LIFE = 3;
const BOMB_DAMAGE = 18;
const BOMB_COOLDOWN = 0.8;

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
  constructor(game) {
    this.game = game;
    this.starfield = new Starfield(game, 220);
    this.player = new Player(game);
    this.playerLives = PLAYER_MAX_LIVES;
    this.playerBombs = this.player.bombCapacity;
    this.score = 0;
    this.time = 0;
    this.stageIndex = 0;
    this.stageTime = 0;
    this.waveTimer = 0;
    this.spawnDelay = 2;
    this.boss = null;
    this.bossWarningTimer = 0;
    this.bombTimer = 0;
    this.bombFlashTimer = 0;

    this.playerBullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.effects = [];
    this.powerUps = [];

    this.starfield.setPalette(STAGES[this.stageIndex].palette);
    this.spawnDelay = randRange(...STAGES[this.stageIndex].spawnDelay);
    this.game.audio.setMusicStage(0);
  }

  onResize() {
    this.starfield.onResize();
    this.player.reset();
  }

  update(dt) {
    this.time += dt;
    this.stageTime += dt;
    this.starfield.update(dt);

    const fired = this.player.update(dt, this.game.input);
    this.playerBullets.push(...fired);

    this.handleBombInput(dt);

    if (this.game.input.wasKeyPressed("KeyM")) {
      this.game.audio.toggleMute();
    }

    this.waveTimer += dt;
    if (!this.boss && this.waveTimer >= this.spawnDelay) {
      this.waveTimer = 0;
      this.spawnWave();
      this.spawnDelay = randRange(...STAGES[this.stageIndex].spawnDelay);
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
      const { bullets, spawns } = this.boss.update(dt, this.player);
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
      this.boss = new Boss(this.game, this.stageIndex);
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
      const distSq = distanceSquared(powerUp.x, powerUp.y, this.player.x, this.player.y);
      if (distSq < (powerUp.radius + this.player.radius) ** 2) {
        const payload = this.player.applyPowerUp(powerUp.type);
        if (payload === "bomb") {
          this.playerBombs = Math.min(this.player.bombCapacity, this.playerBombs + 1);
        }
        this.game.audio.playPowerUp();
        this.effects.push(new Explosion(powerUp.x, powerUp.y, "#bdeaff", 36));
        this.powerUps.splice(i, 1);
      }
    }

    this.handleCollisions();

    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      const alive = this.effects[i].update(dt);
      if (!alive) {
        this.effects.splice(i, 1);
      }
    }
  }

  handleBombInput(dt) {
    if (this.bombTimer > 0) {
      this.bombTimer = Math.max(0, this.bombTimer - dt);
    }
    if (this.bombFlashTimer > 0) {
      this.bombFlashTimer = Math.max(0, this.bombFlashTimer - dt);
    }
    const input = this.game.input;
    const bombRequested =
      input.wasKeyPressed("KeyX") ||
      input.wasKeyPressed("KeyB") ||
      input.wasKeyPressed("ShiftLeft") ||
      input.consumeDoubleTap();
    if (bombRequested && this.playerBombs > 0 && this.bombTimer <= 0) {
      this.activateBomb();
    }
  }

  activateBomb() {
    this.playerBombs -= 1;
    this.bombTimer = BOMB_COOLDOWN;
    this.bombFlashTimer = 0.6;
    this.game.audio.playBomb();
    this.game.audio.playExplosion(0.9);
    this.effects.push(new Explosion(this.player.x, this.player.y, "#9fd6ff", 160));
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
    const stage = STAGES[this.stageIndex];
    return (
      !this.boss &&
      (this.stageTime >= stage.duration || this.score >= stage.scoreThreshold) &&
      this.enemies.length === 0
    );
  }

  advanceStage() {
    this.stageIndex = Math.min(this.stageIndex + 1, STAGES.length - 1);
    const stage = STAGES[this.stageIndex];
    this.stageTime = 0;
    this.waveTimer = 0;
    this.spawnDelay = randRange(...stage.spawnDelay);
    this.starfield.setPalette(stage.palette);
    this.game.audio.setMusicStage(this.stageIndex);
  }

  dropBossRewards() {
    if (!this.boss) return;
    for (const type of ["bomb", "spread", "speed", "shield"]) {
      this.powerUps.push(
        new PowerUp({
          x: this.boss.x + randRange(-60, 60),
          y: this.boss.y + randRange(-20, 40),
          type,
        }),
      );
    }
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
    const pattern = randChoice(["sweep", "spiral", "pincer"]);
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
            dropType: i === 5 ? "speed" : null,
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
    const pattern = randChoice(["blade", "barrage", "spear"]);
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
            dropType: i === 1 ? "spread" : null,
          }),
        );
      }
    }
  }

  createEnemy(config) {
    const enemy = new Enemy({
      bounds: this.game,
      ...config,
    });
    return enemy;
  }

  handleCollisions() {
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
            } else if (Math.random() < 0.08) {
              const types = ["bomb", "spread", "speed", "shield"];
              this.powerUps.push(new PowerUp({ x: enemy.x, y: enemy.y, type: randChoice(types) }));
            }
          }
          hit = true;
          break;
        }
      }
    }

    if (!this.player.isInvulnerable) {
      for (let i = this.enemyBullets.length - 1; i >= 0; i -= 1) {
        const bullet = this.enemyBullets[i];
        const distanceSq = distanceSquared(bullet.x, bullet.y, this.player.x, this.player.y);
        const radii = bullet.radius + this.player.radius * 0.8;
        if (distanceSq <= radii * radii) {
          this.enemyBullets.splice(i, 1);
          this.registerPlayerHit(bullet.damage ?? 1);
          break;
        }
      }

      for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
        const enemy = this.enemies[i];
        const distanceSq = distanceSquared(enemy.x, enemy.y, this.player.x, this.player.y);
        if (distanceSq <= COLLISION_RADIUS * COLLISION_RADIUS) {
          this.effects.push(new Explosion(enemy.x, enemy.y, "#ffa26f", 48));
          this.enemies.splice(i, 1);
          this.score += enemy.scoreValue;
          this.game.audio.playExplosion(0.6);
          this.registerPlayerHit();
          break;
        }
      }

      if (this.boss) {
        const distSq = distanceSquared(this.player.x, this.player.y, this.boss.x, this.boss.y);
        if (distSq <= (this.boss.radius * 0.75 + this.player.radius) ** 2) {
          this.registerPlayerHit(2);
        }
      }
    }
  }

  registerPlayerHit(damage = 1) {
    if (this.player.isInvulnerable) return;
    this.player.takeHit(damage);
    this.game.audio.playHit();
    this.effects.push(new Explosion(this.player.x, this.player.y, "#8ef0ff", 60));
    if (this.player.health <= 0) {
      this.playerLives -= 1;
      if (this.playerLives <= 0) {
        this.game.setScene(new DebriefScene(this.game, { score: this.score }));
        return;
      }
      this.player.reset();
      this.player.invulnerableTimer = 2;
      this.playerBombs = this.player.bombCapacity;
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
    this.player.render(ctx);

    for (const powerUp of this.powerUps) {
      powerUp.render(ctx);
    }

    for (const effect of this.effects) {
      effect.render(ctx);
    }

    this.renderHud(ctx);
  }

  renderHud(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(5, 8, 16, 0.62)";
    ctx.fillRect(12, 12, this.game.width - 24, 78);

    ctx.fillStyle = "#f8fbff";
    ctx.font = `600 ${Math.max(22, this.game.width * 0.035)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${this.score}`, 24, 48);

    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.font = `500 ${Math.max(18, this.game.width * 0.028)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText(`Stage: ${STAGES[this.stageIndex].name}`, 24, 78);

    this.renderLives(ctx);
    this.renderHealth(ctx);
    this.renderBombs(ctx);
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

    ctx.restore();
  }

  renderLives(ctx) {
    const iconSize = 18;
    ctx.save();
    ctx.translate(this.game.width - 160, 26);
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    ctx.font = `500 ${Math.max(16, this.game.width * 0.024)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText("Lives", 0, 0);
    for (let i = 0; i < this.playerLives; i += 1) {
      ctx.save();
      ctx.translate(i * (iconSize + 16), 16);
      ctx.scale(iconSize / 22, iconSize / 22);
      ctx.fillStyle = "#d51928";
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(12, 16);
      ctx.lineTo(0, 12);
      ctx.lineTo(-12, 16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  renderHealth(ctx) {
    const barWidth = 180;
    const barHeight = 14;
    const x = 24;
    const y = 60;
    ctx.save();
    ctx.translate(this.game.width - 220, 42);
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    ctx.font = `500 ${Math.max(16, this.game.width * 0.024)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText("Hull", 0, 0);
    ctx.translate(0, 16);
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(0, 0, barWidth, barHeight);
    const segmentWidth = barWidth / HEALTH_PER_LIFE;
    for (let i = 0; i < HEALTH_PER_LIFE; i += 1) {
      ctx.fillStyle = i < this.player.health ? "#ff5f5f" : "rgba(255, 255, 255, 0.25)";
      ctx.fillRect(i * segmentWidth + 1, 2, segmentWidth - 2, barHeight - 4);
    }
    ctx.restore();
  }

  renderBombs(ctx) {
    ctx.save();
    ctx.translate(24, this.game.height - 32);
    ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
    ctx.font = `500 ${Math.max(16, this.game.width * 0.024)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText("Bombs", 0, 0);
    ctx.translate(0, 6);
    for (let i = 0; i < this.player.bombCapacity; i += 1) {
      ctx.save();
      ctx.translate(i * 36, 12);
      ctx.fillStyle = i < this.playerBombs ? "#ffcf5a" : "rgba(255, 255, 255, 0.25)";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.font = `700 ${10}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("B", 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  renderBossHealth(ctx) {
    ctx.save();
    const width = this.game.width - 120;
    const height = 16;
    const x = 60;
    const y = 108;
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
    ctx.fillText(`BGM: ${enabled ? "ON" : "OFF"} (M)`, this.game.width - 24, this.game.height - 24);
    ctx.restore();
  }
}

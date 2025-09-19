import { Explosion } from "../effects/explosion.js";
import { Starfield } from "../effects/starfield.js";
import { updateBullets, renderBullets } from "../entities/bullet.js";
import { Enemy } from "../entities/enemy.js";
import { Player } from "../entities/player.js";
import { clamp, distanceSquared, randChoice } from "../utils.js";
import { DebriefScene } from "./debriefScene.js";

const PLAYER_MAX_LIVES = 3;
const COLLISION_RADIUS = 28;

export class GameplayScene {
  constructor(game) {
    this.game = game;
    this.starfield = new Starfield(game, 200);
    this.player = new Player(game);
    this.playerLives = PLAYER_MAX_LIVES;
    this.score = 0;
    this.time = 0;

    this.playerBullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.effects = [];
    this.waveTimer = 0;
    this.waveIndex = 0;
    this.spawnDelay = 2.5;
  }

  onResize() {
    this.starfield.onResize();
    this.player.reset();
  }

  spawnWave() {
    const width = this.game.width;
    const patterns = [
      () => {
        const count = clamp(Math.floor(width / 120), 3, 7);
        for (let i = 0; i < count; i += 1) {
          const x = ((i + 1) / (count + 1)) * width;
          this.enemies.push(
            new Enemy({
              x,
              y: -80 - i * 36,
              amplitude: 26,
              frequency: 2.4,
              bounds: this.game,
              fireCooldown: 2.2,
            }),
          );
        }
      },
      () => {
        const lanes = 4;
        for (let i = 0; i < lanes; i += 1) {
          this.enemies.push(
            new Enemy({
              x: (width / lanes) * (i + 0.5),
              y: -i * 80 - 60,
              amplitude: 44,
              frequency: 3 + i * 0.4,
              bounds: this.game,
              fireCooldown: 1.6,
            }),
          );
        }
      },
      () => {
        const count = 6;
        const center = width / 2;
        for (let i = 0; i < count; i += 1) {
          this.enemies.push(
            new Enemy({
              x: center + (i - count / 2) * 52,
              y: -i * 50 - 80,
              amplitude: 0,
              bounds: this.game,
              fireCooldown: 1.2,
            }),
          );
        }
      },
    ];

    randChoice(patterns)();
    this.waveIndex += 1;
    this.spawnDelay = Math.max(1.2, 2.8 - this.waveIndex * 0.12);
  }

  update(dt) {
    this.time += dt;
    this.starfield.update(dt);

    const fired = this.player.update(dt, this.game.input);
    this.playerBullets.push(...fired);

    this.waveTimer += dt;
    if (this.waveTimer >= this.spawnDelay) {
      this.waveTimer = 0;
      this.spawnWave();
    }

    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      const shot = enemy.update(dt);
      if (shot) {
        this.enemyBullets.push(shot);
      }
      if (enemy.isOffscreen(this.game.height)) {
        this.enemies.splice(i, 1);
      }
    }

    updateBullets(this.playerBullets, dt, this.game.height);
    updateBullets(this.enemyBullets, dt, this.game.height);

    this.handleCollisions();

    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      const alive = this.effects[i].update(dt);
      if (!alive) {
        this.effects.splice(i, 1);
      }
    }
  }

  handleCollisions() {
    // Player bullets vs enemies
    for (let i = this.playerBullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.playerBullets[i];
      for (let j = this.enemies.length - 1; j >= 0; j -= 1) {
        const enemy = this.enemies[j];
        const distanceSq = distanceSquared(bullet.x, bullet.y, enemy.x, enemy.y);
        const radii = bullet.radius + enemy.radius;
        if (distanceSq <= radii * radii) {
          this.playerBullets.splice(i, 1);
          const defeated = enemy.takeHit();
          if (defeated) {
            this.effects.push(new Explosion(enemy.x, enemy.y));
            this.enemies.splice(j, 1);
            this.score += enemy.scoreValue;
          }
          break;
        }
      }
    }

    // Enemy bullets vs player
    if (!this.player.isInvulnerable) {
      for (let i = this.enemyBullets.length - 1; i >= 0; i -= 1) {
        const bullet = this.enemyBullets[i];
        const distanceSq = distanceSquared(bullet.x, bullet.y, this.player.x, this.player.y);
        const radii = bullet.radius + this.player.radius * 0.8;
        if (distanceSq <= radii * radii) {
          this.enemyBullets.splice(i, 1);
          this.registerPlayerHit();
          break;
        }
      }
    }

    // Player vs enemies
    if (!this.player.isInvulnerable) {
      for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
        const enemy = this.enemies[i];
        const distanceSq = distanceSquared(enemy.x, enemy.y, this.player.x, this.player.y);
        if (distanceSq <= COLLISION_RADIUS * COLLISION_RADIUS) {
          this.effects.push(new Explosion(enemy.x, enemy.y));
          this.enemies.splice(i, 1);
          this.score += enemy.scoreValue;
          this.registerPlayerHit();
          break;
        }
      }
    }
  }

  registerPlayerHit() {
    if (this.player.isInvulnerable) return;

    this.playerLives -= 1;
    this.player.takeHit();
    this.effects.push(new Explosion(this.player.x, this.player.y, "#8ef0ff"));
    this.player.reset();
    if (this.playerLives <= 0) {
      this.game.setScene(new DebriefScene(this.game, { score: this.score }));
    }
  }

  render(ctx) {
    this.starfield.render(ctx, this.time * 1000);

    renderBullets(ctx, this.enemyBullets);
    for (const enemy of this.enemies) {
      enemy.render(ctx);
    }

    renderBullets(ctx, this.playerBullets);
    this.player.render(ctx);

    for (const effect of this.effects) {
      effect.render(ctx);
    }

    this.renderHud(ctx);
  }

  renderHud(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(5, 8, 16, 0.5)";
    ctx.fillRect(12, 12, this.game.width - 24, 48);

    ctx.fillStyle = "#f8fbff";
    ctx.font = `600 ${Math.max(20, this.game.width * 0.03)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${this.score}`, 24, 42);

    ctx.textAlign = "right";
    ctx.font = `500 ${Math.max(18, this.game.width * 0.025)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fillText(`Lives: ${this.playerLives}`, this.game.width - 24, 40);
    ctx.restore();
  }
}

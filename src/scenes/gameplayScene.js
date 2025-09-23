import { Explosion } from "../effects/explosion.js";
import { BombWave } from "../effects/bombWave.js";
import { Starfield } from "../effects/starfield.js";
import { updateBullets, renderBullets } from "../entities/bullet.js";
import { Enemy, StrafeEnemy, BomberEnemy } from "../entities/enemy.js";
import { Player } from "../entities/player.js";
import { PowerUp } from "../entities/powerup.js";
import {
  Boss,
  resetBossPaletteCycle,
  BOSS_COUNT,
  createFinalBoss,
  FINAL_BOSS_ID,
} from "../entities/bosses.js";
import { distanceSquared, randChoice, randRange, maybeDropFrom, maybeDropType } from "../utils.js";
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
const BOMB_BLAST_RADIUS = 480;
const BOMB_COOLDOWN = 0.8;
const MAX_PLAYER_COUNT = 2;
const LEVEL_BANNER_DURATION = 2;
const FINAL_WARNING_DURATION = 4;
const FINAL_TRANSITION_TIME = 3.5;
const FINAL_SPACE_PALETTE = {
  top: "#04000c",
  bottom: "#1b001c",
  star: "rgba(255, 102, 160, 0.9)",
};

const BOSS_ENTRY_DELAY = 10;
const WAVE_DURATION = 10;
const MISSION_COMPLETE_DURATION = 2;
const FINAL_BOSS_TRIGGER = 10;

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
  constructor(game, difficulty = DIFFICULTY_PRESETS[1], playerCount = MAX_PLAYER_COUNT) {
    this.game = game;
    this.difficulty = difficulty ?? DIFFICULTY_PRESETS[1];
    this.difficultyTier = DIFFICULTY_PRESETS.findIndex((preset) => preset.id === this.difficulty.id);
    if (this.difficultyTier < 0) {
      this.difficultyTier = DIFFICULTY_PRESETS.findIndex((preset) => preset.label === this.difficulty.label);
    }
    if (this.difficultyTier < 0) {
      this.difficultyTier = 1;
      this.difficulty = DIFFICULTY_PRESETS[this.difficultyTier];
    }
    this.playerCount = Math.max(1, Math.min(MAX_PLAYER_COUNT, Math.round(playerCount) || 1));
    this.starfield = new Starfield(game, 220);
    this.starfield.setBrightness(0.5);
    this.players = Array.from({ length: this.playerCount }, (_, index) => new Player(game, { playerIndex: index }));
    this.playerLives = Array.from({ length: this.playerCount }, () => PLAYER_MAX_LIVES);
    this.playerBombs = this.players.map((player) => player.bombCapacity);
    this.bombTimers = new Array(this.playerCount).fill(0);
    this.activePlayerCount = this.playerCount;
    this.score = 0;
    this.time = 0;
    this.levelNumber = 1;
    this.stageIndex = 0;
    this.stageTime = 0;
    this.waveTimer = 0;
    this.spawnDelay = 2;
    this.boss = null;
    this.bossWarningTimer = 0;
    this.bossSpawned = false;
    this.bossesDefeated = 0;
    this.bombFlashTimer = 0;
    this.levelBannerTimer = 0;
    this.levelBannerText = "";
    this.levelBannerSubtitle = "";
    this.missionCompleteTimer = 0;
    this.missionCompleteText = "";
    this.missionCompleteSubtitle = "";
    this.stageTransitionPending = false;
    this.currentStarColor = null;
    this.currentStagePalette = null;
    this.finalSequenceActive = false;
    this.finalWarningTimer = 0;
    this.finalTransitionProgress = 0;
    this.finalBossSpawned = false;
    this.finalVictoryTimer = -1;
    this.stagePaletteSnapshot = null;
    this.finalPalette = { ...FINAL_SPACE_PALETTE };
    this.paused = false;

    this.playerBullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.effects = [];
    this.powerUps = [];

    resetBossPaletteCycle();
    const initialStage = STAGES[this.stageIndex];
    this.applyStagePalette(initialStage);
    this.layoutPlayers();
    this.players.forEach((player) => player.reset());
    this.spawnDelay = randRange(...STAGES[this.stageIndex].spawnDelay) * this.difficulty.spawnDelayMultiplier;
    this.game.audio.setMusicStage(0);
    this.setLevelBanner({
      text: `Level ${this.levelNumber}`,
      subtitle: initialStage.name,
    });
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

    if (input.wasKeyPressed("Escape")) {
      this.game.returnToTitle();
      return;
    }

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

    if (input.wasKeyPressed("KeyM")) {
      this.game.audio.toggleMusicMute();
    }
    if (input.wasKeyPressed("KeyN")) {
      this.game.audio.toggleSfxMute();
    }

    if (this.paused) {
      this.starfield.update(dt * 0.5);
      return;
    }

    this.time += dt;
    if (!this.stageTransitionPending) {
      this.stageTime += dt;
      this.waveTimer += dt;
    }
    this.starfield.update(dt);
    this.updateFinalSequence(dt);
    if (this.finalVictoryTimer >= 0) {
      this.finalVictoryTimer -= dt;
      if (this.finalVictoryTimer <= 0) {
        this.game.setScene(
          new DebriefScene(this.game, {
            score: this.score,
            difficulty: this.difficulty,
            playerCount: this.playerCount,
          }),
        );
        return;
      }
    }
    if (this.levelBannerTimer > 0) {
      this.levelBannerTimer = Math.max(0, this.levelBannerTimer - dt);
    }
    if (this.missionCompleteTimer > 0) {
      this.missionCompleteTimer = Math.max(0, this.missionCompleteTimer - dt);
      if (this.missionCompleteTimer <= 0 && this.stageTransitionPending) {
        this.finalizeStageTransition();
      }
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

    if (
      !this.stageTransitionPending &&
      !this.finalSequenceActive &&
      !this.boss &&
      this.stageTime < WAVE_DURATION &&
      this.waveTimer >= this.spawnDelay
    ) {
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
        const defeatedId = this.boss.definition?.id;
        const isFinalBoss = defeatedId === FINAL_BOSS_ID;
        this.score += isFinalBoss ? 10000 : 4000;
        this.game.audio.playExplosion(1.2);
        this.effects.push(new Explosion(this.boss.x, this.boss.y, "#9fd6ff", isFinalBoss ? 200 : 120));
        if (!isFinalBoss) {
          this.dropBossRewards();
        }
        this.boss = null;
        if (isFinalBoss) {
          this.handleFinalBossVictory();
        } else {
          this.handleStandardBossVictory();
        }
      }
    } else if (this.shouldSummonBoss()) {
      this.bossWarningTimer = 3;
      this.game.audio.playBossWarning();
      this.game.audio.setMusicStage(this.stageIndex + 1);
      this.bossSpawned = true;
      const bossIndex = Math.min(this.bossesDefeated, BOSS_COUNT - 1);
      this.boss = new Boss(this.game, bossIndex, this.difficulty);
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
    const haloColor = playerIndex === 0 ? "#9fd6ff" : "#7fb0ff";
    this.effects.push(new BombWave(player.x, player.y, BOMB_BLAST_RADIUS, haloColor));
    this.effects.push(new Explosion(player.x, player.y, haloColor, 120));

    let scoreGain = 0;
    const survivors = [];
    for (const enemy of this.enemies) {
      const effectiveRadius = BOMB_BLAST_RADIUS + enemy.radius;
      const inBlast = distanceSquared(player.x, player.y, enemy.x, enemy.y) <= effectiveRadius * effectiveRadius;
      if (inBlast) {
        this.effects.push(new Explosion(enemy.x, enemy.y, "#ffa26f", 80));
        scoreGain += enemy.scoreValue;
      } else {
        survivors.push(enemy);
      }
    }
    this.score += scoreGain;
    this.enemies = survivors;

    const filteredBullets = [];
    for (const bullet of this.enemyBullets) {
      const bulletRadius = (bullet?.radius ?? 0) + 6;
      const effectiveRadius = BOMB_BLAST_RADIUS + bulletRadius;
      const hit = distanceSquared(player.x, player.y, bullet.x, bullet.y) <= effectiveRadius * effectiveRadius;
      if (!hit) {
        filteredBullets.push(bullet);
      }
    }
    this.enemyBullets = filteredBullets;

    if (this.boss) {
      const effectiveRadius = BOMB_BLAST_RADIUS + (this.boss.radius ?? 0);
      const hitBoss = distanceSquared(player.x, player.y, this.boss.x, this.boss.y) <= effectiveRadius * effectiveRadius;
      if (hitBoss) {
        const defeated = this.boss.takeHit(BOMB_DAMAGE);
        const defeatedId = this.boss.definition?.id;
        const isFinalBoss = defeatedId === FINAL_BOSS_ID;
        this.effects.push(new Explosion(this.boss.x, this.boss.y, "#ffffff", defeated ? (isFinalBoss ? 200 : 140) : 100));
        if (defeated) {
          this.score += isFinalBoss ? 10000 : 4000;
          this.game.audio.playExplosion(1.1);
          if (!isFinalBoss) {
            this.dropBossRewards();
          }
          this.boss = null;
          if (isFinalBoss) {
            this.handleFinalBossVictory();
          } else {
            this.handleStandardBossVictory();
          }
        }
      }
    }
  }

  shouldSummonBoss() {
    if (this.finalSequenceActive) {
      return false;
    }
    if (this.stageTransitionPending) {
      return false;
    }
    return !this.boss && !this.bossSpawned && this.stageTime >= BOSS_ENTRY_DELAY && this.enemies.length === 0;
  }

  advanceStage() {
    const previousIndex = this.stageIndex;
    this.stageTransitionPending = false;
    this.missionCompleteTimer = 0;
    this.missionCompleteText = "";
    this.missionCompleteSubtitle = "";
    this.levelNumber += 1;
    this.stageIndex = Math.min(this.levelNumber - 1, STAGES.length - 1);
    const stage = STAGES[this.stageIndex];
    this.stageTime = 0;
    this.waveTimer = 0;
    this.spawnDelay = randRange(...stage.spawnDelay) * this.difficulty.spawnDelayMultiplier;
    this.applyStagePalette(stage);
    this.game.audio.setMusicStage(this.stageIndex);
    this.bossSpawned = false;
    this.bossWarningTimer = 0;
    let subtitle = `Level ${this.levelNumber}: ${stage.name}`;
    if (this.stageIndex === previousIndex && previousIndex === STAGES.length - 1) {
      subtitle = `${stage.name} — Final Push`;
    }
    this.setLevelBanner({
      text: "晉級到下一個 LEVEL",
      subtitle,
    });
  }

  beginStageTransition() {
    if (this.stageTransitionPending) {
      return;
    }
    this.stageTransitionPending = true;
    this.waveTimer = 0;
    this.levelBannerTimer = 0;
    this.levelBannerText = "";
    this.levelBannerSubtitle = "";
    const stage = STAGES[this.stageIndex];
    const label = `Stage ${this.levelNumber}`;
    this.missionCompleteText = "MISSION COMPLETE";
    this.missionCompleteSubtitle = stage ? `${label} • ${stage.name}` : label;
    this.missionCompleteTimer = MISSION_COMPLETE_DURATION;
  }

  finalizeStageTransition() {
    if (!this.stageTransitionPending) {
      return;
    }
    this.stageTransitionPending = false;
    this.missionCompleteTimer = 0;
    this.advanceStage();
  }

  handleStandardBossVictory() {
    this.bossesDefeated += 1;
    if (this.bossesDefeated >= FINAL_BOSS_TRIGGER) {
      this.beginFinalSequence();
    } else {
      this.beginStageTransition();
    }
  }

  handleFinalBossVictory() {
    this.finalSequenceActive = false;
    this.finalWarningTimer = 0;
    this.finalTransitionProgress = 0;
    this.finalBossSpawned = false;
    this.stagePaletteSnapshot = null;
    const currentTier = this.difficultyTier;
    const maxTier = DIFFICULTY_PRESETS.length - 1;
    const nextTier = Math.min(currentTier + 1, maxTier);
    if (nextTier > currentTier) {
      this.applyDifficultyPromotion(nextTier);
    } else {
      this.finalVictoryTimer = 5;
    }
  }

  applyDifficultyPromotion(nextTier) {
    this.difficultyTier = nextTier;
    this.difficulty = DIFFICULTY_PRESETS[nextTier];
    this.bossesDefeated = 0;
    this.levelNumber = 1;
    this.stageIndex = 0;
    this.stageTime = 0;
    this.waveTimer = 0;
    this.spawnDelay = randRange(...STAGES[0].spawnDelay) * this.difficulty.spawnDelayMultiplier;
    this.boss = null;
    this.bossSpawned = false;
    this.bossWarningTimer = 0;
    this.stageTransitionPending = false;
    this.missionCompleteTimer = 0;
    this.missionCompleteText = "";
    this.missionCompleteSubtitle = "";
    this.finalSequenceActive = false;
    this.finalWarningTimer = 0;
    this.finalTransitionProgress = 0;
    this.finalBossSpawned = false;
    this.finalVictoryTimer = -1;
    this.finalPalette = { ...FINAL_SPACE_PALETTE };
    this.stagePaletteSnapshot = null;
    this.enemies.length = 0;
    this.enemyBullets.length = 0;
    this.playerBullets.length = 0;
    this.powerUps.length = 0;
    this.effects.length = 0;
    resetBossPaletteCycle();
    const initialStage = STAGES[0];
    this.applyStagePalette(initialStage);
    this.game.audio.setMusicStage(0);
    this.setLevelBanner({
      text: `${this.difficulty.label} Stage 1`,
      subtitle: initialStage.name,
    });
  }

  beginFinalSequence() {
    if (this.finalSequenceActive) return;
    this.finalSequenceActive = true;
    this.finalWarningTimer = FINAL_WARNING_DURATION;
    this.finalTransitionProgress = 0;
    this.finalBossSpawned = false;
    this.bossSpawned = true;
    this.bossWarningTimer = 0;
    this.stagePaletteSnapshot = this.currentStagePalette ? { ...this.currentStagePalette } : null;
    this.setLevelBanner({
      text: "FINAL ALERT",
      subtitle: "Unknown signal detected",
    });
    this.game.audio.playBossWarning();
  }

  spawnFinalBoss() {
    if (this.finalBossSpawned) return;
    this.finalBossSpawned = true;
    this.finalTransitionProgress = 1;
    this.bossWarningTimer = 0;
    this.boss = createFinalBoss(this.game, this.difficulty);
    this.game.audio.setMusicStage(this.stageIndex + 1);
    this.starfield.setPalette(this.finalPalette);
    this.currentStagePalette = { ...this.finalPalette };
    this.starfield.setBrightness(0.65);
  }

  updateFinalSequence(dt) {
    if (!this.finalSequenceActive) return;
    if (this.finalWarningTimer > 0) {
      this.finalWarningTimer = Math.max(0, this.finalWarningTimer - dt);
      return;
    }
    if (!this.finalBossSpawned) {
      this.finalTransitionProgress = Math.min(1, this.finalTransitionProgress + dt / FINAL_TRANSITION_TIME);
      const source = this.stagePaletteSnapshot ?? this.currentStagePalette ?? FINAL_SPACE_PALETTE;
      const blended = blendPalettes(source, this.finalPalette, this.finalTransitionProgress);
      this.starfield.setPalette(blended);
      if (this.finalTransitionProgress >= 1) {
        this.spawnFinalBoss();
      }
    }
  }

  setLevelBanner({ text, subtitle }) {
    this.levelBannerTimer = LEVEL_BANNER_DURATION;
    this.levelBannerText = text;
    this.levelBannerSubtitle = subtitle;
  }

  dropBossRewards() {
    if (!this.boss) return;
    for (const type of ["bomb", "spread", "laser", "speed", "shield", "health"]) {
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
    this.currentStagePalette = { ...stage.palette, star: nextStarColor };
    this.starfield.setPalette(this.currentStagePalette);
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
            dropType: i === 2 ? maybeDropFrom(["spread", "health"]) : null,
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
            dropType: i === lanes - 1 ? maybeDropType("speed") : null,
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
            dropType: i === 0 ? maybeDropType("bomb") : null,
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
            dropType: i === 3 ? maybeDropFrom(["shield", "health"]) : null,
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
            dropType:
              i === 5
                ? maybeDropType("laser")
                : i === 2
                ? maybeDropFrom(["speed", "health"])
                : null,
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
            dropType: i === 1 ? maybeDropFrom(["speed", "health"]) : null,
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
        dropType: maybeDropType("bomb"),
      });
      const right = this.createEnemy({
        x: width * 0.72,
        y: -120,
        amplitude: 0,
        fireCooldown: 1.1,
        burst: 3,
        burstSpread: 0.35,
        health: 5,
        dropType: maybeDropType("spread"),
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
            dropType: i % 3 === 0 ? maybeDropFrom(["speed", "shield", "health"]) : null,
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
            dropType: i === 2 ? maybeDropType("bomb") : null,
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
            dropType: i === 2 ? maybeDropType("bomb") : null,
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
            dropType:
              i === 1
                ? maybeDropType("laser")
                : i === 0
                ? maybeDropType("spread")
                : i === 2
                ? maybeDropType("health")
                : null,
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
    const adjustedBurst = Math.max(1, baseBurst + this.difficulty.enemyExtraProjectiles);
    const burst = Math.max(1, Math.round(adjustedBurst * 0.5));
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
            const defeatedId = this.boss.definition?.id;
            const isFinalBoss = defeatedId === FINAL_BOSS_ID;
            this.score += isFinalBoss ? 10000 : 4000;
            this.effects.push(new Explosion(this.boss.x, this.boss.y, "#ffffff", isFinalBoss ? 200 : 140));
            if (!isFinalBoss) {
              this.dropBossRewards();
            }
            this.boss = null;
            if (isFinalBoss) {
              this.handleFinalBossVictory();
            } else {
              this.handleStandardBossVictory();
            }
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
            } else if (Math.random() < 0.016) {
              const types = ["bomb", "spread", "laser", "speed", "shield", "health"];
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
          this.game.setScene(
            new DebriefScene(this.game, {
              score: this.score,
              difficulty: this.difficulty,
              playerCount: this.playerCount,
            }),
          );
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
    const topMargin = 12;
    const scoreRect = this.renderScorePanel(ctx, topMargin);
    const playerBottom = this.renderPlayerPanels(ctx, topMargin);
    this.renderAuthorFooter(ctx);
    this.renderAudioHint(ctx);

    if (this.finalSequenceActive && this.finalWarningTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.sin(this.time * 6) * 0.1 + 0.9;
      ctx.fillStyle = "#ff5a91";
      ctx.font = `800 ${Math.max(36, this.game.width * 0.06)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("WARNING", this.game.width / 2, this.game.height * 0.22);
      ctx.font = `600 ${Math.max(18, this.game.width * 0.03)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.fillStyle = "rgba(255, 198, 222, 0.85)";
      ctx.fillText("Anomaly inbound", this.game.width / 2, this.game.height * 0.27);
      ctx.restore();
    } else if (this.boss) {
      const hudFloor = Math.max(scoreRect.bottom, playerBottom);
      const bossTop = Math.max(hudFloor + 20, topMargin + 120);
      this.renderBossHealth(ctx, bossTop);
    } else if (this.bossWarningTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.sin(this.bossWarningTimer * 10) * 0.25 + 0.55;
      ctx.fillStyle = "#ff6b6b";
      ctx.font = `700 ${Math.max(24, this.game.width * 0.038)}px 'Inter', 'Segoe UI', sans-serif`;
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

    if (this.missionCompleteTimer > 0) {
      this.renderMissionComplete(ctx);
    }
    if (this.levelBannerTimer > 0) {
      this.renderLevelBanner(ctx);
    }

    ctx.restore();
  }

  renderScorePanel(ctx, y = 16) {
    const width = Math.min(220, this.game.width * 0.3);
    const height = Math.max(52, this.game.height * 0.075);
    const x = (this.game.width - width) / 2;
    ctx.save();
    ctx.shadowColor = "rgba(90, 209, 255, 0.28)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "rgba(8, 12, 22, 0.72)";
    drawRoundedRect(ctx, x, y, width, height, 16);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(90, 209, 255, 0.5)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.font = `600 ${Math.max(12, this.game.width * 0.02)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText("SCORE", x + 14, y + 16);
    ctx.fillStyle = "#f8fbff";
    ctx.font = `700 ${Math.max(22, this.game.width * 0.038)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText(`${this.score}`, x + 14, y + height - 12);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.font = `500 ${Math.max(11, this.game.width * 0.018)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText(`${this.difficulty.label} Stage:${this.levelNumber}`, x + width - 12, y + 16);
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = `500 ${Math.max(12, this.game.width * 0.02)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText(`${this.playerCount}P`, x + width - 12, y + height - 12);
    ctx.restore();
    return { top: y, bottom: y + height };
  }

  renderPlayerPanels(ctx, topY = 16) {
    if (this.players.length === 0) {
      return topY;
    }
    const width = Math.min(220, this.game.width * 0.32);
    const height = Math.max(58, this.game.height * 0.085);
    let bottom = topY;

    if (this.players[0]) {
      this.renderPlayerBadge(ctx, 0, 16, topY, width, height);
      bottom = Math.max(bottom, topY + height);
    }

    if (this.players[1]) {
      const rightX = this.game.width - width - 16;
      this.renderPlayerBadge(ctx, 1, rightX, topY, width, height);
      bottom = Math.max(bottom, topY + height);
    }

    return bottom;
  }

  renderPlayerBadge(ctx, index, x, y, width, height) {
    const player = this.players[index];
    if (!player) return;
    const lives = this.playerLives[index] ?? 0;
    const bombs = this.playerBombs[index] ?? 0;
    const capacity = player.bombCapacity ?? 0;
    const health = player.isEliminated ? 0 : player.health;
    const accent = player.palette?.accent ?? (index === 0 ? "#ff6d8f" : "#7faeff");

    ctx.save();
    ctx.translate(x, y);
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(8, 12, 22, 0.88)");
    gradient.addColorStop(1, "rgba(8, 12, 22, 0.68)");
    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, 0, 0, width, height, 14);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
    ctx.font = `600 ${Math.max(12, this.game.width * 0.02)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(`P${index + 1}`, 12, 16);

    const weaponInfo = player.getWeaponDisplayInfo();
    const gaugeInactive = player.isEliminated || lives <= 0;
    const lifeIconSpacing = 22;
    const iconStart = 44;
    const lifeIconY = 18;
    for (let i = 0; i < PLAYER_MAX_LIVES; i += 1) {
      const filled = i < lives;
      const color = filled ? accent : "rgba(255, 255, 255, 0.22)";
      drawMiniFighter(ctx, iconStart + i * lifeIconSpacing, lifeIconY, color);
    }

    const shieldActive = player.shieldTimer > 0;
    const shieldX = iconStart + PLAYER_MAX_LIVES * lifeIconSpacing + 18;
    drawShieldStatus(ctx, shieldX, lifeIconY, shieldActive, 0.9);
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = `500 ${Math.max(10, this.game.width * 0.017)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillStyle = shieldActive ? "rgba(255, 255, 255, 0.86)" : "rgba(255, 255, 255, 0.52)";
    ctx.fillText(shieldActive ? "SHIELD" : "NO SHIELD", shieldX + 14, lifeIconY + 1);
    ctx.restore();

    const barX = 12;
    const barY = 30;
    const barWidth = width - 24;
    const segmentSpacing = 4;
    const segmentWidth = (barWidth - (HEALTH_PER_LIFE - 1) * segmentSpacing) / HEALTH_PER_LIFE;
    for (let i = 0; i < HEALTH_PER_LIFE; i += 1) {
      ctx.fillStyle = i < health ? "#ff6161" : "rgba(255, 255, 255, 0.24)";
      drawRoundedRect(
        ctx,
        barX + i * (segmentWidth + segmentSpacing),
        barY,
        segmentWidth,
        8,
        4,
      );
      ctx.fill();
    }

    const bombStartX = 12;
    const bombY = height - 14;
    for (let i = 0; i < capacity; i += 1) {
      const filled = i < bombs;
      const fillStyle = filled ? "#ffcf5a" : "rgba(255, 255, 255, 0.25)";
      drawMiniBomb(ctx, bombStartX + i * 16, bombY, fillStyle);
    }

    const gaugeSegments = 3;
    const gaugeWidth = 12;
    const gaugeSpacing = 5;
    const gaugeHeight = 6;
    const totalGaugeWidth = gaugeSegments * gaugeWidth + (gaugeSegments - 1) * gaugeSpacing;
    const gaugeStartX = width - 12 - totalGaugeWidth;
    const gaugeY = height - 22;
    ctx.save();
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${Math.max(9, this.game.width * 0.015)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillStyle = gaugeInactive ? "rgba(255, 255, 255, 0.38)" : "rgba(255, 255, 255, 0.78)";
    ctx.fillText(weaponInfo.label, gaugeStartX - 10, gaugeY + gaugeHeight / 2);
    ctx.restore();
    for (let i = 0; i < gaugeSegments; i += 1) {
      const filled = i < weaponInfo.gaugeLevel;
      const baseColor = gaugeInactive
        ? filled
          ? "rgba(255, 255, 255, 0.32)"
          : "rgba(255, 255, 255, 0.18)"
        : weaponInfo.gaugeColor;
      const fillColor = filled ? baseColor : gaugeInactive ? "rgba(255, 255, 255, 0.14)" : "rgba(255, 255, 255, 0.22)";
      ctx.fillStyle = fillColor;
      drawRoundedRect(
        ctx,
        gaugeStartX + i * (gaugeWidth + gaugeSpacing),
        gaugeY,
        gaugeWidth,
        gaugeHeight,
        3,
      );
      ctx.fill();
    }

    if (lives <= 0) {
      ctx.fillStyle = "rgba(255, 96, 96, 0.22)";
      drawRoundedRect(ctx, 0, 0, width, height, 14);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 228, 228, 0.85)";
      ctx.font = `600 ${Math.max(12, this.game.width * 0.02)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText("DOWN", width - 12, 18);
      ctx.textAlign = "left";
    }

    ctx.restore();
    return y + height;
  }

  renderBossHealth(ctx, topOffset = 140) {
    if (!this.boss) return;
    ctx.save();
    const width = Math.min(260, this.game.width * 0.44);
    const height = Math.max(32, this.game.height * 0.055);
    const x = (this.game.width - width) / 2;
    const y = Math.max(topOffset, 18);
    ctx.fillStyle = "rgba(8, 12, 22, 0.68)";
    drawRoundedRect(ctx, x, y, width, height, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    const bossName = this.boss?.definition?.name ? this.boss.definition.name.toUpperCase() : "FLAGSHIP";
    ctx.fillStyle = "rgba(255, 255, 255, 0.68)";
    ctx.font = `600 ${Math.max(11, this.game.width * 0.018)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(bossName, this.game.width / 2, y + height * 0.35);
    const innerWidth = width - 24;
    const barHeight = Math.max(8, height * 0.28);
    const barY = y + height - barHeight - 8;
    const ratio = Math.max(0, Math.min(1, this.boss.health / this.boss.maxHealth));
    if (ratio > 0) {
      ctx.fillStyle = "rgba(255, 72, 72, 0.9)";
      drawRoundedRect(ctx, x + 12, barY, innerWidth * ratio, barHeight, 5);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    drawRoundedRect(ctx, x + 12, barY, innerWidth, barHeight, 5);
    ctx.stroke();
    ctx.restore();
  }

  renderAuthorFooter(ctx) {
    ctx.save();
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    ctx.font = `600 ${Math.max(12, this.game.width * 0.02)}px 'Inter', 'Segoe UI', sans-serif`;
    const baseY = this.game.height - 44;
    ctx.fillText("Cliff Wang", 20, baseY);
    ctx.fillStyle = "rgba(255, 255, 255, 0.56)";
    ctx.font = `500 ${Math.max(10, this.game.width * 0.018)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText("v1.0 • 2024-05-01", 20, baseY + 20);
    ctx.restore();
  }

  renderAudioHint(ctx) {
    ctx.save();
    const { musicEnabled, sfxEnabled } = this.game.audio;
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.font = `400 ${Math.max(12, this.game.width * 0.02)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(
      `BGM ${musicEnabled ? "ON" : "OFF"} (M) • SFX ${sfxEnabled ? "ON" : "OFF"} (N) • Pause (P) • Restart (R) • Title (Esc)`,
      this.game.width - 20,
      this.game.height - 24,
    );
    ctx.restore();
  }

  renderMissionComplete(ctx) {
    if (!this.missionCompleteText) return;
    ctx.save();
    const elapsed = MISSION_COMPLETE_DURATION - this.missionCompleteTimer;
    const progress = Math.max(0, Math.min(1, elapsed / MISSION_COMPLETE_DURATION));
    const alpha = Math.sin(progress * Math.PI) * 0.88;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(255, 228, 170, 0.95)";
    ctx.font = `700 ${Math.max(34, this.game.width * 0.058)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(this.missionCompleteText, this.game.width / 2, this.game.height * 0.26);
    if (this.missionCompleteSubtitle) {
      ctx.font = `500 ${Math.max(18, this.game.width * 0.03)}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.fillText(this.missionCompleteSubtitle, this.game.width / 2, this.game.height * 0.26 + 42);
    }
    ctx.restore();
  }

  renderLevelBanner(ctx) {
    ctx.save();
    const progress = LEVEL_BANNER_DURATION > 0 ? Math.min(1, this.levelBannerTimer / LEVEL_BANNER_DURATION) : 1;
    ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.85;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = `700 ${Math.max(32, this.game.width * 0.056)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(this.levelBannerText, this.game.width / 2, this.game.height * 0.24);
    ctx.font = `500 ${Math.max(16, this.game.width * 0.028)}px 'Inter', 'Segoe UI', sans-serif`;
    ctx.fillText(this.levelBannerSubtitle, this.game.width / 2, this.game.height * 0.3 + 24);
    ctx.restore();
  }

  getActivePlayers() {
    const active = [];
    for (let i = 0; i < this.players.length; i += 1) {
      if (this.playerLives[i] > 0 && !this.players[i].isEliminated) {
        active.push({ index: i, player: this.players[i] });
      }
    }
    return active;
  }

  layoutPlayers() {
    const baselineY = this.game.height - 96;
    const count = this.players.length || 1;
    const spacing = this.game.width / (count + 1);
    for (let i = 0; i < this.players.length; i += 1) {
      const player = this.players[i];
      const spawnX = spacing * (i + 1);
      player.setSpawnPosition(spawnX, baselineY);
    }
  }

  restartScene() {
    this.game.setScene(new GameplayScene(this.game, this.difficulty, this.playerCount));
  }
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
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

function drawMiniFighter(ctx, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.92, 0.92);

  const fuselage = ctx.createLinearGradient(0, -12, 0, 12);
  fuselage.addColorStop(0, "rgba(255, 255, 255, 0.75)");
  fuselage.addColorStop(0.45, color);
  fuselage.addColorStop(1, "rgba(0, 0, 0, 0.2)");
  ctx.fillStyle = fuselage;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(3.6, -6);
  ctx.lineTo(3, 4);
  ctx.lineTo(1.6, 9.5);
  ctx.lineTo(0, 12);
  ctx.lineTo(-1.6, 9.5);
  ctx.lineTo(-3, 4);
  ctx.lineTo(-3.6, -6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.beginPath();
  ctx.moveTo(-7.5, -1.2);
  ctx.lineTo(-3.6, 2.4);
  ctx.lineTo(-4.8, 7.5);
  ctx.lineTo(-9, 2);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(7.5, -1.2);
  ctx.lineTo(3.6, 2.4);
  ctx.lineTo(4.8, 7.5);
  ctx.lineTo(9, 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(1.6, -1);
  ctx.lineTo(0, 6);
  ctx.lineTo(-1.6, -1);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(0, 10.4);
  ctx.stroke();

  ctx.restore();
}

function drawMiniBomb(ctx, x, y, fillStyle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.38)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-2, -2.6, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.fill();

  ctx.fillStyle = "rgba(26, 30, 34, 0.85)";
  ctx.font = "700 6.5px 'Inter', 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("B", 0, 1);

  ctx.restore();
}

function drawShieldStatus(ctx, x, y, active, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = active ? 1 : 0.45;
  const fill = active ? "#6fb3ff" : "rgba(255, 255, 255, 0.22)";
  ctx.fillStyle = fill;
  ctx.strokeStyle = active ? "rgba(207, 233, 255, 0.9)" : "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = active ? 1.6 : 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.quadraticCurveTo(6, -6.5, 5.2, -0.6);
  ctx.quadraticCurveTo(0, 7.6, 0, 7.6);
  ctx.quadraticCurveTo(-5.2, -0.6, -6, -6.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = active ? 1 : 0.35;
  ctx.strokeStyle = active ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -5.6);
  ctx.lineTo(0, 4.2);
  ctx.moveTo(-2.5, -1);
  ctx.lineTo(2.5, -1);
  ctx.stroke();
  ctx.restore();
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

function blendPalettes(start, end, t) {
  return {
    top: blendColor(start?.top, end?.top, t),
    bottom: blendColor(start?.bottom, end?.bottom, t),
    star: blendColor(start?.star, end?.star, t, true),
  };
}

function blendColor(a, b, t, allowRgba = false) {
  if (!a) return b;
  if (!b) return a;
  if (a.startsWith("#") && b.startsWith("#")) {
    const [ar, ag, ab] = hexToRgb(a);
    const [br, bg, bb] = hexToRgb(b);
    const r = Math.round(lerp(ar, br, t));
    const g = Math.round(lerp(ag, bg, t));
    const bl = Math.round(lerp(ab, bb, t));
    return rgbToHex(r, g, bl);
  }
  if (allowRgba || a.startsWith("rgba") || b.startsWith("rgba")) {
    const [ar, ag, ab, aa] = rgbaToArray(a);
    const [br, bg, bb, ba] = rgbaToArray(b);
    const r = lerp(ar, br, t);
    const g = lerp(ag, bg, t);
    const bl = lerp(ab, bb, t);
    const alpha = lerp(aa, ba, t);
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(bl)}, ${alpha.toFixed(3)})`;
  }
  return t < 0.5 ? a : b;
}

function hexToRgb(color) {
  const normalized = color.replace("#", "");
  const value = normalized.length === 3
    ? normalized
        .split("")
        .map((char) => char + char)
        .join("")
    : normalized;
  const intVal = parseInt(value, 16);
  return [(intVal >> 16) & 0xff, (intVal >> 8) & 0xff, intVal & 0xff];
}

function rgbToHex(r, g, b) {
  const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${clampChannel(r).toString(16).padStart(2, "0")}${clampChannel(g).toString(16).padStart(2, "0")}${clampChannel(b)
    .toString(16)
    .padStart(2, "0")}`;
}

function rgbaToArray(value) {
  if (!value || !value.startsWith("rgba")) {
    const [r, g, b] = hexToRgb(value ?? "#ffffff");
    return [r, g, b, 1];
  }
  const matches = value.match(/rgba\(([^)]+)\)/);
  if (!matches) return [255, 255, 255, 1];
  const parts = matches[1]
    .split(",")
    .map((part) => parseFloat(part.trim()))
    .filter((part) => !Number.isNaN(part));
  while (parts.length < 4) {
    parts.push(parts.length === 3 ? 1 : 0);
  }
  return parts;
}

function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

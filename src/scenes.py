"""Scene management and gameplay scenes for Starfighter."""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import List, Optional

import pygame

from .effects import Explosion
from .enemy import Enemy
from .player import Player


def _generate_starfield(size: tuple[int, int], star_count: int = 140) -> pygame.Surface:
    """Create a parallax-ready transparent starfield surface."""

    surface = pygame.Surface(size, pygame.SRCALPHA)
    width, height = size
    for _ in range(star_count):
        x = random.randrange(0, width)
        y = random.randrange(0, height)
        brightness = random.randint(160, 255)
        radius = random.choice([1, 1, 2])
        pygame.draw.circle(surface, (brightness, brightness, brightness), (x, y), radius)
    return surface


class Scene:
    """Base class for a game scene."""

    def __init__(self, manager: "SceneManager") -> None:
        self.manager = manager

    def handle_event(self, event: pygame.event.Event) -> None:
        """Handle pygame events."""

    def update(self, dt: float) -> None:
        """Update the scene."""

    def draw(self, surface: pygame.Surface) -> None:
        """Draw the scene to the given surface."""


class SceneManager:
    """Maintain a stack of active scenes."""

    def __init__(self, screen: pygame.Surface) -> None:
        self._scenes: List[Scene] = []
        self.screen = screen
        self.high_score = 0

    def push(self, scene: Scene) -> None:
        self._scenes.append(scene)

    def pop(self) -> Optional[Scene]:
        if self._scenes:
            return self._scenes.pop()
        return None

    def replace(self, scene: Scene) -> None:
        if self._scenes:
            self._scenes.pop()
        self._scenes.append(scene)

    @property
    def current(self) -> Optional[Scene]:
        if self._scenes:
            return self._scenes[-1]
        return None

    def handle_event(self, event: pygame.event.Event) -> None:
        if self.current:
            self.current.handle_event(event)

    def update(self, dt: float) -> None:
        if self.current:
            self.current.update(dt)

    def draw(self) -> None:
        if self.current:
            self.current.draw(self.screen)


@dataclass
class SpawnTimer:
    """Track elapsed time between enemy spawns."""

    interval: float
    elapsed: float = 0.0

    def advance(self, dt: float) -> bool:
        self.elapsed += dt
        if self.elapsed >= self.interval:
            self.elapsed -= self.interval
            return True
        return False


class GameplayScene(Scene):
    """Main gameplay logic for the vertical shooter."""

    def __init__(self, manager: SceneManager) -> None:
        super().__init__(manager)
        self.screen_rect = self.manager.screen.get_rect()
        self.background = pygame.Surface(self.screen_rect.size)
        self.background.fill((6, 6, 24))
        self.starfield = _generate_starfield(self.screen_rect.size)
        self.background_offset = 0.0
        self.starfield_offset = 0.0

        self.player_start = (self.screen_rect.centerx, self.screen_rect.bottom - 80)
        self.player = Player(*self.player_start, self.screen_rect)
        self.player_active = True
        self.invulnerable_timer = 0.0
        self.player_bullets = pygame.sprite.Group()
        self.enemies = pygame.sprite.Group()
        self.enemy_bullets = pygame.sprite.Group()
        self.effects = pygame.sprite.Group()

        self.spawn_timer = SpawnTimer(interval=2.0)
        self.wave_timer = 0.0
        self.difficulty = 0.0

        self.score = 0
        self.lives = 3
        self.font_small = pygame.font.SysFont("arial", 18)
        self.font_large = pygame.font.SysFont("arial", 28)
        self.life_icon = pygame.transform.smoothscale(self.player.image, (20, 20))
        self.running = True

    def handle_event(self, event: pygame.event.Event) -> None:
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                self.manager.replace(TitleScene(self.manager))
            elif not self.running and event.key in (pygame.K_RETURN, pygame.K_SPACE):
                self.manager.replace(GameOverScene(self.manager, self.score))

    def update(self, dt: float) -> None:
        keys = pygame.key.get_pressed()
        self._scroll_background(dt)
        self.effects.update(dt)

        if self.running:
            self.difficulty += dt
            self.spawn_timer.interval = max(0.45, 1.8 - self.difficulty * 0.08)
            self.wave_timer += dt

            if self.player_active:
                self.player.update(dt, keys, self.player_bullets)
                self._update_invulnerability(dt)

            self.player_bullets.update(dt)
            target = self.player.rect.center if self.player_active else self.screen_rect.center
            self.enemies.update(dt, target)
            self.enemy_bullets.update(dt)

            if self.spawn_timer.advance(dt):
                self.enemies.add(Enemy(self.screen_rect))

            if self.wave_timer >= 9.0:
                self._spawn_wave()
                self.wave_timer = 0.0

            for enemy in self.enemies:
                bullet = enemy.maybe_fire(dt)
                if bullet:
                    self.enemy_bullets.add(bullet)

            self._handle_collisions()
            self.score += int(35 * dt)
        else:
            self.player_bullets.update(dt)
            self.enemies.update(dt, self.screen_rect.center)
            self.enemy_bullets.update(dt)

    def _scroll_background(self, dt: float) -> None:
        self.background_offset = (self.background_offset + 60 * dt) % self.screen_rect.height
        self.starfield_offset = (self.starfield_offset + 120 * dt) % self.screen_rect.height

    def _update_invulnerability(self, dt: float) -> None:
        if self.invulnerable_timer > 0:
            self.invulnerable_timer = max(0.0, self.invulnerable_timer - dt)
            blink = int(self.invulnerable_timer * 12) % 2 == 0
            self.player.set_alpha(90 if blink else 255)
        else:
            self.player.set_alpha(255)

    def _spawn_wave(self) -> None:
        columns = 5
        spacing = self.screen_rect.width // (columns + 1)
        for i in range(columns):
            x = spacing * (i + 1)
            y = -48 - i * 12
            enemy = Enemy(
                self.screen_rect,
                start_position=(x, y),
                speed=random.uniform(120, 180),
            )
            self.enemies.add(enemy)

    def _handle_collisions(self) -> None:
        for bullet in list(self.player_bullets):
            hit_enemies = pygame.sprite.spritecollide(bullet, self.enemies, dokill=True)
            if hit_enemies:
                bullet.kill()
                for enemy in hit_enemies:
                    self.effects.add(Explosion(enemy.rect.center, (255, 150, 90)))
                    self.score += 120

        if not self.player_active or self.invulnerable_timer > 0:
            return

        player_hit = False
        if pygame.sprite.spritecollide(self.player, self.enemies, dokill=True):
            player_hit = True
        if pygame.sprite.spritecollide(self.player, self.enemy_bullets, dokill=True):
            player_hit = True

        if player_hit:
            self.effects.add(Explosion(self.player.rect.center, (255, 120, 90), max_radius=46))
            self.lives -= 1
            if self.lives > 0:
                self.player.respawn(self.player_start)
                self.invulnerable_timer = 2.0
            else:
                self.player_active = False
                self.running = False
                self.player.set_alpha(0)

    def draw(self, surface: pygame.Surface) -> None:
        bg_offset = int(self.background_offset)
        surface.blit(self.background, (0, bg_offset - self.screen_rect.height))
        surface.blit(self.background, (0, bg_offset))

        star_offset = int(self.starfield_offset)
        surface.blit(self.starfield, (0, star_offset - self.screen_rect.height))
        surface.blit(self.starfield, (0, star_offset))

        self.player_bullets.draw(surface)
        self.enemies.draw(surface)
        self.enemy_bullets.draw(surface)
        self.effects.draw(surface)

        if self.player_active:
            surface.blit(self.player.image, self.player.rect)

        score_text = self.font_small.render(f"Score: {self.score}", True, (255, 255, 255))
        surface.blit(score_text, (10, 10))

        lives_label = self.font_small.render("Lives", True, (200, 200, 220))
        surface.blit(lives_label, (self.screen_rect.width - 120, 10))
        for i in range(max(self.lives, 0)):
            offset_x = self.screen_rect.width - 60 + i * 24
            surface.blit(self.life_icon, (offset_x, 34))

        if not self.running:
            overlay = pygame.Surface(self.screen_rect.size, pygame.SRCALPHA)
            overlay.fill((0, 0, 0, 160))
            surface.blit(overlay, (0, 0))

            title = self.font_large.render("Mission Failed", True, (255, 255, 255))
            surface.blit(title, title.get_rect(center=(self.screen_rect.centerx, self.screen_rect.centery - 40)))

            prompt = self.font_small.render("Press Enter to debrief", True, (240, 240, 240))
            surface.blit(prompt, prompt.get_rect(center=(self.screen_rect.centerx, self.screen_rect.centery + 10)))


class TitleScene(Scene):
    """Title screen with controls and start instructions."""

    def __init__(self, manager: SceneManager) -> None:
        super().__init__(manager)
        self.screen_rect = self.manager.screen.get_rect()
        self.background = pygame.Surface(self.screen_rect.size)
        self.background.fill((4, 8, 24))
        self.starfield = _generate_starfield(self.screen_rect.size, star_count=100)
        self.starfield_offset = 0.0

        self.title_font = pygame.font.SysFont("arial", 60, bold=True)
        self.info_font = pygame.font.SysFont("arial", 22)
        self.hint_font = pygame.font.SysFont("arial", 18)
        self.pulse_timer = 0.0

    def handle_event(self, event: pygame.event.Event) -> None:
        if event.type == pygame.KEYDOWN:
            if event.key in (pygame.K_RETURN, pygame.K_SPACE):
                self.manager.replace(GameplayScene(self.manager))
            elif event.key == pygame.K_ESCAPE:
                self.manager.pop()

    def update(self, dt: float) -> None:
        self.pulse_timer = (self.pulse_timer + dt) % 2.0
        self.starfield_offset = (self.starfield_offset + 80 * dt) % self.screen_rect.height

    def draw(self, surface: pygame.Surface) -> None:
        surface.blit(self.background, (0, 0))
        offset = int(self.starfield_offset)
        surface.blit(self.starfield, (0, offset - self.screen_rect.height))
        surface.blit(self.starfield, (0, offset))

        title = self.title_font.render("Starfighter", True, (255, 255, 255))
        surface.blit(title, title.get_rect(center=(self.screen_rect.centerx, self.screen_rect.centery - 120)))

        controls = [
            "Arrow Keys / WASD - Move",
            "Space / Z - Fire",
            "Esc - Pause & Return to Title",
        ]
        for i, text in enumerate(controls):
            line = self.info_font.render(text, True, (210, 210, 230))
            surface.blit(line, line.get_rect(center=(self.screen_rect.centerx, self.screen_rect.centery - 20 + i * 26)))

        pulse = (math.sin(self.pulse_timer * math.pi) + 1) / 2
        alpha = 150 + int(105 * pulse)
        hint = self.hint_font.render("Press Enter to launch", True, (alpha, alpha, alpha))
        surface.blit(hint, hint.get_rect(center=(self.screen_rect.centerx, self.screen_rect.centery + 120)))

        if self.manager.high_score > 0:
            best = self.hint_font.render(f"Best Score: {self.manager.high_score}", True, (200, 200, 230))
            surface.blit(best, best.get_rect(center=(self.screen_rect.centerx, self.screen_rect.centery + 70)))


class GameOverScene(Scene):
    """Post-run summary with score and restart options."""

    def __init__(self, manager: SceneManager, score: int) -> None:
        super().__init__(manager)
        self.score = score
        self.manager.high_score = max(self.manager.high_score, score)
        self.screen_rect = self.manager.screen.get_rect()
        self.background = pygame.Surface(self.screen_rect.size)
        self.background.fill((12, 8, 28))
        self.starfield = _generate_starfield(self.screen_rect.size, star_count=120)
        self.starfield_offset = 0.0

        self.title_font = pygame.font.SysFont("arial", 48, bold=True)
        self.info_font = pygame.font.SysFont("arial", 22)
        self.hint_font = pygame.font.SysFont("arial", 18)

    def handle_event(self, event: pygame.event.Event) -> None:
        if event.type == pygame.KEYDOWN:
            if event.key in (pygame.K_RETURN, pygame.K_SPACE):
                self.manager.replace(GameplayScene(self.manager))
            elif event.key == pygame.K_ESCAPE:
                self.manager.replace(TitleScene(self.manager))

    def update(self, dt: float) -> None:
        self.starfield_offset = (self.starfield_offset + 70 * dt) % self.screen_rect.height

    def draw(self, surface: pygame.Surface) -> None:
        surface.blit(self.background, (0, 0))
        offset = int(self.starfield_offset)
        surface.blit(self.starfield, (0, offset - self.screen_rect.height))
        surface.blit(self.starfield, (0, offset))

        title = self.title_font.render("Debrief", True, (255, 255, 255))
        surface.blit(title, title.get_rect(center=(self.screen_rect.centerx, self.screen_rect.centery - 120)))

        score_line = self.info_font.render(f"Score: {self.score}", True, (240, 240, 240))
        best_line = self.info_font.render(f"Best: {self.manager.high_score}", True, (210, 210, 230))
        surface.blit(score_line, score_line.get_rect(center=(self.screen_rect.centerx, self.screen_rect.centery - 20)))
        surface.blit(best_line, best_line.get_rect(center=(self.screen_rect.centerx, self.screen_rect.centery + 20)))

        hint = self.hint_font.render("Press Enter to sortie again", True, (200, 200, 200))
        surface.blit(hint, hint.get_rect(center=(self.screen_rect.centerx, self.screen_rect.centery + 90)))

        exit_hint = self.hint_font.render("Esc to return to title", True, (170, 170, 190))
        surface.blit(exit_hint, exit_hint.get_rect(center=(self.screen_rect.centerx, self.screen_rect.centery + 120)))

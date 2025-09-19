"""Scene management and gameplay scene implementation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

import pygame

from .player import Player
from .enemy import Enemy
from .bullet import Bullet


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

    def push(self, scene: Scene) -> None:
        self._scenes.append(scene)

    def pop(self) -> Optional[Scene]:
        if self._scenes:
            return self._scenes.pop()
        return None

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
        self.background.fill((5, 5, 20))
        self.background_offset = 0
        self.starfield = self._create_starfield()

        self.player = Player(self.screen_rect.centerx, self.screen_rect.bottom - 80, self.screen_rect)
        self.player_group = pygame.sprite.GroupSingle(self.player)
        self.player_bullets = pygame.sprite.Group()
        self.enemies = pygame.sprite.Group()
        self.enemy_bullets = pygame.sprite.Group()
        self.spawn_timer = SpawnTimer(interval=2.0)
        self.font = pygame.font.SysFont("arial", 18)
        self.score = 0
        self.running = True

    def _create_starfield(self) -> pygame.Surface:
        surface = pygame.Surface(self.screen_rect.size)
        surface.fill((0, 0, 0))
        for y in range(0, self.screen_rect.height, 40):
            for x in range(0, self.screen_rect.width, 80):
                pygame.draw.circle(surface, (200, 200, 200), (x + 10, y + 10), 1)
        return surface

    def handle_event(self, event: pygame.event.Event) -> None:
        if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            self.manager.pop()

    def update(self, dt: float) -> None:
        keys = pygame.key.get_pressed()
        if self.running:
            self.player.update(dt, keys, self.player_bullets)
            self.player_bullets.update(dt)
            self.enemies.update(dt, self.player.rect.center)
            self.enemy_bullets.update(dt)

            if self.spawn_timer.advance(dt):
                self.enemies.add(Enemy(self.screen_rect))

            for enemy in self.enemies:
                bullet = enemy.maybe_fire(dt)
                if bullet:
                    self.enemy_bullets.add(bullet)

            for bullet in self.player_bullets:
                hit_enemies = pygame.sprite.spritecollide(bullet, self.enemies, dokill=True)
                if hit_enemies:
                    bullet.kill()
                    self.score += 100 * len(hit_enemies)

            if pygame.sprite.spritecollide(self.player, self.enemies, dokill=False) or pygame.sprite.spritecollide(
                self.player, self.enemy_bullets, dokill=True
            ):
                self.running = False

        else:
            self.enemy_bullets.update(dt)
            self.player_bullets.update(dt)

        self._scroll_background(dt)

    def _scroll_background(self, dt: float) -> None:
        speed = 60
        self.background_offset = (self.background_offset + speed * dt) % self.screen_rect.height

    def draw(self, surface: pygame.Surface) -> None:
        offset = int(self.background_offset)
        surface.blit(self.background, (0, offset - self.screen_rect.height))
        surface.blit(self.background, (0, offset))
        surface.blit(self.starfield, (0, (offset // 2) % self.screen_rect.height))

        self.player_group.draw(surface)
        self.player_bullets.draw(surface)
        self.enemies.draw(surface)
        self.enemy_bullets.draw(surface)

        if not self.running:
            text = self.font.render("Game Over - Press ESC", True, (255, 255, 255))
            surface.blit(text, text.get_rect(center=self.screen_rect.center))
        else:
            score_text = self.font.render(f"Score: {self.score}", True, (255, 255, 255))
            surface.blit(score_text, (10, 10))

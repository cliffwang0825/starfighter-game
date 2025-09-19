"""Enemy sprite implementation."""

from __future__ import annotations

import random
from typing import Tuple

import pygame

from .bullet import Bullet


class Enemy(pygame.sprite.Sprite):
    """Basic enemy that drifts downward and occasionally shoots."""

    def __init__(
        self,
        screen_rect: pygame.Rect,
        *,
        start_position: Tuple[int, int] | None = None,
        speed: float | None = None,
    ) -> None:
        super().__init__()
        self.image = pygame.Surface((32, 32), pygame.SRCALPHA)
        pygame.draw.polygon(
            self.image,
            (220, 60, 60),
            [(16, 0), (0, 28), (32, 28)],
        )
        if start_position:
            self.rect = self.image.get_rect(midtop=start_position)
        else:
            self.rect = self.image.get_rect(midtop=(random.randint(30, screen_rect.width - 30), -32))
        self.position = pygame.Vector2(self.rect.topleft)
        self.speed = speed if speed is not None else random.uniform(80, 140)
        self.screen_rect = screen_rect
        self.fire_interval = random.uniform(1.0, 2.5)
        self.time_since_last_shot = random.uniform(0.0, self.fire_interval)

    def update(self, dt: float, player_position: tuple[int, int]) -> None:
        if player_position[0] > self.rect.centerx:
            self.position.x += 40 * dt
        elif player_position[0] < self.rect.centerx:
            self.position.x -= 40 * dt

        self.position.y += self.speed * dt
        self.rect.topleft = (int(self.position.x), int(self.position.y))
        if self.rect.left < self.screen_rect.left:
            self.rect.left = self.screen_rect.left
        if self.rect.right > self.screen_rect.right:
            self.rect.right = self.screen_rect.right
        self.position = pygame.Vector2(self.rect.topleft)
        if self.rect.top > self.screen_rect.bottom:
            self.kill()

    def maybe_fire(self, dt: float) -> Bullet | None:
        self.time_since_last_shot += dt
        if self.time_since_last_shot >= self.fire_interval and self.rect.top > 0:
            self.time_since_last_shot = 0.0
            bullet_velocity = pygame.Vector2(0, 240)
            return Bullet(self.rect.midbottom, bullet_velocity, (255, 200, 50), self.screen_rect)
        return None

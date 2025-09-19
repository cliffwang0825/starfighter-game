"""Bullet sprite implementation."""

from __future__ import annotations

import pygame


class Bullet(pygame.sprite.Sprite):
    """A projectile fired by the player or an enemy."""

    def __init__(self, position: tuple[float, float], velocity: tuple[float, float], color: tuple[int, int, int], bounds: pygame.Rect) -> None:
        super().__init__()
        self.image = pygame.Surface((4, 12), pygame.SRCALPHA)
        pygame.draw.rect(self.image, color, self.image.get_rect())
        self.rect = self.image.get_rect(center=position)
        self.position = pygame.Vector2(position)
        self.velocity = pygame.Vector2(velocity)
        self.bounds = bounds

    def update(self, dt: float) -> None:
        self.position += self.velocity * dt
        self.rect.center = (int(self.position.x), int(self.position.y))
        if not self.bounds.colliderect(self.rect):
            self.kill()

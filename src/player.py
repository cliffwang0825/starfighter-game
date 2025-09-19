"""Player controlled starfighter implementation."""

from __future__ import annotations

import pygame

from .bullet import Bullet


class Player(pygame.sprite.Sprite):
    """The player's ship that can move and fire bullets."""

    def __init__(self, x: int, y: int, bounds: pygame.Rect) -> None:
        super().__init__()
        self.image = pygame.Surface((36, 36), pygame.SRCALPHA)
        pygame.draw.polygon(
            self.image,
            (80, 220, 250),
            [(18, 0), (0, 35), (36, 35)],
        )
        self.rect = self.image.get_rect(center=(x, y))
        self.position = pygame.Vector2(self.rect.center)
        self.speed = 220
        self.bounds = bounds
        self.fire_cooldown = 0.25
        self.cooldown_timer = 0.0

    def update(self, dt: float, keys: pygame.key.ScancodeWrapper, bullets: pygame.sprite.Group) -> None:
        movement = pygame.Vector2(0, 0)
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            movement.x -= 1
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            movement.x += 1
        if keys[pygame.K_UP] or keys[pygame.K_w]:
            movement.y -= 1
        if keys[pygame.K_DOWN] or keys[pygame.K_s]:
            movement.y += 1

        if movement.length_squared() > 0:
            movement = movement.normalize()

        self.position += movement * self.speed * dt
        self.rect.center = (int(self.position.x), int(self.position.y))
        self.rect.clamp_ip(self.bounds)
        self.position = pygame.Vector2(self.rect.center)

        self.cooldown_timer = max(0.0, self.cooldown_timer - dt)
        if (keys[pygame.K_SPACE] or keys[pygame.K_z]) and self.cooldown_timer <= 0:
            bullets.add(self._create_bullet())
            self.cooldown_timer = self.fire_cooldown

    def _create_bullet(self) -> Bullet:
        bullet_velocity = pygame.Vector2(0, -420)
        return Bullet(self.rect.midtop, bullet_velocity, (50, 200, 255), self.bounds)

    def respawn(self, position: tuple[int, int]) -> None:
        """Re-center the player without resetting other properties."""
        self.position = pygame.Vector2(position)
        self.rect.center = (int(self.position.x), int(self.position.y))

    def set_alpha(self, alpha: int) -> None:
        """Adjust sprite transparency for flicker effects."""
        self.image.set_alpha(alpha)

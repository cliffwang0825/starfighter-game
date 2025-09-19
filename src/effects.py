"""Visual effects and transient animations for the shooter."""

from __future__ import annotations

import pygame


class Explosion(pygame.sprite.Sprite):
    """A quick circular burst animation used for impacts."""

    def __init__(
        self,
        center: tuple[int, int],
        color: tuple[int, int, int],
        max_radius: int = 32,
        lifetime: float = 0.45,
    ) -> None:
        super().__init__()
        diameter = max_radius * 2
        self.image = pygame.Surface((diameter, diameter), pygame.SRCALPHA)
        self.rect = self.image.get_rect(center=center)
        self._color = color
        self._max_radius = max_radius
        self._lifetime = lifetime
        self._elapsed = 0.0
        self._render(progress=0.0)

    def _render(self, progress: float) -> None:
        self.image.fill((0, 0, 0, 0))
        radius = max(1, int(self._max_radius * progress))
        center = (self._max_radius, self._max_radius)
        pygame.draw.circle(self.image, self._color, center, radius, width=2)
        inner_radius = max(1, radius // 2)
        pygame.draw.circle(self.image, (255, 255, 255), center, inner_radius, width=1)

    def update(self, dt: float) -> None:
        self._elapsed += dt
        progress = min(1.0, self._elapsed / self._lifetime)
        self._render(progress)
        if self._elapsed >= self._lifetime:
            self.kill()

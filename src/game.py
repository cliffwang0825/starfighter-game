"""Core game loop and pygame bootstrap code."""

from __future__ import annotations

import pygame

from .scenes import GameplayScene, SceneManager


class Game:
    """Initialize pygame and run the main loop."""

    def __init__(self) -> None:
        pygame.init()
        self.screen = pygame.display.set_mode((480, 640))
        pygame.display.set_caption("Starfighter")
        self.clock = pygame.time.Clock()
        self.scene_manager = SceneManager(self.screen)
        self.scene_manager.push(GameplayScene(self.scene_manager))
        self.running = True

    def run(self) -> None:
        """Execute the main game loop."""
        while self.running:
            dt = self.clock.tick(60) / 1000.0
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    self.running = False
                else:
                    self.scene_manager.handle_event(event)

            self.scene_manager.update(dt)
            self.scene_manager.draw()
            pygame.display.flip()

            if self.scene_manager.current is None:
                self.running = False

        pygame.quit()

"""Entry point for the Starfighter vertical scrolling shooter."""

from .game import Game


def main() -> None:
    """Start the Starfighter game."""
    game = Game()
    game.run()


if __name__ == "__main__":
    main()

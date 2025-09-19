import { Game } from "./game.js";

const canvas = document.getElementById("game");

if (!canvas) {
  throw new Error("Canvas element with id 'game' not found");
}

new Game(canvas);

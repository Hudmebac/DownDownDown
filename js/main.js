import { Game } from './game/game.js';

const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);
game.start();
window.game = game;

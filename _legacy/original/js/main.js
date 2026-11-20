import { Game } from './game.js';

const canvas = document.getElementById('gameCanvas');
const wrapper = document.getElementById('game-wrapper');
const game = new Game(canvas);

function resizeCanvas() {
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  const aspect = canvas.width / canvas.height;
  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  wrapper.style.width = Math.floor(w) + 'px';
  wrapper.style.height = Math.floor(h) + 'px';
  const isMobile = maxW < 768 || 'ontouchstart' in window;
  if (isMobile) {
    wrapper.classList.remove('has-border');
  } else {
    wrapper.classList.add('has-border');
  }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

game.start();

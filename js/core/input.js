import { VIEW, TOUCH } from '../game/config.js';

const JUMP_KEYS = new Set([' ', 'ArrowUp', 'w', 'W']);
const LEFT_KEYS = new Set(['ArrowLeft', 'a', 'A']);
const RIGHT_KEYS = new Set(['ArrowRight', 'd', 'D']);
const DOWN_KEYS = new Set(['ArrowDown', 's', 'S']);
const DASH_KEYS = new Set(['Shift', 'k', 'K', 'x', 'X']);
const PAUSE_KEYS = new Set(['Escape', 'p', 'P']);

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.tapped = new Set();
    this.typed = [];
    this.left = false;
    this.right = false;
    this.down = false;
    this.downPressed = false;
    this.jumpHeld = false;
    this.jumpPressed = false;
    this.dashPressed = false;
    this.pausePressed = false;
    this.pointer = { x: VIEW.w / 2, y: VIEW.h / 2, down: false, clicked: false };
    this.touchMode = false;
    this.touch = { left: false, right: false, jump: false, dash: false };
    this.touchJumpPressed = false;
    this.touchDashPressed = false;
    this.textField = null;
    this.textEnter = false;
    this.textCancel = false;
    this._pointers = new Map();
    this._jumpPointers = new Set();
    this._dashPointers = new Set();
    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      const key = e.key;
      if (this.textField) {
        if (key === 'Enter') {
          this.textEnter = true;
          e.preventDefault();
          return;
        }
        if (key === 'Escape') {
          this.textCancel = true;
          e.preventDefault();
          return;
        }
        if (key === 'Backspace') {
          this.textField.value = this.textField.value.slice(0, -1);
          e.preventDefault();
          return;
        }
        if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (/[\w \-']/.test(key) && this.textField.value.length < this.textField.max) {
            this.textField.value += key;
          }
          e.preventDefault();
        }
        return;
      }
      if (JUMP_KEYS.has(key) || LEFT_KEYS.has(key) || RIGHT_KEYS.has(key) || DOWN_KEYS.has(key)) e.preventDefault();
      if (PAUSE_KEYS.has(key) && !e.repeat) this.pausePressed = true;
      if (key.length === 1) this.tapped.add(key.toLowerCase());
      if (this.keys.has(key) && e.repeat) return;
      this.keys.add(key);
      if (key.length === 1) {
        this.tapped.add(key.toLowerCase());
        this.typed.push(key.toLowerCase());
      } else if (key === 'Enter') {
        this.tapped.add('enter');
      }

      if (JUMP_KEYS.has(key)) {
        if (!e.repeat) this.jumpPressed = true;
        this.jumpHeld = true;
      }
      if (LEFT_KEYS.has(key)) this.left = true;
      if (RIGHT_KEYS.has(key)) this.right = true;
      if (DOWN_KEYS.has(key)) {
        if (!e.repeat) this.downPressed = true;
        this.down = true;
      }
      if (DASH_KEYS.has(key) && !e.repeat) this.dashPressed = true;
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key;
      this.keys.delete(key);
      if (JUMP_KEYS.has(key)) this.jumpHeld = false;
      if (LEFT_KEYS.has(key)) this.left = false;
      if (RIGHT_KEYS.has(key)) this.right = false;
      if (DOWN_KEYS.has(key)) this.down = false;
    });

    window.addEventListener('blur', () => this.reset());

    const toLogical = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = VIEW.w / (rect.width || 1);
      const sy = VIEW.h / (rect.height || 1);
      return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') this.touchMode = true;
      this.canvas.setPointerCapture?.(e.pointerId);
      const p = toLogical(e.clientX, e.clientY);
      this._pointers.set(e.pointerId, p);
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      this.pointer.down = true;
      if (e.button === 0 || e.pointerType !== 'mouse') this.pointer.clicked = true;
      if (this._hit('jump', p)) this._jumpPointers.add(e.pointerId);
      if (this._hit('dash', p)) this._dashPointers.add(e.pointerId);
      this._syncTouch();
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('pointermove', (e) => {
      const p = toLogical(e.clientX, e.clientY);
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      if (this._pointers.has(e.pointerId)) {
        this._pointers.set(e.pointerId, p);
        this._syncTouch();
      }
    });

    const release = (e) => {
      const wasJump = this._jumpPointers.delete(e.pointerId);
      this._dashPointers.delete(e.pointerId);
      this._pointers.delete(e.pointerId);
      if (this._pointers.size === 0) this.pointer.down = false;
      if (wasJump) this._syncTouch();
      this._syncTouch();
    };
    this.canvas.addEventListener('pointerup', release);
    this.canvas.addEventListener('pointercancel', release);
    this.canvas.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') this.pointer.down = false;
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _hit(name, p) {
    const b = TOUCH[name];
    return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  }

  _syncTouch() {
    let left = false;
    let right = false;
    let jump = false;
    let dash = false;
    for (const p of this._pointers.values()) {
      if (this._hit('left', p)) left = true;
      if (this._hit('right', p)) right = true;
      if (this._hit('jump', p)) jump = true;
      if (this._hit('dash', p)) dash = true;
    }
    const jumpPressed = jump && !this.touch.jump;
    const dashPressed = dash && !this.touch.dash;
    this.touch = { left, right, jump, dash };
    if (jumpPressed) this.touchJumpPressed = true;
    if (dashPressed) this.touchDashPressed = true;
  }

  get axis() {
    let a = 0;
    if (this.left || this.touch.left) a -= 1;
    if (this.right || this.touch.right) a += 1;
    return a;
  }

  get wantsDown() {
    return this.down;
  }

  get downQueued() {
    return this.downPressed;
  }

  consumeDown() {
    this.downPressed = false;
  }

  get wantsJump() {
    return this.jumpHeld || this.touch.jump;
  }

  get jumpQueued() {
    return this.jumpPressed || this.touchJumpPressed;
  }

  get dashQueued() {
    return this.dashPressed || this.touchDashPressed;
  }

  consumeJump() {
    this.jumpPressed = false;
    this.touchJumpPressed = false;
  }

  consumeDash() {
    this.dashPressed = false;
    this.touchDashPressed = false;
  }

  wasTapped(key) {
    return this.tapped.has(key);
  }

  takeTyped() {
    const out = this.typed;
    this.typed = [];
    return out;
  }

  beginText(initial = '', max = 14) {
    this.reset();
    this.textField = { value: String(initial || '').slice(0, max), max };
    this.textEnter = false;
    this.textCancel = false;
  }

  endText() {
    const value = this.textField ? this.textField.value : '';
    this.textField = null;
    this.textEnter = false;
    this.textCancel = false;
    return value;
  }

  get texting() {
    return !!this.textField;
  }

  get textValue() {
    return this.textField ? this.textField.value : '';
  }

  endFrame() {
    this.downPressed = false;
    this.jumpPressed = false;
    this.dashPressed = false;
    this.pausePressed = false;
    this.pointer.clicked = false;
    this.touchJumpPressed = false;
    this.touchDashPressed = false;
    this.textEnter = false;
    this.textCancel = false;
    this.tapped.clear();
    this.typed.length = 0;
  }

  reset() {
    this.keys.clear();
    this.tapped.clear();
    this.typed.length = 0;
    this.left = this.right = this.down = false;
    this.downPressed = false;
    this.jumpHeld = false;
    this.jumpPressed = false;
    this.dashPressed = false;
    this._pointers.clear();
    this._jumpPointers.clear();
    this._dashPointers.clear();
    this.pointer.down = false;
    this.touch = { left: false, right: false, jump: false, dash: false };
  }
}

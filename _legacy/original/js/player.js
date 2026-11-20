import { getCharacterData } from './profile.js';

export class Player {
  constructor(x, worldY) {
    this.x = x;
    this.worldY = worldY;
    this.vx = 0;
    this.vy = 0;
    this.width = 34;
    this.height = 42;
    this.onGround = false;
    this.falling = true;
    this.alive = true;
    this.speed = 280;
    this.jumpHeight = 55;
    this.bonusPoints = 1;
    this.trailColor = '#FFD700';
    this._baseSpeed = 280;
    this.animTimer = 0;
    this.animFrame = 0;
    this.eyeBlink = 0;
    this.color = '#FF6B6B';
    this.skinColor = '#FFDDBB';
    this.hatColor = '#4ECDC4';
    this.shirtColor = '#45B7D1';
    this.charIndex = 0;
    this.trail = [];
    this.screenY = 0;
    this._prevJumpHeld = false;
    this.powerUp = null;
    this.powerUpTimer = 0;
    this.invulnerableTimer = 0;

    this.animState = 'idle';
    this.expression = 'happy';
    this._landTimer = 0;
    this._justLanded = false;
    this._hurtTimer = 0;
    this._hairTimer = Math.random() * 100;
    this.portraitMode = false;
    this.portraitBounce = 0;
  }

  setCharacter(index) {
    this.charIndex = index;
    const c = getCharacterData(index);
    this.color = c.color;
    this.hatColor = c.hatColor;
    this.shirtColor = c.shirtColor;
    this.skinColor = c.skin;
    this.charData = c;
    if (c.stats) {
      this._baseSpeed = c.stats.speed || 280;
      this.speed = this._baseSpeed;
      this.jumpHeight = c.stats.jump || 55;
      this.bonusPoints = c.stats.bonusPoints || 1;
      this.trailColor = c.stats.trailColor || '#FFD700';
    }
  }

  activatePowerUp(type, duration) {
    this.powerUp = type;
    this.powerUpTimer = duration;
  }

  update(dt, world, input) {
    if (!this.alive) return {};

    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    this.animTimer += dt;
    this._hairTimer += dt;
    if (this.animTimer > 0.12) {
      this.animFrame = (this.animFrame + 1) % 4;
      this.animTimer = 0;
    }
    this.eyeBlink += dt;

    if (this._hurtTimer > 0) this._hurtTimer -= dt;
    if (this._landTimer > 0) this._landTimer -= dt;

    if (this.powerUpTimer > 0) {
      this.powerUpTimer -= dt;
      if (this.powerUpTimer <= 0) {
        this.powerUp = null;
        this.powerUpTimer = 0;
        this.speed = this._baseSpeed;
      }
    }

    const inputJump = input.jumpHeld || input.touchJump || input.mouseJump;
    const moveX = (input.left || input.mouseLeft || input.touchLeft) ? -1 : (input.right || input.mouseRight || input.touchRight) ? 1 : 0;

    if (this._landTimer <= 0 && this._hurtTimer <= 0) {
      this.vx = moveX * this.speed;
    }

    if (!this.onGround) {
      const gravMul = moveX === 0 ? 0.5 : 1.0;
      this.vy += world.gravity * dt * gravMul;
    }
    if (this.vy > 250) this.vy = 250;

    if (this.powerUp === 'wings') {
      if (this.vy > 120) this.vy = 120;
    }
    if (this.powerUp === 'rocket') {
      this.speed = 400;
    }

    const slowFall = inputJump || input.spaceHeld;

    const wasOnGround = this.onGround;
    const prevVY = this.vy;

    if (inputJump && !this._prevJumpHeld && this.onGround) {
      this.vy = -Math.sqrt(2 * world.gravity * this.jumpHeight);
      this.onGround = false;
    }
    if (slowFall && !this.onGround && this.vy > 0) {
      this.vy *= Math.pow(0.85, dt * 60);
      if (this.vy < 60) this.vy = 60;
    }
    if (!slowFall && !this.onGround && this.vy <= 100) {
      this.vy += world.gravity * dt * 2;
    }
    this._prevJumpHeld = inputJump;

    this.x += this.vx * dt;
    this.worldY += this.vy * dt;

    const screenWidth = world.width;
    const corridor = world.lessonCorridor || 0;
    const minX = corridor > 0 ? (screenWidth - corridor) / 2 : 0;
    const maxX = corridor > 0 ? (screenWidth + corridor) / 2 - this.width : screenWidth - this.width;
    if (this.x < minX) this.x = minX;
    if (this.x > maxX) this.x = maxX;

    this.onGround = false;
    const platforms = world.getAllPlatforms();
    for (const p of platforms) {
      if (p.broken) continue;
      if (
        this.x < p.x + p.w &&
        this.x + this.width > p.x &&
        this.worldY < p.y + p.h + 4 &&
        this.worldY + this.height > p.y - 4 &&
        this.vy >= 0 &&
        this.worldY + this.height <= p.y + 20
      ) {
        if (p.isCloud) {
          const breakSpeed = p.breakSpeed || 1;
          p.cloudOpacity -= dt * 0.8 * breakSpeed;
          if (p.cloudOpacity <= 0.05) {
            p.broken = true;
            p.cloudOpacity = 0;
            if (breakSpeed > 1) {
              return { break: true, x: p.x, y: p.y, w: p.w };
            }
          }
        }
        if (p.isBreakable && !p.broken) {
          p.broken = true;
          return { break: true, x: p.x, y: p.y, w: p.w };
        }
        if (!p.broken) {
          const justLanded = !wasOnGround && prevVY > 50;
          this.worldY = p.y - this.height;
          this.vy = 0;
          this.onGround = true;
          if (justLanded) {
            this._landTimer = 0.15;
            this._justLanded = true;
          }
        }
      }
    }

    this.falling = !this.onGround;

    if (this._justLanded && this._landTimer > 0) {
      this.animState = 'landing';
    } else if (this._hurtTimer > 0) {
      this.animState = 'hurt';
    } else if (this.vy < -30) {
      this.animState = 'jumping';
    } else if (this.vy > 30 && !this.onGround) {
      this.animState = 'falling';
    } else if (this.onGround && Math.abs(this.vx) > 10) {
      this.animState = 'running';
    } else if (this.onGround && Math.abs(this.vx) <= 10) {
      this.animState = 'idle';
    }

    if (this._justLanded) {
      this._justLanded = false;
    }

    this.trail.push({ x: this.x + this.width / 2, y: this.worldY + this.height, life: 1 });
    this.trail = this.trail.filter(t => {
      t.life -= dt * 2;
      return t.life > 0;
    });

    return {};
  }

  setExpression(expr) {
    this.expression = expr;
  }

  triggerHurt() {
    this._hurtTimer = 0.3;
    this.expression = 'hurt';
  }

  render(ctx, scrollY) {
    if (!this.alive) return;
    if (!this.portraitMode && this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 10) % 2 === 0) return;

    if (this.portraitMode) {
      this._renderBody(ctx);
      this._renderHead(ctx);
      this._renderFace(ctx);
      this._renderHair(ctx);
      this._renderAccessory(ctx);
      return;
    }

    this.screenY = this.worldY - scrollY;
    const px = Math.round(this.x);
    const py = Math.round(this.screenY);

    if (py > ctx.canvas.height + 50 || py < -50) return;

    for (const t of this.trail) {
      const alpha = t.life * 0.25;
      const tc = this.trailColor || '#FFD700';
      const r = parseInt(tc.slice(1,3), 16);
      const g = parseInt(tc.slice(3,5), 16);
      const b = parseInt(tc.slice(5,7), 16);

      ctx.save();
      ctx.globalAlpha = alpha * 0.4;
      const grad = ctx.createRadialGradient(
        Math.round(t.x), Math.round(t.y - scrollY), 0,
        Math.round(t.x), Math.round(t.y - scrollY), 8 * t.life
      );
      grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(Math.round(t.x), Math.round(t.y - scrollY), 8 * t.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.beginPath();
      ctx.arc(Math.round(t.x), Math.round(t.y - scrollY), 4 * t.life, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.powerUp && this.powerUpTimer > 0) {
      this._renderPowerUpFX(ctx, px, py);
    }

    const bobY = this.onGround ? Math.sin(this.animTimer * 8) * 1.5 : 0;
    const totalY = py + bobY;
    const squash = this.vy > 200 ? 1 + this.vy * 0.0003 : 1;
    const stretch = this.vy > 200 ? 1 - this.vy * 0.0002 : 1;

    ctx.save();
    ctx.translate(px + this.width / 2, totalY + this.height / 2);
    ctx.scale(1 / squash, 1 / stretch);

    this._renderShadow(ctx);
    this._renderBody(ctx);
    this._renderHead(ctx);
    this._renderFace(ctx);
    this._renderHair(ctx);
    this._renderAccessory(ctx);

    if (this.powerUp && this.powerUpTimer > 0) {
      this._renderPowerUpGlow(ctx);
    }

    ctx.restore();
  }

  _renderShadow(ctx) {
    ctx.save();
    const groundY = this.height / 2 + 2;
    const shadowAlpha = this.onGround ? 0.25 : 0.08;
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(0, groundY, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _renderBody(ctx) {
    const cd = this.charData || {};
    const sc = this.shirtColor;
    const runCycle = Math.sin(this.animTimer * 10);
    const isRunning = this.animState === 'running';
    const isJumping = this.animState === 'jumping';
    const isFalling = this.animState === 'falling';
    const isLanding = this.animState === 'landing';

    const bodyTop = -2;
    const bodyBottom = 14;
    const bodyW = 14;

    const legOffset = isLanding ? 2 : 0;

    ctx.save();

    if (isLanding) {
      ctx.translate(0, 2);
      ctx.scale(1.15, 0.85);
    }

    ctx.fillStyle = sc;
    ctx.beginPath();
    ctx.roundRect(-bodyW, bodyTop, bodyW * 2, bodyBottom - bodyTop + 2, 4);
    ctx.fill();

    const shirtHighlight = ctx.createLinearGradient(-bodyW, bodyTop, bodyW, bodyTop);
    shirtHighlight.addColorStop(0, `rgba(255,255,255,0.15)`);
    shirtHighlight.addColorStop(0.5, `rgba(255,255,255,0.05)`);
    shirtHighlight.addColorStop(1, `rgba(0,0,0,0.08)`);
    ctx.fillStyle = shirtHighlight;
    ctx.fillRect(-bodyW, bodyTop, bodyW * 2, 4);

    ctx.fillStyle = sc;
    ctx.beginPath();
    ctx.ellipse(0, bodyTop, bodyW + 2, 6, 0, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, bodyTop - 1, bodyW + 3, 3, 0, 0, Math.PI);
    ctx.fill();

    if (cd.outfit && cd.outfit.top === 'tank-top') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.roundRect(-bodyW + 2, bodyTop + 2, 4, 8, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(bodyW - 6, bodyTop + 2, 4, 8, 2);
      ctx.fill();
    } else if (cd.outfit && cd.outfit.top === 'jacket') {
      ctx.strokeStyle = `rgba(0,0,0,0.15)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, bodyTop + 2);
      ctx.lineTo(0, bodyBottom - 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(0,0,0,0.08)`;
      ctx.beginPath();
      ctx.roundRect(-bodyW - 2, bodyTop + 6, 3, 6, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(bodyW - 1, bodyTop + 6, 3, 6, 2);
      ctx.fill();
    } else if (cd.outfit && cd.outfit.top === 'sweater') {
      ctx.fillStyle = `rgba(255,255,255,0.12)`;
      ctx.beginPath();
      ctx.roundRect(-5, bodyTop + 1, 10, 3, 2);
      ctx.fill();
      ctx.fillStyle = `rgba(0,0,0,0.06)`;
      ctx.beginPath();
      ctx.roundRect(-3, bodyTop + 5, 6, 4, 2);
      ctx.fill();
    } else if (cd.outfit && cd.outfit.top === 'overalls') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.roundRect(-bodyW, bodyTop + 4, bodyW * 2, bodyBottom - bodyTop - 2, 3);
      ctx.fill();
      ctx.fillStyle = sc;
      ctx.beginPath();
      ctx.roundRect(-bodyW, bodyTop, bodyW * 2, 6, 3);
      ctx.fill();
      ctx.strokeStyle = `rgba(0,0,0,0.1)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-4, bodyTop + 4);
      ctx.lineTo(-4, bodyTop + 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4, bodyTop + 4);
      ctx.lineTo(4, bodyTop + 12);
      ctx.stroke();
    }

    const armSwing = isRunning ? runCycle * 8 : (isFalling || isJumping) ? -6 + Math.sin(this._hairTimer * 8) * 2 : 0;

    ctx.fillStyle = this.skinColor;
    ctx.beginPath();
    ctx.roundRect(-bodyW - 5, 2 + armSwing * 0.5, 4, 12, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(bodyW + 1, 2 - armSwing * 0.5, 4, 12, 3);
    ctx.fill();

    if (isFalling || isJumping) {
      ctx.fillStyle = this.skinColor;
      ctx.beginPath();
      ctx.arc(-bodyW - 3, 14 + armSwing * 0.5, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bodyW + 3, 14 - armSwing * 0.5, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const legL = isRunning ? runCycle * 6 : (isJumping) ? -4 : 0;
    const legR = isRunning ? -runCycle * 6 : (isJumping) ? -4 : 0;

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(-8, bodyBottom + legOffset + legL, 5, 6, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(3, bodyBottom + legOffset + legR, 5, 6, 3);
    ctx.fill();

    const shoeColor = this._getShoeColor(cd);
    ctx.fillStyle = shoeColor;
    const shoeW = 6;
    const shoeH = 3;
    const shoeY = bodyBottom + 5;
    ctx.beginPath();
    ctx.ellipse(-5.5 + (isRunning ? runCycle * 3 : 0), shoeY + legOffset + legL, shoeW, shoeH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(5.5 + (isRunning ? -runCycle * 3 : 0), shoeY + legOffset + legR, shoeW, shoeH, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(0,0,0,0.15)`;
    ctx.beginPath();
    ctx.ellipse(-5.5, shoeY + 1 + legOffset + legL, shoeW, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(5.5, shoeY + 1 + legOffset + legR, shoeW, 1, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _getShoeColor(cd) {
    if (!cd.outfit) return '#3D2317';
    switch (cd.outfit.shoes) {
      case 'sneakers': return '#FFFFFF';
      case 'sandals': return '#8B6914';
      case 'boots': return '#5D4037';
      case 'flip-flops': return '#00BCD4';
      case 'barefoot': return this.skinColor;
      case 'ballet': return '#FFB0C0';
      default: return '#3D2317';
    }
  }

  _renderHead(ctx) {
    ctx.save();
    const headY = -10;
    const headR = 11;

    ctx.fillStyle = this.skinColor;
    ctx.beginPath();
    ctx.arc(0, headY, headR, 0, Math.PI * 2);
    ctx.fill();

    const headShade = ctx.createRadialGradient(-3, headY - 4, 0, 0, headY, headR);
    headShade.addColorStop(0, `rgba(255,255,255,0.2)`);
    headShade.addColorStop(1, `rgba(0,0,0,0.06)`);
    ctx.fillStyle = headShade;
    ctx.beginPath();
    ctx.arc(0, headY, headR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.skinColor;
    ctx.beginPath();
    ctx.ellipse(0, headY + headR - 2, headR, 5, 0, 0, Math.PI);
    ctx.fill();

    ctx.fillStyle = `rgba(255,200,170,0.15)`;
    ctx.beginPath();
    ctx.arc(0, headY + 3, 5, 0, Math.PI);
    ctx.fill();

    ctx.restore();
  }

  _renderFace(ctx) {
    const cd = this.charData || {};
    const headY = -10;
    const expr = this.expression;
    const blinkCycle = this.eyeBlink % 4;

    ctx.save();

    const eyeShape = cd.eyes ? cd.eyes.shape : 'round';
    const eyeColor = cd.eyes ? cd.eyes.color : '#2C3E50';

    const eyeOff = Math.abs(this.vx) > 50 ? (this.vx > 0 ? 2 : -2) : 0;

    const browY = headY - 6;
    const eyeY = headY - 1;
    const eyeSpacing = 8;

    let browL = 0, browR = 0, browAngleL = 0, browAngleR = 0;
    let eyeW = 4, eyeH = 4.5;
    let mouthShape = 'smile';
    let mouthY = headY + 5;
    let blush = false;

    switch (expr) {
      case 'happy':
        browL = -0.5; browR = -0.5;
        browAngleL = -0.1; browAngleR = 0.1;
        mouthShape = 'smile';
        blush = true;
        break;
      case 'determined':
        browL = -1.5; browR = -1.5;
        browAngleL = 0.2; browAngleR = -0.2;
        mouthShape = 'flat';
        break;
      case 'scared':
        browL = 2; browR = 2;
        browAngleL = 0.3; browAngleR = -0.3;
        eyeW = 5; eyeH = 5.5;
        mouthShape = 'open';
        blush = true;
        break;
      case 'hurt':
        browL = 1; browR = -1;
        browAngleL = -0.3; browAngleR = 0.3;
        mouthShape = 'frown';
        break;
      case 'surprised':
        browL = 2.5; browR = 2.5;
        browAngleL = 0; browAngleR = 0;
        eyeW = 5; eyeH = 5.5;
        mouthShape = 'circle';
        break;
      case 'focused':
        browL = -1; browR = -1;
        browAngleL = 0.15; browAngleR = -0.15;
        eyeH = 3.5;
        mouthShape = 'flat';
        break;
      default:
        mouthShape = 'smile';
    }

    if (this._hurtTimer > 0) {
      mouthShape = 'hurt';
    }

    ctx.fillStyle = this.skinColor;
    const browLX = -eyeSpacing / 2 + eyeOff * 0.3;
    const browRX = eyeSpacing / 2 + eyeOff * 0.3;
    ctx.save();
    ctx.translate(browLX, browY + browL);
    ctx.rotate(browAngleL);
    ctx.fillRect(-3.5, -0.5, 7, 1.8);
    ctx.restore();
    ctx.save();
    ctx.translate(browRX, browY + browR);
    ctx.rotate(browAngleR);
    ctx.fillRect(-3.5, -0.5, 7, 1.8);
    ctx.restore();

    eyeW += Math.random() * 0.01;
    eyeH += Math.random() * 0.01;

    if (blinkCycle < 3.7) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(-eyeSpacing / 2 + eyeOff, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(eyeSpacing / 2 + eyeOff, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = eyeColor;
      const irisSize = 2.5;
      const lookDir = eyeOff * 0.3;
      ctx.beginPath();
      ctx.arc(-eyeSpacing / 2 + eyeOff + lookDir, eyeY + 0.5, irisSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeSpacing / 2 + eyeOff + lookDir, eyeY + 0.5, irisSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-eyeSpacing / 2 + eyeOff + lookDir + 1, eyeY - 0.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeSpacing / 2 + eyeOff + lookDir + 1, eyeY - 0.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = this.skinColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-eyeSpacing / 2 + eyeOff - 3, eyeY);
      ctx.lineTo(-eyeSpacing / 2 + eyeOff + 3, eyeY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(eyeSpacing / 2 + eyeOff - 3, eyeY);
      ctx.lineTo(eyeSpacing / 2 + eyeOff + 3, eyeY);
      ctx.stroke();
    }

    ctx.fillStyle = `rgba(200, 130, 130, ${blush ? 0.2 : 0})`;
    ctx.beginPath();
    ctx.ellipse(-eyeSpacing / 2 - 2, eyeY + 4, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(eyeSpacing / 2 + 2, eyeY + 4, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2C3E50';
    switch (mouthShape) {
      case 'smile':
        ctx.beginPath();
        ctx.arc(0, mouthY, 3, 0.1, Math.PI - 0.1);
        ctx.stroke();
        break;
      case 'flat':
        ctx.beginPath();
        ctx.moveTo(-3, mouthY);
        ctx.lineTo(3, mouthY);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      case 'open':
        ctx.beginPath();
        ctx.ellipse(0, mouthY + 1, 3, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.ellipse(0, mouthY + 2, 2, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'frown':
        ctx.beginPath();
        ctx.arc(0, mouthY + 2, 3, Math.PI + 0.2, -0.2);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, mouthY + 1, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.arc(0, mouthY + 1, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'hurt':
        ctx.beginPath();
        ctx.moveTo(-2, mouthY);
        ctx.lineTo(0, mouthY - 1);
        ctx.lineTo(2, mouthY);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
    }

    ctx.fillStyle = this.skinColor;
    ctx.beginPath();
    ctx.ellipse(0, headY + 2, 1.5, 1, 0, Math.PI, 0);
    ctx.strokeStyle = `rgba(0,0,0,0.15)`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.restore();
  }

  _renderHair(ctx) {
    const cd = this.charData;
    if (!cd || !cd.hair) {
      this._renderHat(ctx);
      return;
    }

    const headY = -10;
    const headR = 11;
    const hairColor = cd.hair.color;
    const hairSec = cd.hair.secondary || hairColor;
    const t = this._hairTimer;
    const vy = Math.min(1, Math.abs(this.vy) / 150);
    const vx = Math.min(1, Math.abs(this.vx) / 200);
    const swaySpeed = 4;
    const swayAmount = 3 + vy * 5 + vx * 3;

    ctx.save();

    switch (cd.hair.style) {
      case 'spiky': {
        const spikes = 7;
        for (let i = 0; i < spikes; i++) {
          const angle = -Math.PI / 2 + (i / (spikes - 1) - 0.5) * 1.6;
          const baseX = Math.cos(angle) * headR;
          const baseY = headY + Math.sin(angle) * headR;
          const sway = Math.sin(t * swaySpeed + i * 1.2) * swayAmount * 0.3;
          const tipX = baseX * 1.8 + sway;
          const tipY = headY - headR - 6 - Math.abs(sway) * 0.3 + Math.sin(t * 3 + i) * 1;
          ctx.fillStyle = i % 2 === 0 ? hairColor : hairSec;
          ctx.beginPath();
          ctx.moveTo(baseX - 2, baseY);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(baseX + 2, baseY);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case 'flowing': {
        const strands = 5;
        for (let i = 0; i < strands; i++) {
          const offset = (i / (strands - 1) - 0.5) * 12;
          const baseX = offset;
          const baseY = headY + headR - 2;
          const sway = Math.sin(t * swaySpeed * 0.7 + i * 0.8) * swayAmount * 0.8 + vy * 8;
          ctx.fillStyle = i % 2 === 0 ? hairColor : hairSec;
          ctx.beginPath();
          ctx.moveTo(baseX - 2, baseY);
          ctx.quadraticCurveTo(baseX + sway * 0.5 - 2, headY + 6, baseX + sway, headY + 16 + i * 2);
          ctx.quadraticCurveTo(baseX + sway * 0.5 + 2, headY + 6, baseX + 2, baseY);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case 'twintails': {
        const sides = [-1, 1];
        for (const side of sides) {
          const baseX = side * (headR * 0.9);
          const baseY = headY + 2;
          const sway = Math.sin(t * swaySpeed * 0.6 + (side + 1) * 2) * swayAmount * 0.7;
          ctx.fillStyle = side === -1 ? hairColor : hairSec;
          ctx.beginPath();
          ctx.moveTo(baseX - 2 * side, baseY);
          const cpX = baseX + side * (6 + sway * 0.5 + Math.sin(t * 3 + side) * 2);
          const cpY = headY + 4 + Math.cos(t * 2 + side) * 3;
          const endX = baseX + side * (8 + sway);
          const endY = headY + 16;
          ctx.quadraticCurveTo(cpX, cpY, endX, endY);
          ctx.quadraticCurveTo(cpX - side * 3, cpY + 2, baseX + 2 * side, baseY + 2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = `rgba(255,255,255,0.15)`;
          ctx.beginPath();
          ctx.moveTo(baseX - 1 * side, baseY + 1);
          ctx.quadraticCurveTo(cpX, cpY - 2, endX, endY - 2);
          ctx.quadraticCurveTo(cpX - side * 2, cpY, baseX + 1 * side, baseY + 2);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case 'messy': {
        for (let i = 0; i < 12; i++) {
          const angle = -Math.PI / 2 + (i / 11 - 0.5) * 2.2;
          const baseX = Math.cos(angle) * headR * 0.9;
          const baseY = headY + Math.sin(angle) * headR * 0.8;
          const sway = Math.sin(t * 5 + i * 1.7) * swayAmount * 0.5;
          const tipX = baseX * 1.5 + sway;
          const tipY = headY - headR - 4 + Math.sin(t * 4 + i * 0.5) * 2;
          ctx.fillStyle = i < 6 ? hairColor : hairSec;
          ctx.beginPath();
          ctx.ellipse(tipX, tipY, 3 + Math.sin(t + i) * 0.5, 5 + Math.cos(t * 0.5 + i) * 1, angle * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'wavy': {
        for (let i = 0; i < 6; i++) {
          const offset = (i / 5 - 0.5) * 14;
          const baseX = offset;
          const baseY = headY + headR - 3;
          const sway = Math.sin(t * 3 + i * 1.1) * swayAmount * 0.6 + Math.sin(t * 7 + i * 2) * 3;
          ctx.fillStyle = i % 2 === 0 ? hairColor : hairSec;
          ctx.beginPath();
          ctx.moveTo(baseX - 3, baseY);
          for (let step = 0; step < 3; step++) {
            const sy = baseY + step * 6;
            const sx = baseX + Math.sin(t * 4 + i * 1.5 + step * 0.5) * 4 + sway * (step / 3);
            ctx.quadraticCurveTo(sx, sy + 3, sx + 2, sy + 6);
          }
          ctx.lineTo(baseX + 3, baseY + 18);
          ctx.lineTo(baseX + 1, baseY);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case 'curly': {
        const tuftCount = 8;
        for (let tuff = 0; tuff < tuftCount; tuff++) {
          const angle = -Math.PI / 2 + (tuff / (tuftCount - 1) - 0.5) * 1.8;
          const baseX = Math.cos(angle) * headR * 0.8;
          const baseY = headY + Math.sin(angle) * headR * 0.7;
          const sway = Math.sin(t * 3 + tuff * 2.3) * 2;
          const cx = baseX + sway;
          const cy = headY - headR - 3 + Math.sin(t * 2 + tuff) * 1.5;
          ctx.fillStyle = tuff % 2 === 0 ? hairColor : hairSec;
          ctx.beginPath();
          ctx.arc(cx, cy, 5 + Math.sin(t * 2.5 + tuff) * 1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(0,0,0,0.08)`;
        ctx.beginPath();
        ctx.arc(0, headY - headR + 1, headR * 0.7, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'ponytail': {
        for (let i = 0; i < 4; i++) {
          const offset = (i / 3 - 0.5) * 10;
          const baseX = 2 + offset * 0.3;
          const baseY = headY - headR + 2;
          const sway = Math.sin(t * swaySpeed * 0.5 + i * 1.3) * swayAmount * 0.8 + vy * 6;
          ctx.fillStyle = i % 2 === 0 ? hairColor : hairSec;
          ctx.beginPath();
          ctx.moveTo(baseX - 2, baseY);
          ctx.quadraticCurveTo(baseX + sway * 0.3 - 2, headY - 2, baseX + sway - 2, headY + 14 + i * 1.5);
          ctx.quadraticCurveTo(baseX + sway * 0.3 + 2, headY - 2, baseX + 2, baseY);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = hairSec;
        ctx.beginPath();
        ctx.ellipse(3, headY - headR - 1, 4, 2.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'sleek': {
        ctx.fillStyle = hairColor;
        ctx.beginPath();
        ctx.ellipse(0, headY - 2, headR + 3, headR + 2, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        const leftSway = Math.sin(t * 2) * 1;
        const rightSway = Math.sin(t * 2 + 1) * 1;
        ctx.moveTo(-headR - 2 + leftSway, headY + 2);
        ctx.quadraticCurveTo(-headR - 4 + leftSway, headY + 8, -headR - 2 + leftSway, headY + 14);
        ctx.lineTo(headR + 2 + rightSway, headY + 14);
        ctx.quadraticCurveTo(headR + 4 + rightSway, headY + 8, headR + 2 + rightSway, headY + 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,0.1)`;
        ctx.beginPath();
        ctx.ellipse(3, headY - 4, 4, headR + 1, 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      default:
        this._renderHat(ctx);
    }

    ctx.restore();
  }

  _renderHat(ctx) {
    const t = this._hairTimer;
    const hatBob = Math.sin(t * 6) * 1.5;
    ctx.save();
    ctx.fillStyle = this.hatColor;
    ctx.beginPath();
    ctx.ellipse(0 + hatBob, -17, 17, 7, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0 + hatBob, -20, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00000020';
    ctx.beginPath();
    ctx.ellipse(0 + hatBob, -20, 12, 5, 0, 0, Math.PI);
    ctx.fill();
    const hatTopBob = Math.sin(t * 6 + 0.5) * 1.5;
    ctx.fillStyle = this.hatColor;
    ctx.beginPath();
    ctx.ellipse(0 + hatTopBob, -26, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0 + hatTopBob, -29, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _renderAccessory(ctx) {
    const cd = this.charData;
    if (!cd || !cd.accessory) return;
    const t = this._hairTimer;
    const a = cd.accessory;

    ctx.save();

    switch (a.type) {
      case 'backpack': {
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.roundRect(12, -8, 8, 14, 4);
        ctx.fill();
        ctx.strokeStyle = `rgba(0,0,0,0.15)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(12, -8, 8, 14, 4);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,0.2)`;
        ctx.beginPath();
        ctx.roundRect(14, -4, 4, 3, 2);
        ctx.fill();
        break;
      }
      case 'scarf': {
        const sway = Math.sin(t * 5) * 2;
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.roundRect(5, -14, 10, 4, 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-6, -12 + sway, 6, 3, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(6, -12 + sway * 0.5, 6, 3, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,0.15)`;
        ctx.beginPath();
        ctx.ellipse(-5, -13 + sway, 4, 1.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'headband': {
        ctx.strokeStyle = a.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(-7, -15, 8, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(7, -15, 8, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.arc(0, -14, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'goggles': {
        ctx.strokeStyle = a.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(-5, -11, 6, 4.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(5, -11, 6, 4.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = a.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(0, -8);
        ctx.stroke();
        ctx.fillStyle = `rgba(150,200,255,0.1)`;
        ctx.beginPath();
        ctx.ellipse(-5, -11, 5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(5, -11, 5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'shell_necklace': {
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 5; i++) {
          const nx = -4 + i * 2;
          const ny = -4 + Math.sin(i * 1.5 + t * 2) * 1.5;
          ctx.beginPath();
          ctx.arc(nx, ny, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.arc(0, -5 + Math.sin(t * 3) * 1, 1.8, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'flower_crown': {
        const flowers = ['#FF6B6B', '#FFD93D', '#C084FC', '#4DD0E1', '#81C784'];
        for (let i = 0; i < 5; i++) {
          const angle = -Math.PI / 2 + (i / 5 - 0.5) * 1.2;
          const fx = Math.cos(angle) * 11;
          const fy = -16 + Math.sin(angle) * 4;
          ctx.fillStyle = flowers[i];
          ctx.beginPath();
          for (let p = 0; p < 5; p++) {
            const pa = (p / 5) * Math.PI * 2 - Math.PI / 2;
            const pr = 2.5;
            if (p === 0) ctx.moveTo(fx + Math.cos(pa) * pr, fy + Math.sin(pa) * pr);
            else ctx.lineTo(fx + Math.cos(pa) * pr, fy + Math.sin(pa) * pr);
          }
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(fx, fy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'tiara': {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(-8, -17);
        ctx.lineTo(-9, -19);
        ctx.lineTo(-5, -18);
        ctx.lineTo(0, -21);
        ctx.lineTo(5, -18);
        ctx.lineTo(9, -19);
        ctx.lineTo(8, -17);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, -17, 9, 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#FF69B4';
        ctx.beginPath();
        ctx.arc(0, -20, 1.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'earmuffs': {
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.ellipse(-11, -10, 4, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(11, -10, 4, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = a.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -11, 10, Math.PI * 0.8, Math.PI * 0.2);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,0.2)`;
        ctx.beginPath();
        ctx.ellipse(-11, -10, 3, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(11, -10, 3, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }

  _renderPowerUpFX(ctx, px, py) {
    const pulse = Math.sin(Date.now() / 150) * 0.2 + 0.8;
    if (this.powerUp === 'shield') {
      ctx.save();
      ctx.strokeStyle = `rgba(0, 200, 255, ${0.5 * pulse})`;
      ctx.lineWidth = 4;
      ctx.shadowColor = 'rgba(0, 200, 255, 0.4)';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(px + this.width / 2, py + this.height / 2, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(0, 200, 255, ${0.1 * pulse})`;
      ctx.beginPath();
      ctx.arc(px + this.width / 2, py + this.height / 2, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
    if (this.powerUp === 'rocket') {
      const fl = Math.sin(Date.now() / 60) * 6 + 12;
      ctx.save();
      ctx.fillStyle = `rgba(255, 150, 0, ${0.7 * pulse})`;
      ctx.shadowColor = 'rgba(255, 100, 0, 0.5)';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(px + this.width / 2 - 6, py + this.height + 4);
      ctx.lineTo(px + this.width / 2, py + this.height + 8 + fl);
      ctx.lineTo(px + this.width / 2 + 6, py + this.height + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(255, 50, 0, ${0.5 * pulse})`;
      ctx.beginPath();
      ctx.moveTo(px + this.width / 2 - 3, py + this.height + 2);
      ctx.lineTo(px + this.width / 2, py + this.height + 5 + fl);
      ctx.lineTo(px + this.width / 2 + 3, py + this.height + 2);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
    if (this.powerUp === 'wings') {
      ctx.save();
      const wingFlap = Math.sin(Date.now() / 150) * 4;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * pulse})`;
      ctx.shadowColor = 'rgba(200, 200, 255, 0.3)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(this.x - 10, py + 10 + wingFlap, 16, 6, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(this.x + this.width + 10, py + 10 + wingFlap, 16, 6, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
    if (this.powerUp === 'x2') {
      ctx.save();
      ctx.shadowColor = `rgba(255, 215, 0, ${0.5 * pulse})`;
      ctx.shadowBlur = 25;
      ctx.fillStyle = `rgba(255, 215, 0, ${0.15 * pulse})`;
      ctx.beginPath();
      ctx.arc(px + this.width / 2, py + this.height / 2, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255, 215, 0, ${0.8 * pulse})`;
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('x2', px + this.width / 2, py + this.height / 2);
      ctx.restore();
    }
    if (this.powerUp === 'streak') {
      ctx.save();
      ctx.shadowColor = `rgba(255, 100, 255, ${0.5 * pulse})`;
      ctx.shadowBlur = 25;
      ctx.fillStyle = `rgba(255, 100, 255, ${0.12 * pulse})`;
      ctx.beginPath();
      ctx.arc(px + this.width / 2, py + this.height / 2, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255, 100, 255, ${0.8 * pulse})`;
      ctx.font = 'bold 16px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('x∞', px + this.width / 2, py + this.height / 2);
      ctx.restore();
    }
  }

  _renderPowerUpGlow(ctx) {
    const pulse = Math.sin(Date.now() / 150) * 0.2 + 0.8;
    const puGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
    let glowColor = '200,200,255';
    if (this.powerUp === 'shield') glowColor = '0,200,255';
    else if (this.powerUp === 'rocket') glowColor = '255,150,0';
    else if (this.powerUp === 'x2') glowColor = '255,215,0';
    else if (this.powerUp === 'streak') glowColor = '255,100,255';
    puGlow.addColorStop(0, `rgba(${glowColor},${0.15 * pulse})`);
    puGlow.addColorStop(1, `rgba(${glowColor},0)`);
    ctx.fillStyle = puGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
  }
}

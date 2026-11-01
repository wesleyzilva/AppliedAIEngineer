import { Container, Graphics, Text, Sprite, Texture } from 'pixi.js';
import { TILE_SIZE, FAMILY_MEMBERS } from '../config/constants.js';

export class Player extends Container {
  constructor(col, row, memberKey, isPlayerOne = true, loadedImage = null) {
    super();
    this.gridCol = col;
    this.gridRow = row;
    this.memberKey = memberKey;
    this.member = FAMILY_MEMBERS[memberKey];
    this.isPlayerOne = isPlayerOne;
    this.hp = 100;
    this.alive = true;

    this.bodyShape = new Graphics();
    this.addChild(this.bodyShape);

    this.avatarContainer = new Container();
    this.addChild(this.avatarContainer);

    this.hpBar = new Graphics();
    this.addChild(this.hpBar);

    this.nameLabel = new Text({
      text: `${this.member.name} (${isPlayerOne ? 'P1' : 'P2'})`,
      style: {
        fontFamily: 'monospace',
        fontSize: 10,
        fill: isPlayerOne ? 0xf87171 : 0x38bdf8,
        fontWeight: 'bold'
      }
    });
    this.nameLabel.anchor.set(0.5, 1);
    this.nameLabel.position.set(TILE_SIZE / 2, -6);
    this.addChild(this.nameLabel);

    this.floatText = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 14,
        fill: 0xff0055,
        fontWeight: 'bold',
        stroke: { color: 0xffffff, width: 3 }
      }
    });
    this.floatText.anchor.set(0.5, 1);
    this.floatText.position.set(TILE_SIZE / 2, -18);
    this.floatText.alpha = 0;
    this.addChild(this.floatText);

    this.drawFallback();
    if (loadedImage) {
      this.applyImageTexture(loadedImage);
    }
    this.drawHp();
    this.syncPixelPosition();
  }

  applyImageTexture(imgElement) {
    try {
      const texture = Texture.from(imgElement);
      const sprite = new Sprite(texture);
      const size = TILE_SIZE * 0.78;
      sprite.width = size;
      sprite.height = size;
      sprite.anchor.set(0.5);
      sprite.position.set(TILE_SIZE / 2, TILE_SIZE / 2);

      const mask = new Graphics();
      mask.circle(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE * 0.39);
      mask.fill(0xffffff);

      sprite.mask = mask;
      this.avatarContainer.removeChildren();
      this.avatarContainer.addChild(mask);
      this.avatarContainer.addChild(sprite);
    } catch {
      // Fallback
    }
  }

  drawFallback() {
    this.bodyShape.clear();
    this.bodyShape.circle(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE * 0.4);
    this.bodyShape.fill(this.member.color);
    this.bodyShape.stroke({ width: 3, color: this.isPlayerOne ? 0xef4444 : 0x3b82f6 });
  }

  drawHp() {
    this.hpBar.clear();
    const w = TILE_SIZE - 8;
    this.hpBar.rect(4, -5, w, 4).fill(0x1f2937);
    const fillW = Math.max(0, (this.hp / 100) * w);
    this.hpBar.rect(4, -5, fillW, 4).fill(this.hp > 50 ? 0x22c55e : 0xef4444);
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.drawHp();

    this.floatText.text = `-${amount} HP!`;
    this.floatText.alpha = 1.0;

    if (this.hp <= 0) {
      this.alive = false;
      this.alpha = 0.25;
      this.floatText.text = '💀 ELIMINADO!';
    }
  }

  update(dt) {
    if (this.floatText.alpha > 0) {
      this.floatText.alpha -= dt * 0.8;
      this.floatText.y -= dt * 15;
    }
  }

  syncPixelPosition() {
    this.position.set(this.gridCol * TILE_SIZE, this.gridRow * TILE_SIZE);
  }

  tryMove(dCol, dRow, grid, bombs, enemyPlayer = null) {
    if (!this.alive) return false;
    const targetCol = this.gridCol + dCol;
    const targetRow = this.gridRow + dRow;

    const hasBomb = bombs.some(b => b.col === targetCol && b.row === targetRow);
    const hitsEnemy = enemyPlayer && enemyPlayer.alive && enemyPlayer.gridCol === targetCol && enemyPlayer.gridRow === targetRow;

    if (grid.isWalkable(targetCol, targetRow) && !hasBomb && !hitsEnemy) {
      this.gridCol = targetCol;
      this.gridRow = targetRow;
      this.syncPixelPosition();
      return true;
    }
    return false;
  }
}

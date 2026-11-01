import { Container, Graphics } from 'pixi.js';
import { TILE_SIZE } from '../config/constants.js';

export class Bomb extends Container {
  constructor(col, row, owner, onExplode) {
    super();
    this.col = col;
    this.row = row;
    this.owner = owner;
    this.radius = 2;
    this.timer = 2.0;
    this.onExplode = onExplode;

    this.shape = new Graphics();
    this.shape.circle(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE * 0.32);
    this.shape.fill(0x111827);
    this.shape.stroke({ width: 3, color: owner.isPlayerOne ? 0xef4444 : 0x38bdf8 });
    this.addChild(this.shape);

    this.position.set(col * TILE_SIZE, row * TILE_SIZE);
  }

  update(dtSeconds) {
    this.timer -= dtSeconds;
    const scale = 1 + Math.sin(this.timer * 15) * 0.09;
    this.shape.scale.set(scale);

    if (this.timer <= 0) {
      this.onExplode?.(this);
      return true;
    }
    return false;
  }
}

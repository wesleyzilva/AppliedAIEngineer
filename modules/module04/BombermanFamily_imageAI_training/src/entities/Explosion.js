import { Container, Graphics } from 'pixi.js';
import { TILE_SIZE, TILE_TYPES } from '../config/constants.js';

export class Explosion extends Container {
  constructor(originCol, originRow, radius, grid) {
    super();
    this.duration = 0.45;
    this.elapsed = 0;
    this.affectedCells = [];

    this.graphics = new Graphics();
    this.addChild(this.graphics);

    this.calculateAndTrigger(originCol, originRow, radius, grid);
    this.draw();
  }

  calculateAndTrigger(originCol, originRow, radius, grid) {
    this.affectedCells.push({ col: originCol, row: originRow });
    const dirs = [{ dc: 0, dr: -1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 1, dr: 0 }];
    let destroyed = false;

    for (const { dc, dr } of dirs) {
      for (let s = 1; s <= radius; s++) {
        const c = originCol + dc * s;
        const r = originRow + dr * s;
        const tile = grid.matrix[r]?.[c];
        if (tile === undefined || tile === TILE_TYPES.WALL_SOLID) break;
        this.affectedCells.push({ col: c, row: r });
        if (tile === TILE_TYPES.WALL_BRICK) {
          grid.matrix[r][c] = TILE_TYPES.EMPTY;
          destroyed = true;
          break;
        }
      }
    }
    if (destroyed) grid.render();
  }

  draw() {
    this.graphics.clear();
    for (const cell of this.affectedCells) {
      const x = cell.col * TILE_SIZE;
      const y = cell.row * TILE_SIZE;
      this.graphics.rect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8).fill(0xf97316);
      this.graphics.rect(x + 12, y + 12, TILE_SIZE - 24, TILE_SIZE - 24).fill(0xfef08a);
    }
  }

  update(dt) {
    this.elapsed += dt;
    this.alpha = Math.max(0, 1 - (this.elapsed / this.duration));
    return this.elapsed >= this.duration;
  }
}

import { Graphics } from 'pixi.js';
import { TILE_SIZE, COLS, ROWS, TILE_TYPES } from '../config/constants.js';

export class Grid {
  constructor(matrix) {
    this.matrix = matrix;
    this.graphics = new Graphics();
    this.render();
  }

  render() {
    this.graphics.clear();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const type = this.matrix[r][c];
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        this.graphics.rect(x, y, TILE_SIZE, TILE_SIZE);
        this.graphics.fill(0x0f172a);
        this.graphics.stroke({ width: 1, color: 0x1e293b });

        if (type === TILE_TYPES.WALL_SOLID) {
          this.graphics.rect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          this.graphics.fill(0x334155);
          this.graphics.stroke({ width: 2, color: 0x475569 });
        } else if (type === TILE_TYPES.WALL_BRICK) {
          this.graphics.rect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          this.graphics.fill(0xb45309);
          this.graphics.stroke({ width: 2, color: 0xd97706 });
        }
      }
    }
  }

  isWalkable(col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    const t = this.matrix[row][col];
    return t === TILE_TYPES.EMPTY || t === TILE_TYPES.SPAWN;
  }
}

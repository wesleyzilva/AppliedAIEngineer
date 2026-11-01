import { COLS, ROWS, TILE_TYPES } from '../config/constants.js';

export class MazeGenerator {
  static generate() {
    const matrix = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
          row.push(TILE_TYPES.WALL_SOLID);
        } else if (r % 2 === 0 && c % 2 === 0) {
          row.push(TILE_TYPES.WALL_SOLID);
        } else if (
          (r <= 2 && c <= 2) ||
          (r >= ROWS - 3 && c >= COLS - 3)
        ) {
          row.push(TILE_TYPES.SPAWN);
        } else {
          row.push(Math.random() < 0.48 ? TILE_TYPES.WALL_BRICK : TILE_TYPES.EMPTY);
        }
      }
      matrix.push(row);
    }
    return matrix;
  }
}

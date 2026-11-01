import { COLS, ROWS, TILE_TYPES } from '../config/constants.js';

export class FeatureVectorizer {
  static buildTacticalState(grid, self, enemy, bombs, faceVector) {
    const dangerMap = this.computeDangerMap(grid, bombs);

    const dirs = [
      { idx: 0, dc: 0, dr: -1 }, // 0: CIMA
      { idx: 1, dc: 0, dr: 1 },  // 1: BAIXO
      { idx: 2, dc: -1, dr: 0 }, // 2: ESQUERDA
      { idx: 3, dc: 1, dr: 0 }   // 3: DIREITA
    ];

    const walkable = dirs.map(({ dc, dr }) => {
      const nc = self.gridCol + dc;
      const nr = self.gridRow + dr;
      const hasBomb = bombs.some(b => b.col === nc && b.row === nr);
      return grid.isWalkable(nc, nr) && !hasBomb ? 1.0 : 0.0;
    });

    const dirDanger = dirs.map(({ dc, dr }) => {
      const nc = self.gridCol + dc;
      const nr = self.gridRow + dr;
      return dangerMap[nr]?.[nc] ?? 1.0;
    });

    const currentDanger = dangerMap[self.gridRow]?.[self.gridCol] ?? 0.0;

    // 1. Se estiver dentro do raio de uma bomba (sua ou do inimigo), descobre via BFS qual direção leva para fora da explosão!
    const escapeDirIndex = currentDanger > 0
      ? this.findEscapeFirstStep(grid, self.gridCol, self.gridRow, bombs, dangerMap)
      : -1;

    // 2. Direção ótima via BFS para se aproximar do inimigo ou de um tijolo destrutível no caminho
    const huntTarget = this.findHuntFirstStep(grid, self.gridCol, self.gridRow, enemy.gridCol, enemy.gridRow, bombs, dangerMap);

    const dx = (enemy.gridCol - self.gridCol) / COLS;
    const dy = (enemy.gridRow - self.gridRow) / ROWS;
    const manhattanDist = Math.abs(enemy.gridCol - self.gridCol) + Math.abs(enemy.gridRow - self.gridRow);

    const adjacentBrick = dirs.some(({ dc, dr }) => {
      const nc = self.gridCol + dc;
      const nr = self.gridRow + dr;
      return grid.matrix[nr]?.[nc] === TILE_TYPES.WALL_BRICK;
    }) ? 1.0 : 0.0;

    // Verifica se o inimigo está na linha de tiro direta de uma bomba plantada aqui
    const enemyInBlastLine = (
      (self.gridCol === enemy.gridCol && Math.abs(self.gridRow - enemy.gridRow) <= 2) ||
      (self.gridRow === enemy.gridRow && Math.abs(self.gridCol - enemy.gridCol) <= 2)
    ) ? 1.0 : 0.0;

    const canEscapeIfBomb = this.hasSafeEscape(grid, self.gridCol, self.gridRow, bombs) ? 1.0 : 0.0;

    return {
      walkable,
      dirDanger,
      currentDanger,
      escapeDirIndex,
      huntDirIndex: huntTarget.firstDir,
      dx,
      dy,
      manhattanDist,
      adjacentBrick,
      enemyInBlastLine,
      canEscapeIfBomb,
      selfCol: self.gridCol,
      selfRow: self.gridRow,
      enemyCol: enemy.gridCol,
      enemyRow: enemy.gridRow,
      faceSample: faceVector.slice(0, 4)
    };
  }

  static computeDangerMap(grid, bombs) {
    const map = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    const dirs = [{ dc: 0, dr: -1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 1, dr: 0 }];

    for (const b of bombs) {
      const urgency = Math.max(0.35, Math.min(1.0, (2.2 - b.timer) / 2.2));
      map[b.row][b.col] = Math.max(map[b.row][b.col], urgency);

      for (const { dc, dr } of dirs) {
        for (let s = 1; s <= b.radius; s++) {
          const c = b.col + dc * s;
          const r = b.row + dr * s;
          const tile = grid.matrix[r]?.[c];
          if (tile === undefined || tile === TILE_TYPES.WALL_SOLID) break;
          map[r][c] = Math.max(map[r][c], urgency);
          if (tile === TILE_TYPES.WALL_BRICK) break;
        }
      }
    }
    return map;
  }

  /**
   * Busca em Largura (BFS) para encontrar o PRIMEIRO PASSO exato que tira o jogador da cruz de explosão
   */
  static findEscapeFirstStep(grid, startCol, startRow, bombs, dangerMap) {
    const dirs = [
      { idx: 0, dc: 0, dr: -1 },
      { idx: 1, dc: 0, dr: 1 },
      { idx: 2, dc: -1, dr: 0 },
      { idx: 3, dc: 1, dr: 0 }
    ];

    const queue = [];
    const visited = new Set([`${startCol},${startRow}`]);

    for (const d of dirs) {
      const nc = startCol + d.dc;
      const nr = startRow + d.dr;
      const hasBomb = bombs.some(b => b.col === nc && b.row === nr);
      if (grid.isWalkable(nc, nr) && !hasBomb) {
        visited.add(`${nc},${nr}`);
        queue.push({ c: nc, r: nr, firstDir: d.idx, steps: 1 });
      }
    }

    while (queue.length > 0) {
      const curr = queue.shift();
      if ((dangerMap[curr.r]?.[curr.c] ?? 1.0) === 0) {
        return curr.firstDir; // Encontrou a célula segura mais próxima fora da explosão!
      }
      if (curr.steps >= 6) continue;

      for (const d of dirs) {
        const nc = curr.c + d.dc;
        const nr = curr.r + d.dr;
        const key = `${nc},${nr}`;
        const hasBomb = bombs.some(b => b.col === nc && b.row === nr);
        if (!visited.has(key) && grid.isWalkable(nc, nr) && !hasBomb) {
          visited.add(key);
          queue.push({ c: nc, r: nr, firstDir: curr.firstDir, steps: curr.steps + 1 });
        }
      }
    }

    // Fallback: qualquer direção caminhável
    for (const d of dirs) {
      const nc = startCol + d.dc;
      const nr = startRow + d.dr;
      const hasBomb = bombs.some(b => b.col === nc && b.row === nr);
      if (grid.isWalkable(nc, nr) && !hasBomb) return d.idx;
    }
    return 5;
  }

  /**
   * Encontra o primeiro passo seguro em direção ao inimigo (evitando pisar em zonas de explosão ativa)
   */
  static findHuntFirstStep(grid, startCol, startRow, targetCol, targetRow, bombs, dangerMap) {
    const dirs = [
      { idx: 0, dc: 0, dr: -1 },
      { idx: 1, dc: 0, dr: 1 },
      { idx: 2, dc: -1, dr: 0 },
      { idx: 3, dc: 1, dr: 0 }
    ];

    let bestFirstDir = -1;
    let bestDist = Infinity;

    const queue = [];
    const visited = new Set([`${startCol},${startRow}`]);

    for (const d of dirs) {
      const nc = startCol + d.dc;
      const nr = startRow + d.dr;
      const hasBomb = bombs.some(b => b.col === nc && b.row === nr);
      const isSafe = (dangerMap[nr]?.[nc] ?? 1.0) === 0;
      if (grid.isWalkable(nc, nr) && !hasBomb && isSafe) {
        visited.add(`${nc},${nr}`);
        queue.push({ c: nc, r: nr, firstDir: d.idx, steps: 1 });
      }
    }

    while (queue.length > 0) {
      const curr = queue.shift();
      const dist = Math.abs(targetCol - curr.c) + Math.abs(targetRow - curr.r);
      if (dist < bestDist) {
        bestDist = dist;
        bestFirstDir = curr.firstDir;
      }
      if (dist <= 1 || curr.steps >= 10) continue;

      for (const d of dirs) {
        const nc = curr.c + d.dc;
        const nr = curr.r + d.dr;
        const key = `${nc},${nr}`;
        const hasBomb = bombs.some(b => b.col === nc && b.row === nr);
        const isSafe = (dangerMap[nr]?.[nc] ?? 1.0) === 0;
        if (!visited.has(key) && grid.isWalkable(nc, nr) && !hasBomb && isSafe) {
          visited.add(key);
          queue.push({ c: nc, r: nr, firstDir: curr.firstDir, steps: curr.steps + 1 });
        }
      }
    }

    return { firstDir: bestFirstDir };
  }

  static hasSafeEscape(grid, startCol, startRow, bombs) {
    const simulatedBombs = [...bombs, { col: startCol, row: startRow, timer: 2.0, radius: 2 }];
    const dangerMap = this.computeDangerMap(grid, simulatedBombs);
    const step = this.findEscapeFirstStep(grid, startCol, startRow, simulatedBombs, dangerMap);
    return step !== 5 && step !== -1;
  }
}

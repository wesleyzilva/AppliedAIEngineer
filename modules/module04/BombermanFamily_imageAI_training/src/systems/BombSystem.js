import { Container } from 'pixi.js';
import { Bomb } from '../entities/Bomb.js';
import { Explosion } from '../entities/Explosion.js';
import { EXPLOSION_RADII } from '../config/constants.js';

export class BombSystem {
  constructor(stage, grid) {
    this.stage = stage;
    this.grid = grid;
    this.container = new Container();
    this.stage.addChild(this.container);

    this.bombs = [];
    this.explosions = [];
    this.currentRadius = EXPLOSION_RADII.MEDIUM; // Padrão: Raio Médio (2 blocos)
  }

  hasBombAt(col, row) {
    return this.bombs.some((b) => b.col === col && b.row === row);
  }

  placeBomb(col, row) {
    if (this.hasBombAt(col, row)) return false;

    const bomb = new Bomb(col, row, (explodedBomb) => {
      this.detonate(explodedBomb);
    });

    this.bombs.push(bomb);
    this.container.addChild(bomb);
    return true;
  }

  detonate(bomb) {
    const idx = this.bombs.indexOf(bomb);
    if (idx !== -1) {
      this.bombs.splice(idx, 1);
      this.container.removeChild(bomb);
    }

    const explosion = new Explosion(
      bomb.col,
      bomb.row,
      this.currentRadius,
      this.grid,
      (finishedExplosion) => {
        this.container.removeChild(finishedExplosion);
      }
    );

    this.explosions.push(explosion);
    this.container.addChild(explosion);

    // Reação em cadeia: verifica se a explosão atingiu outra bomba ativa
    for (const otherBomb of [...this.bombs]) {
      const hit = explosion.affectedCells.some(
        (c) => c.col === otherBomb.col && c.row === otherBomb.row
      );
      if (hit) {
        this.detonate(otherBomb);
      }
    }
  }

  update(dtSeconds) {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      this.bombs[i].update(dtSeconds);
    }

    for (let i = this.explosions.length - 1; i >= 0; i--) {
      if (this.explosions[i].update(dtSeconds)) {
        this.explosions.splice(i, 1);
      }
    }
  }
}
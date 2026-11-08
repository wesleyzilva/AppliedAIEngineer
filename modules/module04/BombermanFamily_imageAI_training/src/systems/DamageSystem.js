export class DamageSystem {
  static applyExplosionDamage(explosion, targets, amount) {
    const victims = targets.filter((target) =>
      target.alive && explosion.affectedCells.some(
        (cell) => cell.col === target.gridCol && cell.row === target.gridRow
      )
    );

    for (const victim of victims) {
      victim.takeDamage(amount);
    }

    return victims;
  }
}
import { SCREEN_WIDTH, SCREEN_HEIGHT, TILE_SIZE } from '../config/constants.js';
import { logger } from '../core/Logger.js';

export class YoloDetector {
  static lastLoggedSignature = '';

  static inspectArena(grid, p1, p2, bombs, explosions, overlayCanvas, outputElement, enabled = true, filterClassId = -1) {
    const ctx = overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    const allDetections = [];

    if (p1 && p1.alive) {
      allDetections.push(this.createBox(0, `P1_${p1.member.name}`, p1.gridCol, p1.gridRow, 0.98, '#ef4444'));
    }
    if (p2 && p2.alive) {
      allDetections.push(this.createBox(1, `P2_${p2.member.name}`, p2.gridCol, p2.gridRow, 0.96, '#38bdf8'));
    }
    for (const b of bombs) {
      allDetections.push(this.createBox(2, 'BOMBA', b.col, b.row, 0.99, '#facc15'));
    }
    for (const exp of explosions) {
      for (const cell of exp.affectedCells) {
        allDetections.push(this.createBox(3, 'FOGO', cell.col, cell.row, 0.95, '#f97316'));
      }
    }

    // FILTRAGEM DA CLASSE DESEJADA (ex: -1 = Todas, 0 = P1, 1 = P2, 2 = Bomba, 3 = Fogo)
    const filteredDetections = filterClassId === -1
      ? allDetections
      : allDetections.filter(d => d.classId === filterClassId);

    // Onde encontrou o PRIMEIRO OBJETO da classe filtrada
    const firstObj = filteredDetections.length > 0 ? filteredDetections[0] : null;

    if (enabled) {
      ctx.font = 'bold 10px monospace';
      for (const det of filteredDetections) {
        const isFirst = det === firstObj;
        ctx.strokeStyle = isFirst ? '#00ffcc' : det.color;
        ctx.lineWidth = isFirst ? 3 : 2;
        ctx.strokeRect(det.pxX + 2, det.pxY + 2, det.pxW - 4, det.pxH - 4);

        const prefix = isFirst ? '1º ' : '';
        const label = `${prefix}${det.label} ${(det.conf * 100).toFixed(0)}%`;
        const textW = ctx.measureText(label).width + 6;
        ctx.fillStyle = isFirst ? '#00ffcc' : det.color;
        ctx.fillRect(det.pxX + 2, Math.max(0, det.pxY - 13), textW, 13);
        ctx.fillStyle = '#000';
        ctx.fillText(label, det.pxX + 5, Math.max(10, det.pxY - 3));
      }
    }

    if (outputElement) {
      if (firstObj) {
        outputElement.textContent =
          `🔍 TELA: ${SCREEN_WIDTH}x${SCREEN_HEIGHT}px | FILTRO: ${filterClassId === -1 ? 'Todas' : 'Classe ' + filterClassId} (${filteredDetections.length} obj)\n` +
          `🎯 1º OBJETO ENCONTRADO: [${firstObj.label}] (class_id=${firstObj.classId} | conf=${(firstObj.conf * 100).toFixed(0)}%)\n` +
          `📍 Posição Pixel: X=${firstObj.pxX}px, Y=${firstObj.pxY}px (Grid col=${firstObj.col}, row=${firstObj.row})\n` +
          `📐 BBox YOLO Norm [0-1]: cx=${firstObj.cx} cy=${firstObj.cy} w=${firstObj.w} h=${firstObj.h}`;
      } else {
        outputElement.textContent = `🔍 TELA: ${SCREEN_WIDTH}x${SCREEN_HEIGHT}px | Nenhum objeto da classe selecionada (${filterClassId}) na cena.`;
      }
    }

    // Loga no console apenas quando surge uma nova classe relevante (ex: Bomba ou Fogo) ou muda o filtro, evitando flood!
    if (firstObj) {
      const sig = `${filterClassId}:${firstObj.classId}:${filteredDetections.length}`;
      if (sig !== this.lastLoggedSignature && (firstObj.classId >= 2 || this.lastLoggedSignature === '')) {
        this.lastLoggedSignature = sig;
        logger.log(
          'YOLO',
          `1º Objeto filtrado identificado: ${firstObj.label} (class=${firstObj.classId}) em X=${firstObj.pxX}px, Y=${firstObj.pxY}px | Norm=[cx:${firstObj.cx}, cy:${firstObj.cy}]`
        );
      }
    }

    return filteredDetections;
  }

  static createBox(classId, label, col, row, conf, color) {
    const pxX = col * TILE_SIZE;
    const pxY = row * TILE_SIZE;
    const pxW = TILE_SIZE;
    const pxH = TILE_SIZE;

    const cx = ((pxX + pxW / 2) / SCREEN_WIDTH).toFixed(3);
    const cy = ((pxY + pxH / 2) / SCREEN_HEIGHT).toFixed(3);
    const w = (pxW / SCREEN_WIDTH).toFixed(3);
    const h = (pxH / SCREEN_HEIGHT).toFixed(3);

    return { classId, label, col, row, pxX, pxY, pxW, pxH, cx, cy, w, h, conf, color };
  }
}

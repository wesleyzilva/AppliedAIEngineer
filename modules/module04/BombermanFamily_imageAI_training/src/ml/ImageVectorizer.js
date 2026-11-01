import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';
import { logger } from '../core/Logger.js';

// Contador didático de tensores na memória para demonstrar alocação e liberação (dispose)
export const TensorMemoryTracker = {
  activeTensors: 0,
  totalAllocated: 0,
  totalDisposed: 0,

  allocate(name, shape, data) {
    this.activeTensors++;
    this.totalAllocated++;
    this.updateUI();
    return {
      name,
      shape,
      data,
      disposed: false,
      dispose: () => {
        if (!this.disposed) {
          this.activeTensors = Math.max(0, this.activeTensors - 1);
          this.totalDisposed++;
          this.updateUI();
        }
      }
    };
  },

  updateUI() {
    const el = document.getElementById('m-tensor-mem');
    if (el) {
      el.textContent = `Ativos: ${this.activeTensors} | Limpos (dispose): ${this.totalDisposed}`;
    }
  }
};

export class ImageVectorizer {
  static async extractNormalizedFaceVector(member, canvasId) {
    logger.setStep(1);
    logger.log(
      'PRE-PROC',
      `[CHECKPOINT 1 - ENTRADA] Tela observada: ${SCREEN_WIDTH}x${SCREEN_HEIGHT}px | Iniciando recorte facial 32x32px de ${member.name}...`
    );

    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, 32, 32);

    const img = await this.tryLoadImage(member.candidateSprites);

    if (img) {
      ctx.drawImage(img, 0, 0, 32, 32);
      logger.log('PRE-PROC', `Foto real de ${member.name} (${img.width}x${img.height}px) redimensionada para tensor de imagem [32, 32, 3].`);
    } else {
      this.drawProceduralFace(ctx, member);
      logger.log('PRE-PROC', `Avatar sintético 32x32 gerado para ${member.name} (adicione ${member.id}.png em public/ para foto real).`);
    }

    // PASSO 2: Aloca Tensor Bruto RGBA e converte para Luminância
    logger.setStep(2);
    const imgData = ctx.getImageData(0, 0, 32, 32).data;
    const rawTensor = TensorMemoryTracker.allocate(`RawRGBA_${member.name}`, [32, 32, 4], imgData);
    logger.log(
      'MEMORIA',
      `Tensor bruto alocado: ${rawTensor.name} shape=[32,32,4] (${imgData.length} bytes) | Tensores ativos: ${TensorMemoryTracker.activeTensors}`
    );

    const rawFeatures255 = new Array(16).fill(0);
    const normalizedFeatures = new Array(16).fill(0);

    let blockIdx = 0;
    for (let br = 0; br < 4; br++) {
      for (let bc = 0; bc < 4; bc++) {
        let sumLum255 = 0;
        for (let r = br * 8; r < (br + 1) * 8; r++) {
          for (let c = bc * 8; c < (bc + 1) * 8; c++) {
            const idx = (r * 32 + c) * 4;
            const red = rawTensor.data[idx];
            const green = rawTensor.data[idx + 1];
            const blue = rawTensor.data[idx + 2];
            sumLum255 += (red * 0.299 + green * 0.587 + blue * 0.114);
          }
        }
        const avg255 = Math.round(sumLum255 / 64);
        rawFeatures255[blockIdx] = avg255;
        normalizedFeatures[blockIdx] = Number((avg255 / 255.0).toFixed(2));
        blockIdx++;
      }
    }

    // Desenha a grade 4x4 sobre o rosto para visualização do pré-processamento
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.55)';
    ctx.lineWidth = 0.5;
    for (let i = 8; i < 32; i += 8) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 32); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(32, i); ctx.stroke();
    }

    // PASSO 3: Normalização concluída -> Libera memória do tensor bruto (dispose)
    logger.setStep(3);
    rawTensor.dispose();
    logger.log(
      'MEMORIA',
      `[DISPOSE] ${rawTensor.name}.dispose() executado! Memória bruta liberada | Tensores ativos: ${TensorMemoryTracker.activeTensors}`
    );

    logger.log(
      'VALIDACAO',
      `[CHECKPOINT 2 - NORMALIZAÇÃO] ${member.name}: Bruto[0-255]=[${rawFeatures255.slice(0, 4).join(', ')}...] ➔ Norm[0-1]=[${normalizedFeatures.slice(0, 4).join(', ')}...]`
    );

    return {
      rawFeatures255,
      normalizedFeatures,
      imageElement: img
    };
  }

  static tryLoadImage(urls) {
    return new Promise((resolve) => {
      let index = 0;
      const next = () => {
        if (index >= urls.length) {
          resolve(null);
          return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => { index++; next(); };
        img.src = urls[index];
      };
      next();
    });
  }

  static drawProceduralFace(ctx, member) {
    const hex = '#' + member.color.toString(16).padStart(6, '0');
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#0f172a';
    const offset = member.id.charCodeAt(0) % 4;
    ctx.fillRect(6 + offset, 8, 6, 6);
    ctx.fillRect(20 - offset, 8, 6, 6);
    ctx.fillRect(8, 21, 16, 5);
  }
}

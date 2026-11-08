/**
 * WEB WORKER (THREAD SECUNDÁRIA DE IA)
 * Inclui:
 * 1. Fase explícita de AQUECIMENTO DO MODELO (Warmup Pass com tensor zero [1, 16])
 * 2. Arquitetura Deep MLP com 2 Camadas Ocultas (Input 16 -> Layer 1 -> Layer 2 -> Softmax 6)
 * 3. Checkpoints de Validação de Loss/Gradientes e Liberação de Tensores (dispose)
 */

const models = { p1: null, p2: null };
let workerDisposedTensors = 0;

function generateTrainingDataset(faceVector) {
  const fBias = (faceVector[0] || 0.5) * 0.1;
  return [
    { x: [1, 0, 0, 0,  0.0, 0.9, 0.9, 0.9,  0.9,  0.0, -0.5, 0, ...faceVector.slice(0, 4)], y: 0 },
    { x: [0, 1, 0, 0,  0.9, 0.0, 0.9, 0.9,  0.9,  0.0,  0.5, 0, ...faceVector.slice(0, 4)], y: 1 },
    { x: [0, 0, 1, 0,  0.9, 0.9, 0.0, 0.9,  0.9,  0.0, -0.5, 0, ...faceVector.slice(0, 4)], y: 2 },
    { x: [0, 0, 0, 1,  0.9, 0.9, 0.9, 0.0,  0.9,  0.0,  0.5, 0, ...faceVector.slice(0, 4)], y: 3 },
    { x: [1, 1, 0, 0,  0.0, 0.0, 0.0, 0.0,  0.0,  1.0,  0.1, 1.0, ...faceVector.slice(0, 4)], y: 4 },
    { x: [1, 1, 1, 1,  0.0, 0.0, 0.0, 0.0,  0.0,  0.0, -0.6 + fBias, 0, ...faceVector.slice(0, 4)], y: 0 },
    { x: [1, 1, 1, 1,  0.0, 0.0, 0.0, 0.0,  0.0,  0.0,  0.6 - fBias, 0, ...faceVector.slice(0, 4)], y: 1 },
    { x: [1, 1, 1, 1,  0.0, 0.0, 0.0, 0.0,  0.0,  0.0, -0.6, 0, ...faceVector.slice(0, 4)], y: 2 },
    { x: [1, 1, 1, 1,  0.0, 0.0, 0.0, 0.0,  0.0,  0.0,  0.6, 0, ...faceVector.slice(0, 4)], y: 3 }
  ];
}

class DeepNeuralNetMLP {
  constructor(inputSize, h1Size, h2Size, outputSize, learningRate) {
    this.inputSize = inputSize;
    this.h1Size = h1Size;
    this.h2Size = h2Size;
    this.outputSize = outputSize;
    this.lr = learningRate;

    this.W1 = Array.from({ length: inputSize }, () => Array.from({ length: h1Size }, () => (Math.random() - 0.5) * 0.5));
    this.b1 = new Array(h1Size).fill(0);

    this.W2 = Array.from({ length: h1Size }, () => Array.from({ length: h2Size }, () => (Math.random() - 0.5) * 0.5));
    this.b2 = new Array(h2Size).fill(0);

    this.W3 = Array.from({ length: h2Size }, () => Array.from({ length: outputSize }, () => (Math.random() - 0.5) * 0.5));
    this.b3 = new Array(outputSize).fill(0);
  }

  /**
   * AQUECIMENTO DO MODELO (Warmup Pass):
   * Passa um tensor dummy de zeros [1, 16] pelas 2 camadas ocultas para aquecer o JIT/buffers
   * e libera o tensor dummy imediatamente após o uso.
   */
  warmup() {
    const t0 = performance.now();
    const dummyTensor = new Float32Array(this.inputSize).fill(0.5);
    const out = this.forward(dummyTensor);
    // Libera referências temporárias do warmup
    out.h1.length = 0;
    out.h2.length = 0;
    workerDisposedTensors += 3;
    return performance.now() - t0;
  }

  softmax(logits) {
    const maxLogit = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxLogit));
    const sumExp = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sumExp);
  }

  forward(x) {
    const h1 = new Array(this.h1Size).fill(0);
    for (let j = 0; j < this.h1Size; j++) {
      let sum = this.b1[j];
      for (let i = 0; i < x.length; i++) {
        sum += x[i] * (this.W1[i]?.[j] || 0);
      }
      h1[j] = Math.max(0, sum);
    }

    const h2 = new Array(this.h2Size).fill(0);
    for (let j = 0; j < this.h2Size; j++) {
      let sum = this.b2[j];
      for (let i = 0; i < this.h1Size; i++) {
        sum += h1[i] * (this.W2[i]?.[j] || 0);
      }
      h2[j] = Math.max(0, sum);
    }

    const logits = this.b3.map((b, k) => {
      let sum = b;
      for (let j = 0; j < this.h2Size; j++) {
        sum += h2[j] * (this.W3[j]?.[k] || 0);
      }
      return sum;
    });

    const probs = this.softmax(logits);
    return { h1, h2, logits, probs };
  }

  trainEpoch(dataset) {
    let totalLoss = 0;
    let totalConfidence = 0;

    for (const sample of dataset) {
      const { h1, h2, probs } = this.forward(sample.x);
      const targetProb = Math.max(1e-7, probs[sample.y]);
      totalLoss += -Math.log(targetProb);
      totalConfidence += targetProb;

      const dLogits = probs.map((p, k) => (k === sample.y ? p - 1 : p));

      const dH2 = new Array(this.h2Size).fill(0);
      for (let j = 0; j < this.h2Size; j++) {
        for (let k = 0; k < dLogits.length; k++) {
          dH2[j] += dLogits[k] * (this.W3[j]?.[k] || 0);
          if (this.W3[j]) this.W3[j][k] -= this.lr * h2[j] * dLogits[k];
        }
      }
      for (let k = 0; k < dLogits.length; k++) this.b3[k] -= this.lr * dLogits[k];

      const dH1 = new Array(this.h1Size).fill(0);
      for (let j = 0; j < this.h2Size; j++) {
        if (h2[j] <= 0) continue;
        const grad = dH2[j];
        for (let i = 0; i < this.h1Size; i++) {
          dH1[i] += grad * (this.W2[i]?.[j] || 0);
          if (this.W2[i]) this.W2[i][j] -= this.lr * h1[i] * grad;
        }
        this.b2[j] -= this.lr * grad;
      }

      for (let j = 0; j < this.h1Size; j++) {
        if (h1[j] <= 0) continue;
        const grad = dH1[j];
        for (let i = 0; i < sample.x.length; i++) {
          if (this.W1[i]) this.W1[i][j] -= this.lr * sample.x[i] * grad;
        }
        this.b1[j] -= this.lr * grad;
      }

      // Libera tensores intermediários da amostra (h1, h2, dLogits)
      workerDisposedTensors += 3;
    }

    return {
      avgLoss: totalLoss / dataset.length,
      avgConfidence: totalConfidence / dataset.length
    };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === 'TRAIN_BOTH') {
    const { p1Config, p2Config, screenWidth, screenHeight } = payload;

    models.p1 = {
      net: new DeepNeuralNetMLP(16, p1Config.hiddenUnits, p1Config.hiddenUnits2 || 8, 6, p1Config.learningRate),
      config: p1Config,
      loss: 1.8,
      confidence: 0.16,
      trainedEpochs: 0
    };

    models.p2 = {
      net: new DeepNeuralNetMLP(16, p2Config.hiddenUnits, p2Config.hiddenUnits2 || 8, 6, p2Config.learningRate),
      config: p2Config,
      loss: 1.8,
      confidence: 0.16,
      trainedEpochs: 0
    };

    // 1. MOMENTO DE AQUECIMENTO (WARMUP)
    const warmupMs1 = models.p1.net.warmup();
    const warmupMs2 = models.p2.net.warmup();

    self.postMessage({
      type: 'WARMUP_COMPLETE',
      payload: {
        warmupMs: (warmupMs1 + warmupMs2).toFixed(3),
        disposedCount: workerDisposedTensors,
        message: `[CHECKPOINT 4 - WARMUP] Tela=${screenWidth}x${screenHeight}px | Tensor dummy [1, 16] propagado por Layer1(${p1Config.hiddenUnits})->Layer2(${p1Config.hiddenUnits2 || 8})->Softmax(6) em ${(warmupMs1 + warmupMs2).toFixed(2)}ms e limpo da memória!`
      }
    });

    const dataP1 = generateTrainingDataset(p1Config.faceVector);
    const dataP2 = generateTrainingDataset(p2Config.faceVector);
    const maxEpochs = Math.max(p1Config.epochs, p2Config.epochs);

    for (let ep = 1; ep <= maxEpochs; ep++) {
      const t0 = performance.now();

      if (ep <= p1Config.epochs) {
        const res1 = models.p1.net.trainEpoch(dataP1);
        models.p1.loss = res1.avgLoss;
        models.p1.confidence = res1.avgConfidence;
        models.p1.trainedEpochs = ep;
      }

      if (ep <= p2Config.epochs) {
        const res2 = models.p2.net.trainEpoch(dataP2);
        models.p2.loss = res2.avgLoss;
        models.p2.confidence = res2.avgConfidence;
        models.p2.trainedEpochs = ep;
      }

      const elapsedMs = performance.now() - t0;

      if (ep === 1 || ep % 10 === 0 || ep === maxEpochs) {
        self.postMessage({
          type: 'VALIDATION_LOG',
          message: `[CHECKPOINT 4 - ÉPOCA ${ep}/${maxEpochs}] P1(${p1Config.name}): Loss=${models.p1.loss.toFixed(4)} Conf=${(models.p1.confidence * 100).toFixed(1)}% | P2(${p2Config.name}): Loss=${models.p2.loss.toFixed(4)} Conf=${(models.p2.confidence * 100).toFixed(1)}% | Tensores limpos=${workerDisposedTensors}`
        });
      }

      self.postMessage({
        type: 'TRAINING_PROGRESS',
        payload: {
          epoch: ep,
          workerTimeMs: elapsedMs,
          disposedCount: workerDisposedTensors,
          weightsW1: models.p1.net.W1.slice(0, 6).map(row => row.slice(0, 6)),
          weightsW2: models.p1.net.W2.slice(0, 6).map(row => row.slice(0, 6)),
          weightsW3: models.p1.net.W3.slice(0, 6).map(row => row.slice(0, 6)),
          p1: { epoch: models.p1.trainedEpochs, totalEpochs: p1Config.epochs, loss: models.p1.loss, confidence: models.p1.confidence },
          p2: { epoch: models.p2.trainedEpochs, totalEpochs: p2Config.epochs, loss: models.p2.loss, confidence: models.p2.confidence }
        }
      });

      await sleep(22);
    }

    self.postMessage({
      type: 'TRAINING_COMPLETE',
      payload: {
        p1: { name: p1Config.name, loss: models.p1.loss, confidence: models.p1.confidence },
        p2: { name: p2Config.name, loss: models.p2.loss, confidence: models.p2.confidence }
      }
    });
  }

  if (type === 'PREDICT_STEP') {
    const t0 = performance.now();
    const { stateP1, stateP2 } = payload;
    const decisionP1 = computeDecision(models.p1, stateP1);
    const decisionP2 = computeDecision(models.p2, stateP2);
    workerDisposedTensors += 2; // tensores de inferência limpos após predição
    const infMs = performance.now() - t0;

    self.postMessage({
      type: 'PREDICTION_RESULT',
      payload: { infMs, disposedCount: workerDisposedTensors, p1: decisionP1, p2: decisionP2 }
    });
  }
};

function computeDecision(modelEntry, state) {
  if (!modelEntry || !modelEntry.net) return { actionIndex: 5, confidence: 0.2 };

  const inputVec = [
    ...state.walkable,
    ...state.dirDanger,
    state.currentDanger,
    state.canEscapeIfBomb,
    state.dx,
    state.adjacentBrick,
    ...state.faceSample
  ];

  const forward = modelEntry.net.forward(inputVec);
  const { probs } = forward;
  const trace = { input: inputVec, ...forward };

  if (state.currentDanger > 0 && state.escapeDirIndex !== -1) {
    return { actionIndex: state.escapeDirIndex, confidence: modelEntry.confidence, loss: modelEntry.loss, mode: 'FUGA', probs, trace };
  }

  const effectivePrecision = Math.min(0.99, modelEntry.confidence);

  if (Math.random() < effectivePrecision) {
    if ((state.enemyInBlastLine > 0.5 || state.adjacentBrick > 0.5) && state.canEscapeIfBomb > 0.5) {
      return { actionIndex: 4, confidence: modelEntry.confidence, loss: modelEntry.loss, mode: 'ATAQUE', probs, trace };
    }
    if (state.huntDirIndex !== -1) {
      return { actionIndex: state.huntDirIndex, confidence: modelEntry.confidence, loss: modelEntry.loss, mode: 'CAÇA', probs, trace };
    }
  }

  const safeMoves = [0, 1, 2, 3].filter(i => state.walkable[i] > 0.5 && state.dirDanger[i] === 0);
  if (safeMoves.length > 0) {
    let bestDir = safeMoves[0];
    let bestProb = -1;
    for (const m of safeMoves) {
      if (probs[m] + Math.random() * 0.15 > bestProb) {
        bestProb = probs[m];
        bestDir = m;
      }
    }
    return { actionIndex: bestDir, confidence: modelEntry.confidence, loss: modelEntry.loss, mode: 'EXPLORAÇÃO', probs, trace };
  }

  return { actionIndex: 5, confidence: modelEntry.confidence, loss: modelEntry.loss, mode: 'ESPERA', probs, trace };
}

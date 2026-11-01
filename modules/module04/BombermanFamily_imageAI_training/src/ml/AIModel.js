import * as tf from '@tensorflow/tfjs';
import { logger } from '../core/Logger.js';

export class AIModel {
  constructor(memberName) {
    this.memberName = memberName;
    this.isTrained = false;
    this.epochs = 0;
    this.loss = 0.5;
    this.confidence = 0.5;
    this.model = null;
  }

  async init() {
    logger.log(`Inicializando modelo neural para ${this.memberName}...`);
    // Criando modelo sequencial simples para predição de ações (Cima, Baixo, Esquerda, Direita, Ficar, Bomba)
    this.model = tf.sequential();
    this.model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [4 + 195] })); // 4 coords + 15*13 grid
    this.model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    this.model.add(tf.layers.dense({ units: 6, activation: 'softmax' })); // 6 ações possíveis

    this.model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    this.isTrained = true;
    logger.log(`Modelo para ${this.memberName} compilado com sucesso.`);
  }

  async trainStep(featureVector, targetActionIndex) {
    if (!this.model) return;

    const xs = tf.tensor2d([Array.from(featureVector)]);
    const ys = tf.tensor2d([Array.from({length: 6}, (_, i) => i === targetActionIndex ? 1 : 0)]);

    const response = await this.model.fit(xs, ys, { epochs: 1, verbose: 0 });
    this.loss = response.history.loss[0];
    this.epochs += 1;
    this.confidence = Math.min(0.99, 0.4 + (this.epochs * 0.03));

    xs.dispose();
    ys.dispose();
  }

  predictAction(featureVector) {
    if (!this.model) return 0;

    const xs = tf.tensor2d([Array.from(featureVector)]);
    const prediction = this.model.predict(xs);
    const data = prediction.dataSync();
    
    // Escolhe a ação com maior probabilidade (argmax)
    let maxIdx = 0;
    let maxVal = data[0];
    for (let i = 1; i < data.length; i++) {
      if (data[i] > maxVal) {
        maxVal = data[i];
        maxIdx = i;
      }
    }

    xs.dispose();
    prediction.dispose();
    return maxIdx;
  }
}

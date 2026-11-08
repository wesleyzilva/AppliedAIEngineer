import { Application, Text } from 'pixi.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT, COLS, ROWS, FAMILY_MEMBERS, ACTIONS } from './config/constants.js';
import { MazeGenerator } from './map/MazeGenerator.js';
import { Grid } from './map/Grid.js';
import { Player } from './entities/Player.js';
import { Bomb } from './entities/Bomb.js';
import { Explosion } from './entities/Explosion.js';
import { DamageSystem } from './systems/DamageSystem.js';
import { ImageVectorizer, TensorMemoryTracker } from './ml/ImageVectorizer.js';
import { FeatureVectorizer } from './ml/FeatureVectorizer.js';
import { YoloDetector } from './ml/YoloDetector.js';
import { DatasetExporter } from './ml/DatasetExporter.js';
import { initStudyConsole } from './ml/StudyConsole.js';
import { logger } from './core/Logger.js';

async function bootstrap() {
  const app = new Application();
  await app.init({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    background: 0x0f172a,
    antialias: false
  });

  document.getElementById('game-container').appendChild(app.canvas);

  const yoloOverlay = document.getElementById('yolo-overlay');
  const yoloOutputEl = document.getElementById('yolo-labels-output');
  const nnCanvas = document.getElementById('nn-canvas');
  const nnCtx = nnCanvas.getContext('2d');

  const aiWorker = new Worker(new URL('./ml/ai.worker.js', import.meta.url), { type: 'module' });

  let grid, p1, p2;
  let rawFaceP1 = [], faceVecP1 = [], faceVecP2 = [];
  let currentRgbSample = [];
  let currentSourceDimensions = { width: 32, height: 32 };
  let showNormalizedMatrix = true;
  let yoloEnabled = true;
  let selectedYoloClassFilter = -1;
  let bombs = [];
  let explosions = [];
  let isTraining = true;
  let matchEnded = false;
  let customBonusEpochsP1 = 0;
  let historyP1 = [];
  let historyP2 = [];
  let latestW1 = null;
  let latestW2 = null;
  let latestProbsP1 = [0.16, 0.16, 0.16, 0.16, 0.16, 0.16];
  let latestChosenActionP1 = 5;
  let latestChosenModeP1 = 'aguardando inferência';
  let latestTacticalStateP1 = null;
  let latestTrainingP1 = { epoch: 0, totalEpochs: 0, loss: null };
  let latestWarmupMs = null;
  let latestYoloDetections = [];
  const renderStudyContext = initStudyConsole({
    getGameState: () => ({
      p1,
      p2,
      grid,
      screenWidth: SCREEN_WIDTH,
      screenHeight: SCREEN_HEIGHT,
      bombs,
      bombCount: bombs.length,
      faceFeatures: faceVecP1,
      rawFeatures: rawFaceP1,
      rgbSample: currentRgbSample,
      sourceDimensions: currentSourceDimensions,
      facePreview: document.getElementById('face-p1'),
      tacticalState: latestTacticalStateP1,
      probabilities: latestProbsP1,
      chosenAction: latestChosenActionP1,
      chosenMode: latestChosenModeP1,
      training: isTraining,
      trainingMetrics: latestTrainingP1,
      warmupMs: latestWarmupMs,
      tensorMemory: {
        active: TensorMemoryTracker.activeTensors,
        disposed: TensorMemoryTracker.totalDisposed
      },
      detections: latestYoloDetections
    })
  });

  const chartCanvas = document.getElementById('metrics-canvas');
  const chartCtx = chartCanvas.getContext('2d');
  const elWorkerStatus = document.getElementById('worker-status');
  const elMainThread = document.getElementById('m-main-thread');
  const elWorkerThread = document.getElementById('m-worker-thread');
  const elWarmupInfo = document.getElementById('m-warmup-info');
  let studyContextAccumulator = 0;

  function renderPixelMatrixUI() {
    const container = document.getElementById('pixel-matrix-p1');
    const titleEl = document.getElementById('matrix-title');
    const btnEl = document.getElementById('btn-toggle-norm');
    if (!container) return;

    container.innerHTML = '';
    titleEl.textContent = showNormalizedMatrix ? 'Tensor Norm [0.0-1.0]' : 'Bruto RGB [0-255]';
    btnEl.textContent = showNormalizedMatrix ? 'Ver Bruto [0-255]' : 'Ver Norm [0.0-1.0]';

    for (let i = 0; i < 16; i++) {
      const rawVal = rawFaceP1[i] ?? 128;
      const normVal = faceVecP1[i] ?? 0.5;
      const cell = document.createElement('div');
      cell.className = 'px-cell';
      cell.style.backgroundColor = `rgb(${rawVal}, ${Math.round(rawVal * 0.85)}, ${rawVal})`;
      cell.textContent = showNormalizedMatrix ? normVal.toFixed(2) : String(rawVal);
      container.appendChild(cell);
    }
  }

  // Desenha as 4 Colunas da Rede Neural Profunda: Input -> Layer 1 -> Layer 2 (Extra) -> Softmax
  function drawNeuralNetXRay() {
    const w = nnCanvas.width;
    const h = nnCanvas.height;
    nnCtx.clearRect(0, 0, w, h);

    const inX = 24;
    const h1X = 105;
    const h2X = 185;
    const outX = 260;

    const nodes = 6;
    const getY = (idx, total) => 16 + (idx * (h - 26)) / (total - 1);

    // Títulos das camadas
    nnCtx.font = 'bold 8px monospace';
    nnCtx.fillStyle = '#94a3b8';
    nnCtx.fillText('IN(16)', inX - 14, 9);
    nnCtx.fillText('L1(ReLU)', h1X - 18, 9);
    nnCtx.fillText('L2(Extra)', h2X - 18, 9);
    nnCtx.fillText('SOFTMAX', outX - 14, 9);

    // 1. Conexões W1 (Input -> Layer 1)
    for (let i = 0; i < nodes; i++) {
      for (let j = 0; j < nodes; j++) {
        const weight = latestW1?.[i]?.[j] ?? (Math.sin(i * j) * 0.4);
        nnCtx.strokeStyle = weight >= 0
          ? `rgba(0, 255, 204, ${Math.min(0.85, Math.abs(weight) + 0.15)})`
          : `rgba(248, 113, 113, ${Math.min(0.85, Math.abs(weight) + 0.15)})`;
        nnCtx.lineWidth = Math.max(0.5, Math.min(2.2, Math.abs(weight) * 2.5));
        nnCtx.beginPath();
        nnCtx.moveTo(inX, getY(i, nodes));
        nnCtx.lineTo(h1X, getY(j, nodes));
        nnCtx.stroke();
      }
    }

    // 2. Conexões W2 (Layer 1 -> Layer 2 Extra)
    for (let i = 0; i < nodes; i++) {
      for (let j = 0; j < nodes; j++) {
        const weight = latestW2?.[i]?.[j] ?? (Math.cos(i + j) * 0.4);
        nnCtx.strokeStyle = weight >= 0
          ? `rgba(56, 189, 248, ${Math.min(0.85, Math.abs(weight) + 0.15)})`
          : `rgba(250, 204, 21, ${Math.min(0.85, Math.abs(weight) + 0.15)})`;
        nnCtx.lineWidth = Math.max(0.5, Math.min(2.2, Math.abs(weight) * 2.5));
        nnCtx.beginPath();
        nnCtx.moveTo(h1X, getY(i, nodes));
        nnCtx.lineTo(h2X, getY(j, nodes));
        nnCtx.stroke();
      }
    }

    // 3. Conexões W3 (Layer 2 -> Softmax Output)
    for (let j = 0; j < nodes; j++) {
      for (let k = 0; k < nodes; k++) {
        const active = k === latestChosenActionP1;
        nnCtx.strokeStyle = active ? 'rgba(74, 222, 128, 0.75)' : 'rgba(148, 163, 184, 0.16)';
        nnCtx.lineWidth = active ? 1.7 : 0.6;
        nnCtx.beginPath();
        nnCtx.moveTo(h2X, getY(j, nodes));
        nnCtx.lineTo(outX, getY(k, nodes));
        nnCtx.stroke();
      }
    }

    // Nós de Entrada, Layer 1, Layer 2 e Saída
    nnCtx.font = '8.5px monospace';
    for (let i = 0; i < nodes; i++) {
      const y = getY(i, nodes);
      // Input
      nnCtx.fillStyle = i < 4 ? '#00ffcc' : '#facc15';
      nnCtx.beginPath(); nnCtx.arc(inX, y, 4, 0, Math.PI * 2); nnCtx.fill();

      // Layer 1
      nnCtx.fillStyle = '#38bdf8';
      nnCtx.beginPath(); nnCtx.arc(h1X, y, 4.2, 0, Math.PI * 2); nnCtx.fill();

      // Layer 2 (Extra)
      nnCtx.fillStyle = '#c084fc';
      nnCtx.beginPath(); nnCtx.arc(h2X, y, 4.2, 0, Math.PI * 2); nnCtx.fill();

      // Output + Barra Softmax
      const prob = latestProbsP1[i] ?? 0.16;
      const isWinner = i === latestChosenActionP1;
      nnCtx.fillStyle = isWinner ? '#4ade80' : '#475569';
      nnCtx.beginPath(); nnCtx.arc(outX, y, 4, 0, Math.PI * 2); nnCtx.fill();

      const barW = Math.max(3, Math.round(prob * 48));
      nnCtx.fillStyle = isWinner ? '#22c55e' : '#334155';
      nnCtx.fillRect(outX + 8, y - 4, barW, 8);

      nnCtx.fillStyle = isWinner ? '#4ade80' : '#cbd5e1';
      nnCtx.fillText(`${ACTIONS[i].slice(0, 5)} ${(prob * 100).toFixed(0)}%`, outX + 60, y + 3);
    }
  }

  aiWorker.onmessage = (event) => {
    const { type, payload, message } = event.data;

    if (type === 'WARMUP_COMPLETE') {
      elWarmupInfo.textContent = `Tela ${SCREEN_WIDTH}x${SCREEN_HEIGHT}px | Warmup OK (${payload.warmupMs}ms)`;
      latestWarmupMs = Number(payload.warmupMs);
      TensorMemoryTracker.totalDisposed += payload.disposedCount;
      TensorMemoryTracker.updateUI();
      logger.log('AQUECIMENTO', payload.message);
    }

    if (type === 'VALIDATION_LOG') {
      logger.log('VALIDACAO', message);
    }

    if (type === 'TRAINING_PROGRESS') {
      logger.setStep(4);
      elWorkerStatus.textContent = '⚡ TREINANDO 2 LAYERS...';
      elWorkerStatus.style.color = '#facc15';
      elWorkerThread.textContent = `(Época ${payload.epoch} | ${payload.workerTimeMs.toFixed(1)}ms)`;

      TensorMemoryTracker.totalDisposed = payload.disposedCount;
      TensorMemoryTracker.updateUI();

      if (payload.weightsW1) latestW1 = payload.weightsW1;
      if (payload.weightsW2) latestW2 = payload.weightsW2;
      drawNeuralNetXRay();

      document.getElementById('p1-conf').textContent = `${(payload.p1.confidence * 100).toFixed(1)}%`;
      document.getElementById('p1-loss').textContent = payload.p1.loss.toFixed(4);
      document.getElementById('p1-epoch').textContent = `${payload.p1.epoch}/${payload.p1.totalEpochs}`;
      latestTrainingP1 = {
        epoch: payload.p1.epoch,
        totalEpochs: payload.p1.totalEpochs,
        loss: payload.p1.loss
      };

      document.getElementById('p2-conf').textContent = `${(payload.p2.confidence * 100).toFixed(1)}%`;
      document.getElementById('p2-loss').textContent = payload.p2.loss.toFixed(4);
      document.getElementById('p2-epoch').textContent = `${payload.p2.epoch}/${payload.p2.totalEpochs}`;

      historyP1.push({ loss: payload.p1.loss, conf: payload.p1.confidence });
      historyP2.push({ loss: payload.p2.loss, conf: payload.p2.confidence });
      drawConvergenceChart();
    }

    if (type === 'TRAINING_COMPLETE') {
      isTraining = false;
      logger.setStep(5);
      elWorkerStatus.textContent = '● INFERÊNCIA & YOLO ATIVOS';
      elWorkerStatus.style.color = '#00ffcc';
      logger.log(
        'VALIDACAO',
        `[TREINO VALIDADO] ${payload.p1.name} (Loss=${payload.p1.loss.toFixed(3)}, Conf=${(payload.p1.confidence * 100).toFixed(1)}%) vs ${payload.p2.name} (Loss=${payload.p2.loss.toFixed(3)}, Conf=${(payload.p2.confidence * 100).toFixed(1)}%). Combate iniciado!`
      );
    }

    if (type === 'PREDICTION_RESULT') {
      if (isTraining || matchEnded) return;
      elWorkerThread.textContent = `(Inferência: ${payload.infMs.toFixed(2)}ms)`;
      TensorMemoryTracker.totalDisposed = payload.disposedCount;
      TensorMemoryTracker.updateUI();

      const act1 = payload.p1.actionIndex;
      const act2 = payload.p2.actionIndex;

      latestChosenActionP1 = act1;
      latestChosenModeP1 = payload.p1.mode ?? 'MLP';
      if (payload.p1.probs) latestProbsP1 = payload.p1.probs;
      drawNeuralNetXRay();

      executeAction(p1, act1);
      executeAction(p2, act2);
    }
  };

  async function startTrainingAndMatch() {
    isTraining = true;
    matchEnded = false;
    bombs = [];
    explosions = [];
    historyP1 = [];
    historyP2 = [];
    app.stage.removeChildren();

    const p1Key = document.getElementById('select-p1').value;
    const p2Key = document.getElementById('select-p2').value;
    const member1 = { ...FAMILY_MEMBERS[p1Key], epochs: FAMILY_MEMBERS[p1Key].epochs + customBonusEpochsP1 };
    const member2 = FAMILY_MEMBERS[p2Key];

    const res1 = await ImageVectorizer.extractNormalizedFaceVector(member1, 'face-p1');
    const res2 = await ImageVectorizer.extractNormalizedFaceVector(member2, 'face-p2');
    rawFaceP1 = res1.rawFeatures255;
    faceVecP1 = res1.normalizedFeatures;
    currentRgbSample = res1.rgbSample;
    currentSourceDimensions = res1.sourceDimensions;
    faceVecP2 = res2.normalizedFeatures;

    renderPixelMatrixUI();
    drawNeuralNetXRay();

    const matrix = MazeGenerator.generate();
    grid = new Grid(matrix);
    app.stage.addChild(grid.graphics);

    p1 = new Player(1, 1, p1Key, true, res1.imageElement);
    p2 = new Player(COLS - 2, ROWS - 2, p2Key, false, res2.imageElement);
    app.stage.addChild(p1);
    app.stage.addChild(p2);

    updateScoreboard(member1, member2);
    latestYoloDetections = YoloDetector.inspectArena(grid, p1, p2, bombs, explosions, yoloOverlay, yoloOutputEl, yoloEnabled, selectedYoloClassFilter);

    aiWorker.postMessage({
      type: 'TRAIN_BOTH',
      payload: {
        screenWidth: SCREEN_WIDTH,
        screenHeight: SCREEN_HEIGHT,
        p1Config: { ...member1, faceVector: faceVecP1 },
        p2Config: { ...member2, faceVector: faceVecP2 }
      }
    });
  }

  function updateScoreboard(m1 = p1.member, m2 = p2.member) {
    document.getElementById('score-p1').textContent = `P1 (${p1.member.name}): HP ${p1.hp}% | ${m1.epochs} ép`;
    document.getElementById('score-p2').textContent = `P2 (${p2.member.name}): HP ${p2.hp}% | ${m2.epochs} ép`;
  }

  function drawConvergenceChart() {
    const w = chartCanvas.width;
    const h = chartCanvas.height;
    chartCtx.clearRect(0, 0, w, h);

    chartCtx.strokeStyle = '#1e293b';
    chartCtx.lineWidth = 1;
    for (let y = 18; y < h; y += 22) {
      chartCtx.beginPath(); chartCtx.moveTo(0, y); chartCtx.lineTo(w, y); chartCtx.stroke();
    }

    const maxLen = Math.max(historyP1.length, historyP2.length, 10);
    const stepX = w / maxLen;

    const plotCurve = (arr, key, color, dashed = false, scaleMax = 1.0) => {
      if (arr.length < 2) return;
      chartCtx.strokeStyle = color;
      chartCtx.lineWidth = 2;
      chartCtx.setLineDash(dashed ? [4, 3] : []);
      chartCtx.beginPath();
      arr.forEach((item, idx) => {
        const x = idx * stepX;
        const normY = Math.min(1, Math.max(0, item[key] / scaleMax));
        const y = h - 5 - normY * (h - 10);
        if (idx === 0) chartCtx.moveTo(x, y);
        else chartCtx.lineTo(x, y);
      });
      chartCtx.stroke();
    };

    plotCurve(historyP1, 'loss', '#ef4444', false, 2.0);
    plotCurve(historyP1, 'conf', '#4ade80', true, 1.0);
    plotCurve(historyP2, 'loss', '#38bdf8', false, 2.0);
    plotCurve(historyP2, 'conf', '#facc15', true, 1.0);
    chartCtx.setLineDash([]);
  }

  function executeAction(player, actionIdx) {
    if (!player.alive || matchEnded) return;
    const enemy = player === p1 ? p2 : p1;
    if (actionIdx === 0) player.tryMove(0, -1, grid, bombs, enemy);
    else if (actionIdx === 1) player.tryMove(0, 1, grid, bombs, enemy);
    else if (actionIdx === 2) player.tryMove(-1, 0, grid, bombs, enemy);
    else if (actionIdx === 3) player.tryMove(1, 0, grid, bombs, enemy);
    else if (actionIdx === 4) placeBomb(player);
  }

  function placeBomb(player) {
    const alreadyHasBomb = bombs.some(b => b.owner === player);
    if (alreadyHasBomb) return;

    const bomb = new Bomb(player.gridCol, player.gridRow, player, (explodedBomb) => {
      triggerExplosion(explodedBomb);
    });
    bombs.push(bomb);
    app.stage.addChild(bomb);
    // Log de plantio de bomba removido conforme solicitado para manter o console limpo!
  }

  function triggerExplosion(bomb) {
    if (matchEnded) return;
    app.stage.removeChild(bomb);
    const exp = new Explosion(bomb.col, bomb.row, bomb.radius, grid);
    explosions.push(exp);
    app.stage.addChild(exp);

    const victims = DamageSystem.applyExplosionDamage(exp, [p1, p2], 50);
    if (victims.length === 0) return;

    updateScoreboard();
    victims.forEach((target) => {
      const message = target === bomb.owner
        ? `💥 ${target.member.name} foi atingido pela própria bomba!`
        : `💥 ${bomb.owner.member.name} atingiu ${target.member.name}!`;
      logger.log('COMBATE', `${message} (-50 HP | Restante: ${target.hp}%)`);
    });

    const survivors = [p1, p2].filter((player) => player.alive);
    if (survivors.length === 1) {
      const loser = survivors[0] === p1 ? p2 : p1;
      declareWinner(survivors[0], loser);
    } else if (survivors.length === 0) {
      declareDraw();
    }
  }

  function declareWinner(winner, loser) {
    matchEnded = true;
    const banner = new Text({
      text: `🏆 VITÓRIA DE ${winner.member.name.toUpperCase()}!\n(Eliminou ${loser.member.name} na Arena)`,
      style: {
        fontFamily: 'monospace',
        fontSize: 20,
        fill: 0x00ffcc,
        align: 'center',
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 4 }
      }
    });
    banner.anchor.set(0.5);
    banner.position.set(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
    app.stage.addChild(banner);
    logger.log('COMBATE', `🏆 FIM DE JOGO! ${winner.member.name} venceu eliminando ${loser.member.name}!`);
  }

  function declareDraw() {
    matchEnded = true;
    const banner = new Text({
      text: '🤝 EMPATE!\nAmbos foram eliminados na explosão.',
      style: {
        fontFamily: 'monospace',
        fontSize: 20,
        fill: 0xfacc15,
        align: 'center',
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 4 }
      }
    });
    banner.anchor.set(0.5);
    banner.position.set(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
    app.stage.addChild(banner);
    logger.log('COMBATE', '🤝 FIM DE JOGO! Ambos os jogadores foram eliminados na mesma explosão.');
  }

  document.getElementById('select-p1').addEventListener('change', () => {
    customBonusEpochsP1 = 0;
    startTrainingAndMatch();
  });
  document.getElementById('select-p2').addEventListener('change', () => startTrainingAndMatch());
  document.getElementById('btn-retrain').addEventListener('click', () => startTrainingAndMatch());
  document.getElementById('btn-add-epochs').addEventListener('click', () => {
    customBonusEpochsP1 += 20;
    startTrainingAndMatch();
  });
  document.getElementById('btn-toggle-norm').addEventListener('click', () => {
    showNormalizedMatrix = !showNormalizedMatrix;
    renderPixelMatrixUI();
  });
  document.getElementById('btn-toggle-yolo').addEventListener('click', (e) => {
    yoloEnabled = !yoloEnabled;
    e.target.textContent = `🎯 YOLO: ${yoloEnabled ? 'ON' : 'OFF'}`;
    YoloDetector.inspectArena(grid, p1, p2, bombs, explosions, yoloOverlay, yoloOutputEl, yoloEnabled, selectedYoloClassFilter);
  });
  document.getElementById('select-yolo-filter').addEventListener('change', (e) => {
    selectedYoloClassFilter = Number(e.target.value);
    logger.log('YOLO', `Filtro de classe alterado para: ${e.target.options[e.target.selectedIndex].text}`);
    YoloDetector.inspectArena(grid, p1, p2, bombs, explosions, yoloOverlay, yoloOutputEl, yoloEnabled, selectedYoloClassFilter);
  });
  document.getElementById('btn-export-dataset').addEventListener('click', () => {
    const currentDetections = YoloDetector.inspectArena(grid, p1, p2, bombs, explosions, yoloOverlay, yoloOutputEl, yoloEnabled, selectedYoloClassFilter);
    DatasetExporter.exportFrameDataset(app.renderer, currentDetections);
  });

  await startTrainingAndMatch();

  let stepAccumulator = 0;
  const TACTICAL_STEP_SECONDS = 0.22;

  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    elMainThread.textContent = `${Math.round(ticker.FPS)} FPS`;

    if (p1) p1.update(dt);
    if (p2) p2.update(dt);
    studyContextAccumulator += dt;
    if (studyContextAccumulator >= 0.1) {
      studyContextAccumulator = 0;
      renderStudyContext();
    }

    for (let i = bombs.length - 1; i >= 0; i--) {
      if (bombs[i].update(dt)) bombs.splice(i, 1);
    }

    for (let i = explosions.length - 1; i >= 0; i--) {
      if (explosions[i].update(dt)) {
        app.stage.removeChild(explosions[i]);
        explosions.splice(i, 1);
      }
    }

    if (grid && p1 && p2) {
      latestYoloDetections = YoloDetector.inspectArena(grid, p1, p2, bombs, explosions, yoloOverlay, yoloOutputEl, yoloEnabled, selectedYoloClassFilter);
    }

    if (isTraining || matchEnded) return;

    stepAccumulator += dt;
    if (stepAccumulator >= TACTICAL_STEP_SECONDS) {
      stepAccumulator = 0;
      const stateP1 = FeatureVectorizer.buildTacticalState(grid, p1, p2, bombs, faceVecP1);
      const stateP2 = FeatureVectorizer.buildTacticalState(grid, p2, p1, bombs, faceVecP2);
      latestTacticalStateP1 = stateP1;

      aiWorker.postMessage({
        type: 'PREDICT_STEP',
        payload: { stateP1, stateP2 }
      });
    }
  });
}

bootstrap().catch((err) => console.error('❌ Erro ao inicializar laboratório:', err));

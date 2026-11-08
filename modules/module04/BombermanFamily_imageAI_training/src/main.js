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
  let latestW3 = null;
  let latestForwardTrace = null;
  let latestInferenceAt = null;
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
      matchEnded,
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
  const elNeuralNetStatus = document.getElementById('nn-live-status');
  const maxFpsInput = document.getElementById('game-max-fps');
  const gameSpeedInput = document.getElementById('game-speed');
  const maxFpsValue = document.getElementById('game-max-fps-value');
  const gameSpeedValue = document.getElementById('game-speed-value');
  if (!maxFpsInput || !gameSpeedInput || !maxFpsValue || !gameSpeedValue) {
    throw new Error('Controles de velocidade do jogo não encontrados no HTML.');
  }
  let gameSpeed = Number(gameSpeedInput.value);
  app.ticker.maxFPS = Number(maxFpsInput.value);

  maxFpsInput.addEventListener('input', () => {
    const maxFps = Number(maxFpsInput.value);
    app.ticker.maxFPS = maxFps;
    maxFpsValue.textContent = `${maxFps} FPS`;
  });
  gameSpeedInput.addEventListener('input', () => {
    gameSpeed = Number(gameSpeedInput.value);
    gameSpeedValue.textContent = `${gameSpeed.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}×`;
  });
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

  function drawNeuralNetXRay(now = performance.now()) {
    const w = nnCanvas.width;
    const h = nnCanvas.height;
    const displayScale = Math.max(0.25, Math.min(1, nnCanvas.clientWidth / w));
    const px = (value) => value / displayScale;
    nnCtx.clearRect(0, 0, w, h);

    const nodeCount = 6;
    const columns = [70, 260, 440, 615];
    const top = 60;
    const bottom = 232;
    const nodeY = (index) => top + index * (bottom - top) / (nodeCount - 1);
    const labels = ['Walk↑', 'Walk↓', 'Walk←', 'Walk→', 'Danger↑', 'Danger↓'];
    const inputValues = latestForwardTrace?.input ?? [];
    const firstLayer = latestForwardTrace?.h1 ?? [];
    const extraLayer = latestForwardTrace?.h2 ?? [];
    const outputValues = latestForwardTrace?.probs ?? latestProbsP1;
    const layerWeights = [latestW1, latestW2, latestW3];
    const stageStart = latestInferenceAt === null ? Number.POSITIVE_INFINITY : now - latestInferenceAt;
    const stageIndex = stageStart < 720 ? Math.floor((stageStart % 240) / 80) : -1;
    const stageProgress = stageIndex >= 0 ? (stageStart % 80) / 80 : 0;
    const layerXs = columns.slice(0, 3);

    nnCtx.font = `bold ${px(13)}px Consolas, monospace`;
    nnCtx.textAlign = 'center';
    [['IN · 16', columns[0]], ['ReLU · L1', columns[1]], ['Extra · L2', columns[2]], ['Softmax · 6', columns[3]]]
      .forEach(([label, x]) => {
        nnCtx.fillStyle = '#e2e8f0';
        nnCtx.fillText(label, x, 28);
      });

    layerWeights.forEach((weights, stage) => {
      const sourceX = layerXs[stage];
      const targetX = columns[stage + 1];
      for (let source = 0; source < nodeCount; source++) {
        for (let target = 0; target < nodeCount; target++) {
          const weight = weights?.[source]?.[target];
          const sourceActivation = stage === 0
            ? Number(inputValues[source] ?? 0)
            : Number((stage === 1 ? firstLayer : extraLayer)[source] ?? 0);
          const activeStrength = Math.min(1, Math.abs(sourceActivation));
          const hasWeights = Number.isFinite(weight);
          const magnitude = hasWeights ? Math.min(1, Math.abs(weight) * 2) : 0;
          const isFlowing = stage === stageIndex && sourceActivation > 0.03 && magnitude > 0.08;
          const baseAlpha = hasWeights ? 0.08 + magnitude * (isFlowing ? 0.32 + activeStrength * 0.35 : 0.2) : 0.06;
          nnCtx.strokeStyle = hasWeights
            ? weight >= 0
              ? `rgba(56, 189, 248, ${baseAlpha})`
              : `rgba(248, 113, 113, ${baseAlpha})`
            : 'rgba(148, 163, 184, 0.08)';
          nnCtx.lineWidth = px(hasWeights ? 0.5 + magnitude * (isFlowing ? 1.8 : 0.9) : 0.4);
          nnCtx.beginPath();
          nnCtx.moveTo(sourceX + 9, nodeY(source));
          nnCtx.lineTo(targetX - 9, nodeY(target));
          nnCtx.stroke();

          if (isFlowing) {
            const progress = stageProgress;
            const particleX = sourceX + 9 + (targetX - sourceX - 18) * progress;
            const particleY = nodeY(source) + (nodeY(target) - nodeY(source)) * progress;
            nnCtx.beginPath();
            nnCtx.arc(particleX, particleY, px(2 + magnitude * 1.5), 0, Math.PI * 2);
            nnCtx.fillStyle = weight >= 0 ? '#67e8f9' : '#fca5a5';
            nnCtx.fill();
          }
        }
      }
    });

    const drawNode = (x, y, value, color, label) => {
      const strength = Math.min(1, Math.abs(Number(value) || 0));
      nnCtx.beginPath();
      nnCtx.arc(x, y, px(8), 0, Math.PI * 2);
      nnCtx.fillStyle = color;
      nnCtx.globalAlpha = 0.25 + strength * 0.75;
      nnCtx.fill();
      nnCtx.globalAlpha = 1;
      nnCtx.strokeStyle = '#e2e8f0';
      nnCtx.lineWidth = 1;
      nnCtx.stroke();
      nnCtx.textAlign = 'center';
      nnCtx.font = `${px(10)}px Consolas, monospace`;
      nnCtx.fillStyle = '#cbd5e1';
      nnCtx.fillText(label, x, y + px(25));
      if (Number.isFinite(Number(value))) {
        nnCtx.fillStyle = '#f8fafc';
        nnCtx.font = `${px(7)}px Consolas, monospace`;
        nnCtx.fillText(Number(value).toFixed(1), x, y + 3);
      }
    };

    for (let index = 0; index < nodeCount; index++) {
      drawNode(columns[0], nodeY(index), inputValues[index], '#0e7490', labels[index]);
      drawNode(columns[1], nodeY(index), firstLayer[index], '#0284c7', `h${index + 1}`);
      drawNode(columns[2], nodeY(index), extraLayer[index], '#7c3aed', `e${index + 1}`);

      const probability = Number(outputValues[index] ?? 0);
      const isWinner = index === latestChosenActionP1;
      const y = nodeY(index);
      nnCtx.beginPath();
      nnCtx.arc(columns[3], y, px(8), 0, Math.PI * 2);
      nnCtx.fillStyle = isWinner ? '#22c55e' : '#475569';
      nnCtx.fill();
      nnCtx.strokeStyle = '#e2e8f0';
      nnCtx.stroke();
      nnCtx.fillStyle = '#1e293b';
      nnCtx.fillRect(columns[3] + 14, y - 6, 90, 12);
      nnCtx.fillStyle = isWinner ? '#4ade80' : '#38bdf8';
      nnCtx.fillRect(columns[3] + 14, y - 6, 90 * probability, 12);
      nnCtx.textAlign = 'right';
      nnCtx.font = `${px(9)}px Consolas, monospace`;
      nnCtx.fillStyle = isWinner ? '#86efac' : '#cbd5e1';
      nnCtx.fillText(['CIMA', 'BAIXO', 'ESQ', 'DIR', 'BOMBA', 'ESP'][index], columns[3] - 13, y + 3);
      nnCtx.textAlign = 'left';
      nnCtx.font = `${px(8)}px Consolas, monospace`;
      nnCtx.fillText(`${(probability * 100).toFixed(0)}%`, columns[3] + 17, y + 3);
    }

    nnCtx.textAlign = 'left';
    nnCtx.font = `${px(10)}px Consolas, monospace`;
    nnCtx.fillStyle = '#38bdf8';
    nnCtx.fillText('W1 · pesos', 125, 253);
    nnCtx.fillStyle = '#a78bfa';
    nnCtx.fillText('W2 · pesos', 320, 253);
    nnCtx.fillStyle = '#4ade80';
    nnCtx.fillText('W3 · saída', 515, 253);

    if (isTraining) {
      elNeuralNetStatus.textContent = `Treino: época ${latestTrainingP1.epoch}/${latestTrainingP1.totalEpochs || '…'} · linhas = pesos reais atualizados a cada época.`;
    } else if (latestForwardTrace) {
      elNeuralNetStatus.textContent = `Inferência ao vivo · entrada 16 → ReLU ${latestForwardTrace.h1.length} → Extra ${latestForwardTrace.h2.length} → Softmax 6 · destaque verde = ação ${ACTIONS[latestChosenActionP1]}.`;
    } else {
      elNeuralNetStatus.textContent = 'Arquitetura carregada · aguardando a primeira inferência para animar o fluxo.';
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
      if (payload.weightsW3) latestW3 = payload.weightsW3;
      latestTrainingP1 = {
        epoch: payload.p1.epoch,
        totalEpochs: payload.p1.totalEpochs,
        loss: payload.p1.loss
      };
      drawNeuralNetXRay();

      document.getElementById('p1-conf').textContent = `${(payload.p1.confidence * 100).toFixed(1)}%`;
      document.getElementById('p1-loss').textContent = payload.p1.loss.toFixed(4);
      document.getElementById('p1-epoch').textContent = `${payload.p1.epoch}/${payload.p1.totalEpochs}`;
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
      latestForwardTrace = payload.p1.trace ?? null;
      latestInferenceAt = performance.now();
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

    const victims = DamageSystem.applyExplosionDamage(exp, [p1, p2], 100);
    if (victims.length === 0) return;

    updateScoreboard();
    victims.forEach((target) => {
      const message = target === bomb.owner
        ? `💥 ${target.member.name} foi atingido pela própria bomba!`
        : `💥 ${bomb.owner.member.name} atingiu ${target.member.name}!`;
      logger.log('COMBATE', `${message} (-100 HP | Restante: ${target.hp}%)`);
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
  const BASE_TACTICAL_STEP_SECONDS = 0.22;

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
    if (latestInferenceAt !== null && performance.now() - latestInferenceAt < 720) {
      drawNeuralNetXRay();
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
    if (stepAccumulator >= BASE_TACTICAL_STEP_SECONDS / gameSpeed) {
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

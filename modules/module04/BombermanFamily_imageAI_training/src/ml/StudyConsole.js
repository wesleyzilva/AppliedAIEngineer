const CONCEPTS = {
  embeddings: {
    title: 'Embeddings',
    explanation: 'Um embedding representa um token como um vetor numérico. Tokens próximos em significado tendem a ficar próximos no espaço aprendido, mas os valores dependem do modelo e do contexto.'
  },
  attention: {
    title: 'Self-attention',
    explanation: 'Cada token calcula quanto deve considerar os outros tokens da sequência. No Transformer, isso usa Q, K e V: softmax(QKᵀ / √dₖ)V. A arena usa uma MLP, não self-attention.'
  },
  decoding: {
    title: 'Decoding e amostragem',
    explanation: 'Temperature altera a distribuição de amostragem; Top-K limita candidatos e Top-P mantém o menor conjunto cuja probabilidade acumulada alcança o limite.'
  },
  'rag-mcp': {
    title: 'RAG e MCP',
    explanation: 'RAG é o fluxo de recuperar trechos relevantes e incluí-los no contexto. MCP padroniza como um cliente descobre e chama tools, consulta resources e usa prompts de um servidor.'
  },
  neo4j: {
    title: 'Neo4j como banco vetorial',
    explanation: 'Um banco de grafos como Neo4j pode guardar chunks em nós, embeddings como propriedades e criar índices vetoriais para busca por similaridade, mantendo relações e filtros do grafo.'
  },
  genetic: {
    title: 'Algoritmo genético',
    explanation: 'Uma população de soluções é avaliada; indivíduos melhores são selecionados, combinados por cruzamento e alterados por mutação. A população é reavaliada por gerações.'
  },
  'hidden-layer': {
    title: 'Camada oculta',
    explanation: 'A camada oculta combina entradas por pesos e bias e aplica uma ativação, como ReLU. No jogo, uma MLP aprende uma política para escolher ações; isso não é um LLM.'
  }
};

const GAME_LINKS = {
  embeddings: {
    title: 'Comparação real: features visuais do jogo vs. embeddings de texto',
    description: 'O Bomberman não gera embeddings semânticos. A rede recebe números extraídos da imagem; um LLM aprende vetores para tokens. Compare a entrada visual real de P1 abaixo.',
    evidence: (game) => game.faceFeatures?.length
      ? `P1: 16 valores normalizados da imagem; amostra [${game.faceFeatures.slice(0, 4).map((value) => Number(value).toFixed(2)).join(', ')}]. Isso é feature visual, não embedding de token.`
      : 'Aguardando o pré-processamento da imagem de P1.'
  },
  attention: {
    title: 'Mecânica real: mapa de perigo e busca BFS',
    description: 'O agente não usa self-attention. Ele mede perigo ao redor e pode usar BFS para buscar uma rota de fuga; no Transformer, attention relaciona tokens da frase.',
    evidence: (game) => {
      const state = game.tacticalState;
      if (!state) return 'Aguardando a primeira leitura tática da arena.';
      const escape = state.escapeDirIndex >= 0 ? GAME_ACTIONS[state.escapeDirIndex] : 'não necessária';
      return `P1 (${game.p1.gridCol},${game.p1.gridRow}): perigo atual ${state.currentDanger.toFixed(2)}; perigo por direção [${state.dirDanger.map((value) => value.toFixed(2)).join(', ')}]; fuga BFS: ${escape}.`;
    }
  },
  decoding: {
    title: 'Comparação real: probabilidades de ações vs. tokens',
    description: 'A MLP do jogo produz probabilidades para seis ações. Ela não usa Temperature, Top-K ou Top-P; esses controles são para escolher próximos tokens em LLMs.',
    evidence: (game) => `P1 escolheu ${GAME_ACTIONS[game.chosenAction] ?? 'aguardar'}; saída da MLP: ${game.probabilities.map((value, index) => `${GAME_ACTIONS[index]} ${(value * 100).toFixed(0)}%`).join(' · ')}.`
  },
  'rag-mcp': {
    title: 'Aplicação no jogo: estado como resource e regras como contexto',
    description: 'Uma integração poderia expor a partida como resource e uma busca nas regras como tool. O exercício simula essa separação; não conecta a um servidor MCP real.',
    evidence: (game) => game.p1 && game.p2
      ? `Resource ilustrativo game://arena-state → P1 (${game.p1.gridCol},${game.p1.gridRow}), P2 (${game.p2.gridCol},${game.p2.gridRow}), bombas ${game.bombCount}.`
      : 'O resource da arena aparecerá quando a partida iniciar.'
  },
  neo4j: {
    title: 'Aplicação no jogo: o labirinto pode ser representado como grafo',
    description: 'Cada casa caminhável pode virar um nó e cada vizinha acessível uma aresta. Isso modela navegação; a busca vetorial de chunks no Neo4j é outra função.',
    evidence: (game) => {
      const matrix = game.grid?.matrix;
      if (!matrix) return 'Aguardando o mapa da arena.';
      let nodes = 0;
      let edges = 0;
      for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
          if (!game.grid.isWalkable(col, row)) continue;
          nodes += 1;
          if (game.grid.isWalkable(col + 1, row)) edges += 1;
          if (game.grid.isWalkable(col, row + 1)) edges += 1;
        }
      }
      return `Mapa atual: ${nodes} casas caminháveis (nós) e ${edges} conexões adjacentes únicas (arestas). Grafo do labirinto ≠ índice vetorial.`;
    }
  },
  genetic: {
    title: 'Comparação real: treino por gradiente vs. algoritmo genético',
    description: 'O agente atual ajusta pesos por backpropagation/gradiente descendente. A atividade genética é uma simulação separada e não altera os lutadores.',
    evidence: (game) => {
      const { epoch, totalEpochs, loss } = game.trainingMetrics ?? {};
      return game.training
        ? `Treino real de P1: época ${epoch}/${totalEpochs || '…'}${Number.isFinite(loss) ? `; loss ${loss.toFixed(3)}` : ''}. Algoritmo em uso: gradiente descendente, não seleção genética.`
        : `Treino de P1 concluído${Number.isFinite(loss) ? `; última loss ${loss.toFixed(3)}` : ''}. A simulação genética não muda esses pesos.`;
    }
  },
  'hidden-layer': {
    title: 'Mecânica real: as camadas ocultas escolhem ações na arena',
    description: 'Este é o vínculo mais direto: a MLP transforma sensores da partida em probabilidades para mover ou colocar bomba. Veja a arquitetura e a saída atual de P1.',
    evidence: (game) => {
      const firstLayer = game.p1?.member?.hiddenUnits ?? '?';
      const secondLayer = game.p1?.member?.hiddenUnits2 ?? 8;
      return `MLP P1: 16 entradas → camada oculta ${firstLayer} → camada oculta ${secondLayer} → 6 ações; saída atual: ${GAME_ACTIONS[game.chosenAction] ?? 'aguardar'}.`;
    }
  }
};

const GAME_ACTIONS = ['CIMA', 'BAIXO', 'ESQUERDA', 'DIREITA', 'BOMBA', 'AGUARDAR'];

const BASIC_QUESTIONS = [
  {
    code: '157669',
    question: 'Em LLMs, o termo embeddings se refere a:',
    choices: [
      'A etapa que quebra o texto em palavras completas, sem pontuação.',
      'Vetores numéricos aprendidos que representam tokens em um espaço semântico.',
      'Um algoritmo que escolhe o próximo token usando Top-K e Top-P.',
      'Um mecanismo do Transformer que calcula pesos entre tokens (attention).',
      'Um parâmetro que ajusta aleatoriedade na geração de texto (temperature).'
    ],
    answer: 1,
    explanation: 'Embeddings são vetores numéricos aprendidos associados a tokens. Tokenização, attention e decoding são outras etapas/conceitos.',
    gameRelation: 'O Bomberman transforma pixels em features numéricas para sua MLP. Essas features visuais não são embeddings semânticos de tokens.'
  },
  {
    code: '157673',
    question: 'Um aluno diz: “Se eu aumentar a temperature, o modelo vai entender melhor o contexto e por isso vai alucinar menos.” Qual é a melhor avaliação?',
    choices: [
      'Correta: temperature substitui Top-K/Top-P e elimina tokens improváveis.',
      'Incorreta: temperature altera a amostragem; não melhora a factualidade por si só.',
      'Incorreta: alucinação depende só do limite de tokens do prompt, não do resto.',
      'Correta: temperature aumenta compreensão e reduz ambiguidades internas.',
      'Correta: temperature ativa mais cabeças de atenção e melhora atenção longa.'
    ],
    answer: 1,
    explanation: 'Temperature ajusta a distribuição usada na amostragem. Ela não altera o conhecimento do modelo nem garante respostas mais factuais.',
    gameRelation: 'O jogo não usa temperature, Top-K ou Top-P. Sua MLP calcula probabilidades de ações e regras táticas podem influenciar a ação executada.'
  },
  {
    code: '157675',
    question: 'Em algoritmos genéticos, qual sequência descreve melhor o ciclo de melhoria das soluções?',
    choices: [
      'Aumentar temperature → limitar com Top-K → limitar com Top-P → gerar texto.',
      'Treinar uma política única → congelar pesos → fazer inferência sem avaliação.',
      'Tokenizar → Embedding → Attention → Decoding → Sampling.',
      'Selecionar melhores indivíduos → cruzar características → aplicar mutações → reavaliar.',
      'Recompensar ações passo a passo → explorar movimentos → punir erros → repetir.'
    ],
    answer: 3,
    explanation: 'Algoritmos genéticos avaliam uma população, selecionam indivíduos, combinam soluções por cruzamento, aplicam mutações e avaliam a nova geração.',
    gameRelation: 'O agente ativo do Bomberman aprende por gradiente/backpropagation, não por algoritmo genético. As duas são estratégias de otimização diferentes.'
  },
  {
    code: '157679',
    question: 'Uma ferramenta transforma a pergunta em embedding, busca chunks, filtra e injeta trechos no prompt. Qual alternativa descreve melhor RAG e MCP?',
    choices: [
      'RAG e MCP são equivalentes: ambos apenas aumentam o contexto.',
      'MCP faz retrieval e garante factualidade; RAG decide os tokens da geração.',
      'RAG é buscar e injetar trechos; MCP padroniza a chamada da ferramenta e o retorno.',
      'RAG substitui ferramentas; MCP só é usado com fine-tuning.',
      'RAG expõe tools/resources; MCP recupera chunks por similaridade.'
    ],
    answer: 2,
    explanation: 'RAG é o padrão de recuperar informação e acrescentá-la ao contexto. MCP é um protocolo para clientes e servidores exporem/interagirem com tools, resources e prompts.',
    gameRelation: 'O jogo não conecta a um servidor MCP nem executa RAG. O estado da arena poderia ser exposto como resource e uma busca nas regras como tool.'
  },
  {
    code: '157670',
    question: 'O que é self-attention em Transformers?',
    choices: [
      'Um mecanismo em que cada token atribui pesos a outros tokens da mesma sequência.',
      'Um processo que converte texto em tokens e remove stopwords.',
      'Uma técnica para ordenar embeddings sem usar informação de posição.',
      'Um truque para reduzir o número de tokens e caber em 4k tokens.',
      'Uma regra que sempre escolhe o token de maior probabilidade (greedy).'
    ],
    answer: 0,
    explanation: 'Self-attention permite que cada token combine informação dos demais tokens da sequência usando pesos calculados pelo modelo.',
    gameRelation: 'A MLP do jogo não tem self-attention. A busca BFS calcula rotas na arena; ela não é attention e não relaciona tokens.'
  },
  {
    code: '157684',
    question: 'Por que o Neo4j pode ser usado como vector database?',
    choices: [
      'Porque substitui embeddings por busca de palavra-chave otimizada.',
      'Porque armazena chunks como nós, embeddings como propriedades e permite índice/consulta vetorial.',
      'Porque já vem com uma LLM embutida para gerar respostas.',
      'Porque exige cloud e chave de API para funcionar corretamente.',
      'Porque converte automaticamente PDFs em chunks sem código.'
    ],
    answer: 1,
    explanation: 'Neo4j pode armazenar vetores em propriedades e criar índices vetoriais para busca por similaridade, junto das relações do grafo.',
    gameRelation: 'O mapa do Bomberman pode ser representado como nós e conexões para navegação, mas isso não é um índice vetorial nem uma integração Neo4j existente.'
  },
  {
    code: '157682',
    question: 'Um cliente MCP lista tools com nomes/esquemas e resources como schema do banco e logs. Você pede vendas do mês, mas não sabe tabela nem campos. O que faz mais sentido?',
    choices: [
      'O agente consulta nomes, descrições e esquemas das tools e pode usar resources para se orientar antes de executar.',
      'O agente executa a primeira tool encontrada sem considerar descrição ou parâmetros.',
      'O agente executa todas as tools em paralelo e decide depois.',
      'O agente depende só de resources; tools são ignoradas até receber SQL pronto.',
      'O agente sempre executa run_query diretamente sem conhecer o schema.'
    ],
    answer: 0,
    explanation: 'O modelo/cliente usa as descrições e esquemas disponíveis para escolher uma ferramenta adequada; resources podem fornecer contexto, como o schema.',
    gameRelation: 'Não há MCP conectado ao jogo. Em uma integração didática, um resource poderia informar o estado da arena e uma tool poderia consultar regras ou executar uma ação permitida.'
  },
  {
    code: '157687',
    question: 'Entradas numéricas como idade, cor e localização passam por uma camada oculta e depois por uma saída com três classes. Qual é o papel da camada oculta?',
    choices: [
      'Aplica cálculos e combinações nos inputs para extrair padrões antes da decisão final.',
      'Decide a categoria final diretamente, sem precisar da camada de saída.',
      'Remove colunas redundantes do tensor para reduzir features.',
      'Serve apenas para normalizar valores entre 0 e 1.',
      'Transforma categorias em one-hot encoding.'
    ],
    answer: 0,
    explanation: 'Neurônios ocultos combinam entradas com pesos e bias e aplicam ativações para formar representações usadas pela camada de saída.',
    gameRelation: 'O agente usa camadas ocultas em uma MLP: sensores/features entram, camadas intermediárias combinam sinais e a saída produz probabilidades para seis ações.'
  },
  {
    code: '157681',
    question: 'Segundo a aula, quais são os três tipos de componentes expostos por um servidor MCP?',
    choices: [
      'Tools, Resources e Prompts.',
      'Tokens, Embeddings e Attention.',
      'Modelos, Pesos e Gradientes.',
      'Endpoints, Rotas e Middlewares.',
      'Chunks, Índice vetorial e Reranking.'
    ],
    answer: 0,
    explanation: 'MCP define tools para ações, resources para contexto/dados e prompts para modelos de interação reutilizáveis.',
    gameRelation: 'O console não usa um servidor MCP. A distinção ajuda a projetar uma futura integração sem confundir o protocolo com os conceitos de LLM usados no jogo.'
  },
  {
    code: '157672',
    question: 'Analise: I. Embeddings colocam tokens num espaço numérico com semântica aproximada. II. O Transformer transforma esses vetores em representações contextualizadas, reduzindo ambiguidades. Qual alternativa está correta?',
    choices: [
      'I é verdadeira e II é falsa: embeddings já carregam o contexto completo.',
      'I e II são falsas: semântica depende apenas do decoding.',
      'I e II são verdadeiras: embeddings são base; o Transformer contextualiza.',
      'I é verdadeira e II é falsa: ambiguidade é resolvida pela tokenização.',
      'I é falsa e II é verdadeira: só o Transformer gera vetores numéricos.'
    ],
    answer: 2,
    explanation: 'Embeddings fornecem representações iniciais. As camadas do Transformer as contextualizam com informação da sequência, embora isso não elimine toda ambiguidade.',
    gameRelation: 'A rede do jogo também transforma entradas em representações intermediárias, mas é uma MLP visual/tática e não um Transformer contextualizando tokens.'
  }
];

const BASIC_VISUALS = [
  {
    title: 'EMBEDDING: token de texto → vetor numérico aprendido',
    stages: [
      ['FRASE', '“gato e cão”'],
      ['TOKENIZER', '[gato] [e] [cão]'],
      ['TABELA', 'cada token tem um vetor'],
      ['EMBEDDING', '[0.2, -0.5, …]']
    ],
    note: 'O vetor é aprendido pelo modelo. Um tokenizer pode dividir palavras de outra forma; estes valores são apenas ilustrativos.',
    game: 'JOGO: pixels → features visuais; não são embeddings de palavras.'
  },
  {
    title: 'TEMPERATURE MUDA A AMOSTRAGEM, NÃO O CONHECIMENTO',
    layout: 'temperature',
    note: 'Depois podem ser aplicados Top-K/Top-P. Mudar Temperature não acrescenta fatos nem garante menos alucinação.',
    game: 'JOGO: as probabilidades da MLP são ações; não passam por Temperature/Top-K/Top-P.'
  },
  {
    title: 'ALGORITMO GENÉTICO: população melhora por gerações',
    stages: [
      ['POPULAÇÃO', 'várias soluções'],
      ['SELEÇÃO', 'prioriza melhores'],
      ['CRUZAMENTO', 'combina características'],
      ['MUTAÇÃO + TESTE', 'varia e reavalia']
    ],
    note: 'As soluções avaliadas formam a próxima geração; o ciclo se repete buscando melhor fitness.',
    game: 'JOGO: o agente atual treina com gradiente/backpropagation, não com este ciclo genético.'
  },
  {
    title: 'RAG BUSCA CONTEXTO; MCP PADRONIZA A CHAMADA DA TOOL',
    stages: [
      ['PERGUNTA', 'consulta do usuário'],
      ['RAG: RETRIEVAL', 'embedding → busca\n→ chunks relevantes'],
      ['CONTEXTO', 'trechos entram\nno prompt'],
      ['LLM', 'responde com\nmais contexto']
    ],
    note: 'MCP é uma camada diferente: o cliente pode chamar uma tool de busca e receber os trechos. MCP não garante factualidade.',
    game: 'JOGO: não executa RAG nem MCP; estado da arena poderia ser exposto como resource.'
  },
  {
    title: 'SELF-ATTENTION: tokens ponderam informação do contexto',
    layout: 'attention',
    note: 'Os pesos reais são calculados pelo modelo (Q, K, V). A matriz abaixo é esquemática; não é a atenção calculada pelo jogo.',
    game: 'JOGO: MLP e BFS; a busca de caminho não é self-attention.'
  },
  {
    title: 'NEO4J: GRAFO + PROPRIEDADES VETORIAIS + ÍNDICE',
    stages: [
      ['DOCUMENTO', 'conteúdo original'],
      ['CHUNKS', 'trechos como nós'],
      ['EMBEDDINGS', 'vetores em\npropriedades'],
      ['ÍNDICE VETORIAL', 'busca semelhante\n+ relações do grafo']
    ],
    note: 'A busca encontra chunks próximos por similaridade; relações e metadados do grafo podem complementar o resultado.',
    game: 'JOGO: o labirinto pode ser grafo de navegação, mas não é banco vetorial Neo4j.'
  },
  {
    title: 'AGENTE: DESCOBRIR CONTEXTO, ESCOLHER TOOL, EXECUTAR',
    stages: [
      ['PEDIDO', '“vendas do mês”'],
      ['INSPECIONAR', 'descrições e\nesquemas de tools'],
      ['ORIENTAR', 'resources: schema,\nlogs, serviços'],
      ['ESCOLHER + CHAMAR', 'tool adequada\ncom parâmetros']
    ],
    note: 'O agente usa as descrições e o contexto disponível antes da chamada; não deve executar tools às cegas.',
    game: 'JOGO: não há MCP conectado; uma tool/resource seria uma integração futura.'
  },
  {
    title: 'CAMADA OCULTA: COMBINA FEATURES ANTES DA CLASSIFICAÇÃO',
    layout: 'hidden-layer',
    note: 'Cada neurônio calcula uma combinação ponderada (W·x + b) e uma ativação. A camada de saída usa essas representações.',
    game: 'JOGO: 16 entradas → camadas ocultas → probabilidades para 6 ações.'
  },
  {
    title: 'MCP: TRÊS COMPONENTES EXPOSTOS PELO SERVIDOR',
    layout: 'mcp',
    note: 'Tools executam ações; Resources fornecem dados/contexto; Prompts são modelos de instrução reutilizáveis.',
    game: 'JOGO: não há servidor MCP ativo; este diagrama mostra como uma integração poderia ser organizada.'
  },
  {
    title: 'EMBEDDING INICIAL → REPRESENTAÇÃO CONTEXTUALIZADA',
    stages: [
      ['TOKENS', 'unidades de texto'],
      ['EMBEDDING', 'vetores iniciais'],
      ['TRANSFORMER', 'attention +\ncamadas FFN'],
      ['CONTEXTO', 'representações\nconsideram a frase']
    ],
    note: 'O embedding inicial não contém sozinho todo o contexto. O Transformer contextualiza; isso ajuda a resolver ambiguidades, mas não as elimina sempre.',
    game: 'JOGO: sua MLP tem camadas ocultas, mas não é um Transformer e não contextualiza tokens.'
  }
];

function drawBasicVisualization(canvas, questionIndex) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível iniciar o canvas da visualização dos conceitos básicos.');

  const width = canvas.width;
  const height = canvas.height;
  const visual = BASIC_VISUALS[questionIndex];
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);

  const text = (value, x, y, color = '#e2e8f0', font = '13px Consolas, monospace') => {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.fillText(value, x, y);
  };
  const wrappedText = (value, x, y, maxWidth, lineHeight, color) => {
    ctx.fillStyle = color;
    ctx.font = '12px Consolas, monospace';
    const words = value.split(/\s+/);
    let line = '';
    let lineIndex = 0;
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        ctx.fillText(line, x, y + lineIndex * lineHeight);
        line = word;
        lineIndex += 1;
      } else {
        line = candidate;
      }
    }
    if (line) ctx.fillText(line, x, y + lineIndex * lineHeight);
  };
  const box = (x, y, boxWidth, boxHeight, title, detail, color = '#164e63') => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, boxWidth, boxHeight);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, boxWidth, boxHeight);
    text(title, x + 8, y + 23, '#7dd3fc', 'bold 12px Consolas, monospace');
    wrappedText(detail, x + 8, y + 49, boxWidth - 16, 17, '#e2e8f0');
  };
  const arrow = (x1, y1, x2, y2) => {
    ctx.strokeStyle = '#22d3ee';
    ctx.fillStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 8 * Math.cos(angle - Math.PI / 6), y2 - 8 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - 8 * Math.cos(angle + Math.PI / 6), y2 - 8 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  };

  text(`QUESTÃO ${String(questionIndex + 1).padStart(2, '0')} · VISUALIZAÇÃO DO CONCEITO`, 20, 27, '#67e8f9', 'bold 13px Consolas, monospace');
  text(visual.title, 20, 54, '#facc15', 'bold 15px Consolas, monospace');

  if (visual.layout === 'attention') {
    const tokens = ['O', 'banco', 'fica', 'perto', 'do', 'rio'];
    const tokenX = 28;
    const tokenY = 92;
    tokens.forEach((token, index) => {
      const x = tokenX + index * 108;
      ctx.fillStyle = token === 'banco' ? '#7c2d12' : '#164e63';
      ctx.fillRect(x, tokenY, 92, 34);
      ctx.strokeStyle = token === 'banco' ? '#fb923c' : '#38bdf8';
      ctx.strokeRect(x, tokenY, 92, 34);
      text(token, x + 8, tokenY + 22, '#e0f2fe', '12px Consolas, monospace');
    });
    text('MATRIZ ESQUEMÁTICA: quanto cada token consulta os outros', 25, 158, '#cbd5e1', '12px Consolas, monospace');
    const labels = ['O', 'banco', 'fica', 'perto', 'do', 'rio'];
    const gridX = 112;
    const gridY = 178;
    const cell = 20;
    labels.forEach((label, index) => {
      text(label, gridX + index * cell, gridY - 5, '#67e8f9', '9px Consolas, monospace');
      text(label, 30, gridY + 14 + index * cell, '#67e8f9', '9px Consolas, monospace');
      labels.forEach((_, column) => {
        const emphasized = index === 1 && column === 5;
        ctx.fillStyle = emphasized
          ? 'rgba(250, 204, 21, 0.9)'
          : index === column
            ? 'rgba(34, 197, 94, 0.75)'
            : 'rgba(56, 189, 248, 0.2)';
        ctx.fillRect(gridX + column * cell, gridY + index * cell, cell - 2, cell - 2);
      });
    });
    box(300, 204, 375, 72, 'REPRESENTAÇÃO CONTEXTUALIZADA', '“banco” pode usar pistas da frase, como “rio”.', '#14532d');
    text('A cor é só uma ilustração, não um peso real do modelo.', 300, 291, '#fbbf24', '11px Consolas, monospace');
  } else if (visual.layout === 'temperature') {
    const candidates = ['“avançar”', '“desviar”', '“esperar”'];
    const logits = [2.4, 1.8, 0.6];
    const lowTemperature = softmax(logits.map((value) => value / 0.4));
    const highTemperature = softmax(logits.map((value) => value / 1.5));
    text('MESMAS PONTUAÇÕES DE PARTIDA (LOGITS)', 24, 91, '#cbd5e1', '12px Consolas, monospace');
    text('Temperature baixa · 0,4', 260, 121, '#7dd3fc', 'bold 12px Consolas, monospace');
    text('Temperature alta · 1,5', 495, 121, '#c4b5fd', 'bold 12px Consolas, monospace');
    candidates.forEach((candidate, index) => {
      const y = 151 + index * 47;
      text(candidate, 28, y + 16, '#e2e8f0', '12px Consolas, monospace');
      [[260, lowTemperature[index], '#38bdf8'], [495, highTemperature[index], '#a78bfa']].forEach(([x, probability, color]) => {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, 150, 22);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 150 * probability, 22);
        text(`${(probability * 100).toFixed(0)}%`, x + 157, y + 16, '#e2e8f0', '11px Consolas, monospace');
      });
    });
    text('A temperatura alta deixa esta distribuição mais espalhada.', 260, 290, '#fbbf24', '11px Consolas, monospace');
  } else if (visual.layout === 'hidden-layer') {
    box(24, 126, 128, 88, 'ENTRADAS', 'idade · cor\nlocalização', '#164e63');
    box(535, 126, 156, 88, 'SAÍDA', 'premium\nmedium · basic', '#14532d');
    const inputNodes = [145, 169, 193];
    const hiddenNodes = [117, 153, 189, 225];
    const outputNodes = [150, 190, 230];
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1;
    inputNodes.forEach((fromY) => hiddenNodes.forEach((toY) => {
      ctx.beginPath();
      ctx.moveTo(152, fromY);
      ctx.lineTo(254, toY);
      ctx.stroke();
    }));
    hiddenNodes.forEach((fromY) => outputNodes.forEach((toY) => {
      ctx.beginPath();
      ctx.moveTo(362, fromY);
      ctx.lineTo(535, toY);
      ctx.stroke();
    }));
    inputNodes.forEach((y) => drawNeuron(ctx, 152, y, '#0e7490'));
    hiddenNodes.forEach((y) => drawNeuron(ctx, 300, y, '#7c3aed'));
    outputNodes.forEach((y) => drawNeuron(ctx, 535, y, '#15803d'));
    text('CAMADA OCULTA', 245, 89, '#c4b5fd', 'bold 12px Consolas, monospace');
    text('pesos + bias → ativação', 231, 251, '#cbd5e1', '11px Consolas, monospace');
    text('Combina sinais; não classifica sozinha.', 231, 277, '#fbbf24', '11px Consolas, monospace');
  } else if (visual.layout === 'mcp') {
    box(270, 83, 180, 56, 'SERVIDOR MCP', 'expõe componentes', '#164e63');
    const cards = [
      { x: 24, title: 'TOOLS', detail: 'executam ações\ncom parâmetros', color: '#164e63' },
      { x: 265, title: 'RESOURCES', detail: 'fornecem dados\ne contexto', color: '#14532d' },
      { x: 506, title: 'PROMPTS', detail: 'instruções\nreutilizáveis', color: '#581c87' }
    ];
    cards.forEach((card) => {
      arrow(360, 140, card.x + 95, 190);
      box(card.x, 190, 190, 76, card.title, card.detail, card.color);
    });
    text('O cliente descobre e usa esses componentes conforme necessário.', 24, 286, '#cbd5e1');
  } else {
    const stages = visual.stages;
    const margin = 20;
    const gap = stages.length === 4 ? 18 : 28;
    const boxWidth = (width - margin * 2 - gap * (stages.length - 1)) / stages.length;
    const boxY = 112;
    const boxHeight = 104;
    stages.forEach(([title, detail], index) => {
      const x = margin + index * (boxWidth + gap);
      const accent = index === stages.length - 1 ? '#14532d' : '#164e63';
      box(x, boxY, boxWidth, boxHeight, title, detail, accent);
      if (index < stages.length - 1) arrow(x + boxWidth + 3, boxY + boxHeight / 2, x + boxWidth + gap - 4, boxY + boxHeight / 2);
    });
    if (questionIndex === 2) {
      arrow(width - 43, 230, 65, 265);
      text('nova geração ↺', width - 175, 253, '#86efac', '11px Consolas, monospace');
    }
  }

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(16, 300, width - 32, 46);
  ctx.strokeStyle = '#334155';
  ctx.strokeRect(16, 300, width - 32, 46);
  wrappedText(visual.note, 25, 317, width - 50, 15, '#cbd5e1');
}

function drawNeuron(ctx, x, y, color) {
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

const VALIDATION_CHECKPOINTS = {
  'checkpoint-1': {
    title: '1. Tela & Recorte',
    steps: [
      { title: 'A tela é a entrada visual', explanation: 'A arena mede 720×624 pixels. O fluxo de pré-processamento também carrega o retrato do personagem e o redimensiona para 32×32. São duas imagens diferentes: a tela do jogo e a imagem do lutador.', task: 'Observe o tamanho da arena e compare com o retrato reduzido que alimenta a rede.' },
      { title: 'Veja o recorte usado pelo modelo', explanation: 'O retrato 32×32 é reduzido em blocos para virar uma entrada compacta. O tamanho do tensor de imagem no início é [32, 32, 4] (RGBA).', task: 'Execute a atividade para destacar tela, retrato 32×32 e redução para 16 features.' },
      { title: 'Checagem de entendimento', explanation: 'O tamanho da arena não é o tamanho do retrato. O recorte/redimensionamento define a entrada visual que será processada.', task: 'Identifique as duas dimensões no fluxo.' }
    ],
    question: 'No fluxo atual, o que representam 720×624 e 32×32?',
    choices: ['São as dimensões da tela do jogo e do retrato redimensionado, respectivamente.', 'São dois tamanhos do mesmo tensor RGB.', '720×624 é a imagem reduzida e 32×32 é a arena.', '32×32 é a resolução do YOLO e 720×624 é a do embedding.'],
    answer: 0,
    feedback: 'Correto: 720×624 é a tela da arena; 32×32 é a imagem do personagem redimensionada para o pré-processamento.'
  },
  'checkpoint-2': {
    title: '2. Luminância RGB',
    steps: [
      { title: 'RGB vira luminância', explanation: 'Cada pixel possui canais vermelho, verde e azul. O pipeline calcula Y = 0,299R + 0,587G + 0,114B para converter cada pixel em intensidade luminosa.', task: 'Veja no diagrama os valores RGB amostrados e a luminância calculada.' },
      { title: 'Reduza em uma grade 4×4', explanation: 'A imagem 32×32 é dividida em 16 blocos de 8×8. O código calcula a luminância média de cada bloco; estes são os 16 valores brutos entre 0 e 255.', task: 'Compare os valores da grade com o tensor de luminância mostrado no painel de pré-processamento.' },
      { title: 'Checagem de entendimento', explanation: 'Luminância resume a intensidade visual em um valor por pixel; aqui, cada feature é a média de um bloco, não uma cor RGB completa.', task: 'Escolha o que cada uma das 16 features representa.' }
    ],
    question: 'O que representam as 16 features brutas calculadas pela etapa de luminância?',
    choices: ['Índices de classe do YOLO.', 'Médias de luminância dos 16 blocos de 8×8 pixels do retrato.', 'Probabilidades de 16 tokens.', 'Os canais RGB completos de cada pixel.'],
    answer: 1,
    feedback: 'Correto: cada feature é a luminância média de um bloco 8×8, formando uma grade 4×4.'
  },
  'checkpoint-3': {
    title: '3. Normalização & dispose()',
    steps: [
      { title: 'Escalone os valores', explanation: 'Cada média bruta entre 0 e 255 é dividida por 255, ficando no intervalo [0, 1]. Isso produz as 16 features normalizadas que seguem para a rede.', task: 'Compare na visualização os valores brutos e os normalizados do mesmo bloco.' },
      { title: 'Entenda o dispose()', explanation: 'Depois de extrair as features, o tensor bruto temporário é liberado com dispose(). O contador da interface registra alocações e liberações didáticas; ele não mede bytes totais da memória do navegador.', task: 'Observe Ativos e Limpos (dispose) e localize a liberação no fluxo.' },
      { title: 'Checagem de entendimento', explanation: 'Normalização muda a escala dos valores. dispose() libera o tensor temporário que não é mais necessário; as features numéricas retornadas continuam disponíveis.', task: 'Identifique o que acontece com o dado após a normalização.' }
    ],
    question: 'Após dividir a luminância por 255, qual é o papel de dispose() neste fluxo?',
    choices: ['Apagar a arena inteira do navegador.', 'Desligar o modelo treinado.', 'Liberar o tensor bruto temporário, mantendo as features numéricas resultantes.', 'Converter as features em caixas delimitadoras YOLO.'],
    answer: 2,
    feedback: 'Correto: o tensor bruto é descartado após a extração; as features normalizadas permanecem para alimentar o modelo.'
  },
  'checkpoint-4': {
    title: '4. Warmup & Treino',
    steps: [
      { title: 'Aqueça e treine a MLP', explanation: 'Warmup executa uma passagem fictícia para preparar o caminho de inferência. O treino ajusta pesos por épocas e acompanha loss/confiança. Depois, a MLP produz probabilidades para seis ações do jogo.', task: 'Observe warmup, época, loss e saída atual de P1 no diagrama abaixo.' },
      { title: 'Compare ação e próximo token', explanation: 'As barras de P1 vêm da saída real da MLP. No lado de LLM, uma distribuição ilustrativa de tokens muda com Temperature, Top-K e Top-P. O jogo não usa esses controles: regras táticas podem até alterar a ação executada depois da saída da rede.', task: 'Ajuste os controles de amostragem e execute o exemplo; compare candidatos com as seis probabilidades reais da MLP.' },
      { title: 'Checagem de entendimento', explanation: 'Probabilidades de ação são categorias de movimento; probabilidades de token são candidatos de texto. Temperature/Top-K/Top-P pertencem à amostragem de LLMs, não à lógica desta partida.', task: 'Escolha a comparação correta entre as duas saídas.' }
    ],
    question: 'Qual comparação entre a saída da MLP do jogo e o decoding de um LLM é correta?',
    choices: ['A MLP escolhe entre ações do jogo; Temperature/Top-K/Top-P filtram/amostram próximos tokens em LLMs.', 'O agente usa Top-K para escolher a rota BFS.', 'As probabilidades de ação são embeddings de tokens.', 'Warmup garante que o jogo sempre escolha a ação de maior probabilidade.'],
    answer: 0,
    feedback: 'Correto: a MLP fornece scores para ações; os controles de decoding orientam a escolha de tokens gerados por um LLM.'
  },
  'checkpoint-5': {
    title: '5. YOLO: 1º Objeto',
    steps: [
      { title: 'Detecte e classifique', explanation: 'O detector do laboratório monta detecções de jogadores, bombas e explosões, cada uma com classe, confiança e caixa delimitadora. A visualização destaca o primeiro resultado após o filtro escolhido.', task: 'Veja a caixa do primeiro objeto filtrado e compare classe, confiança e posição.' },
      { title: 'Leia a caixa normalizada', explanation: 'Além de pixels/colunas, a saída inclui centro e tamanho da caixa normalizados para [0,1] em relação à tela. Mude o filtro de classe na seção YOLO para alterar o primeiro objeto exibido.', task: 'Execute a atividade e compare coordenadas em pixels, grade e coordenadas normalizadas.' },
      { title: 'Checagem de entendimento', explanation: 'A detecção associa região da imagem a uma classe e confiança. Neste projeto, a etapa é uma simulação didática por posição dos objetos, não inferência de pesos YOLOv8 reais.', task: 'Escolha a leitura correta do primeiro objeto filtrado.' }
    ],
    question: 'O que descreve o “1º objeto encontrado” neste laboratório?',
    choices: ['O jogador com mais épocas de treino.', 'O primeiro objeto da classe filtrada, com rótulo, confiança e caixa/posição.', 'O pixel RGB mais claro da tela.', 'O primeiro token gerado pelo modelo.'],
    answer: 1,
    feedback: 'Correto: o painel mostra a primeira detecção após o filtro, com classe, confiança e localização.'
  }
};

const LESSONS = {
  embeddings: {
    steps: [
      {
        title: '1. Da frase aos tokens',
        explanation: 'Antes de trabalhar com texto, o modelo o divide em tokens. Um token pode ser uma palavra, parte de palavra ou sinal; não existe uma divisão universal para todos os modelos. No jogo, pixels viram features de luminância — não tokens de texto.',
        task: 'Primeiro, entenda a distinção: a arena processa imagem; um LLM processa tokens de texto. Avance para visualizar tokens e vetores.'
      },
      {
        title: '2. Tokens viram vetores',
        explanation: 'O embedding associa cada token a uma lista de números. Durante o treino, esses vetores aprendem padrões úteis; em modelos reais, os valores não são escolhidos por uma regra simples.',
        task: 'Compare o vetor real de pixels de P1 no painel verde com o vetor ilustrativo de um token no console. Um alimenta a MLP visual do jogo; o outro representa texto em um LLM.'
      },
      {
        title: '3. Checagem de entendimento',
        explanation: 'Use a ideia central — vetor numérico aprendido para representar um token — para responder sem confundir embedding com atenção ou amostragem.',
        task: 'Escolha a melhor definição e confira a resposta.'
      }
    ],
    question: 'O laboratório mostra 16 valores extraídos da imagem de P1. Qual comparação com um embedding de LLM está correta?',
    choices: [
      'Os 16 valores da imagem já são embeddings semânticos dos nomes dos jogadores.',
      'A arena usa features visuais; um LLM usa vetores aprendidos para representar tokens.',
      'Os valores da imagem são a distribuição de próximos tokens do LLM.',
      'Os valores da imagem são os pesos de self-attention entre palavras.'
    ],
    answer: 1,
    feedback: 'Embeddings são vetores numéricos associados a tokens. Tokenização, attention e decoding são etapas/conceitos diferentes.'
  },
  attention: {
    steps: [
      {
        title: '1. Por que olhar para outros tokens?',
        explanation: 'O significado de uma palavra pode depender das outras palavras da frase. Self-attention permite que a representação de cada token incorpore informação de outros tokens da sequência. A MLP que controla esta arena não usa self-attention.',
        task: 'Pense em quais palavras da frase “O banco fica perto do rio” ajudam a interpretar “banco”. A matriz da etapa seguinte é uma analogia visual, não a atenção do agente.'
      },
      {
        title: '2. Relações em uma matriz',
        explanation: 'Uma linha da matriz representa um token consultando outros tokens. No Transformer, relações vêm de Query e Key; os pesos resultantes combinam os Value. A matriz mostrada é esquemática.',
        task: 'Observe o mapa de perigo e a direção de fuga BFS no painel verde. Compare: o jogo busca um caminho no tabuleiro; a matriz da atividade relaciona tokens e é apenas esquemática.'
      },
      {
        title: '3. Checagem de entendimento',
        explanation: 'Self-attention é sobre relacionar tokens na sequência; não é a etapa que separa o texto em tokens nem uma estratégia de amostragem.',
        task: 'Escolha a descrição correta de self-attention e confira.'
      }
    ],
    question: 'P1 encontra uma rota de fuga com mapa de perigo e BFS. O que isso demonstra sobre self-attention?',
    choices: [
      'A BFS é a self-attention do Bomberman, pois ambas calculam rotas no tabuleiro.',
      'O jogo usa BFS; self-attention, que não existe nesta MLP, relaciona tokens em um Transformer.',
      'Cada bomba vira um token e recebe pesos de atenção do agente.',
      'Self-attention é outra forma de tokenizar o mapa em casas.'
    ],
    answer: 1,
    feedback: 'Correto: self-attention relaciona tokens da sequência por pesos de atenção. Decidir quais tokens existem é tokenização; escolher saídas é decoding.'
  },
  decoding: {
    steps: [
      {
        title: '1. O modelo propõe candidatos',
        explanation: 'Depois de processar o contexto, um LLM calcula scores (logits) para possíveis próximos tokens. Uma distribuição de probabilidades pode ser amostrada para escolher um deles. O agente do jogo escolhe ações, não palavras.',
        task: 'Na arena, a MLP produz probabilidades de ações e regras de segurança/exploração também influenciam a decisão. Isso não é geração de texto nem usa estes controles de LLM.'
      },
      {
        title: '2. Mude os controles',
        explanation: 'Temperature mais alta tende a deixar probabilidades mais uniformes; mais baixa tende a concentrá-las. Top-K limita a quantidade de candidatos; Top-P mantém candidatos até atingir massa acumulada.',
        task: 'Mude Temperature e execute duas vezes. Compare a distribuição. Depois altere Top-K ou Top-P e veja quais opções continuam elegíveis. Isso não mede factualidade.'
      },
      {
        title: '3. Checagem de entendimento',
        explanation: 'Amostragem muda como escolhemos entre candidatos; ela não acrescenta conhecimento nem corrige, por si só, fatos errados.',
        task: 'Selecione a avaliação correta da frase sobre aumentar Temperature.'
      }
    ],
    question: 'P1 escolhe entre seis ações com probabilidades da MLP. Qual afirmação compara isso corretamente com decoding de LLM?',
    choices: [
      'A partida usa Temperature e Top-P para escolher o próximo movimento.',
      'A MLP escolhe ações; Temperature, Top-K e Top-P controlam amostragem de tokens em LLMs.',
      'Aumentar Temperature treina P1 e reduz o perigo das bombas.',
      'Top-K é o algoritmo BFS usado pelo agente para fugir.'
    ],
    answer: 1,
    feedback: 'Correto: Temperature controla a forma da distribuição amostrada. Factualidade depende de outros fatores, como modelo, contexto, fontes e avaliação.'
  },
  'rag-mcp': {
    steps: [
      {
        title: '1. O problema da pergunta',
        explanation: 'Um modelo pode não conhecer seus documentos ou dados recentes. RAG busca trechos relevantes numa fonte e os adiciona ao contexto antes da geração. A arena atual não faz RAG.',
        task: 'Pense: quais notas sobre as regras do jogo ajudariam a responder a uma pergunta sobre a arena? Na próxima etapa você poderá testar uma busca simulada.'
      },
      {
        title: '2. Separe RAG de MCP',
        explanation: 'RAG descreve recuperar e usar conteúdo. MCP é um protocolo para cliente e servidor descobrirem e usarem tools, resources e prompts. Uma tool MCP pode executar uma busca RAG, mas não são a mesma coisa.',
        task: 'Execute a atividade. Identifique no console o trecho recuperado (RAG) e a chamada de ferramenta/catálogo (MCP). A busca aqui é lexical e simulada.'
      },
      {
        title: '3. Checagem de entendimento',
        explanation: 'No fluxo da questão, a busca e injeção dos chunks é RAG; chamar a ferramenta padronizada para obter esses chunks usa MCP.',
        task: 'Escolha o papel correto de cada conceito.'
      }
    ],
    question: 'Uma IA recebe o estado da arena como dado e consulta notas sobre as regras do jogo. Qual fluxo separa corretamente RAG e MCP?',
    choices: [
      'São sinônimos para adicionar contexto.',
      'MCP garante factualidade; RAG escolhe os tokens da resposta.',
      'RAG recupera e injeta trechos; MCP padroniza a comunicação para chamar a tool.',
      'RAG é o protocolo de tools; MCP é o algoritmo de similaridade vetorial.'
    ],
    answer: 2,
    feedback: 'Correto: RAG é um padrão de recuperação + geração; MCP padroniza a integração cliente/servidor e pode transportar a chamada à ferramenta.'
  },
  neo4j: {
    steps: [
      {
        title: '1. Imagine um chunk como nó',
        explanation: 'Um documento pode ser dividido em chunks. Cada chunk pode ser um nó com texto, tema e um vetor embedding, ligado ao documento de origem. O jogo não usa Neo4j nesta implementação.',
        task: 'Compare o grafo de casas e conexões calculado do labirinto no painel verde com o outro uso do Neo4j: guardar chunks e embeddings para RAG.'
      },
      {
        title: '2. Busca vetorial + relações',
        explanation: 'Um índice vetorial encontra chunks próximos ao embedding da consulta. As relações e propriedades do grafo podem ajudar a filtrar por documento, tema, serviço ou ambiente.',
        task: 'Execute a atividade e trace: consulta → embedding → índice vetorial → chunks; em seguida, relações/metadados podem refinar o resultado.'
      },
      {
        title: '3. Checagem de entendimento',
        explanation: 'Neo4j pode armazenar vetores e indexá-los para busca; ele não substitui o embedding model nem gera respostas como uma LLM.',
        task: 'Escolha a descrição de uso do Neo4j como vector database.'
      }
    ],
    question: 'O mapa do Bomberman pode ser um grafo de casas e conexões. O que torna Neo4j também útil para RAG vetorial?',
    choices: [
      'Porque elimina a necessidade de embeddings e busca somente palavras-chave.',
      'Porque pode armazenar chunks e embeddings e oferecer índice/consulta vetorial.',
      'Porque inclui uma LLM que responde sem dados.',
      'Porque converte automaticamente todo PDF em chunks.'
    ],
    answer: 1,
    feedback: 'Correto: os vetores podem ser propriedades dos nós e consultados por índice vetorial, junto com as capacidades de grafo.'
  },
  genetic: {
    steps: [
      {
        title: '1. Uma população de estratégias',
        explanation: 'Algoritmos genéticos trabalham com várias soluções candidatas. Uma função de fitness mede o quão boa é cada estratégia para o objetivo. O treinamento da MLP desta arena não usa algoritmos genéticos.',
        task: 'Compare o treino real de P1 (época e loss no painel verde) com os genes hipotéticos de evasão, agressividade e cautela da atividade. O exemplo genético não altera o agente.'
      },
      {
        title: '2. Melhore por gerações',
        explanation: 'Seleção favorece candidatos com fitness alto; cruzamento combina genes; mutação introduz variação. Depois, toda a população é avaliada novamente.',
        task: 'Execute a atividade e acompanhe o fitness da melhor solução entre gerações. O resultado varia porque a busca é aleatória.'
      },
      {
        title: '3. Checagem de entendimento',
        explanation: 'A ordem essencial é avaliar, selecionar, cruzar, mutar e avaliar a nova geração. Isso não é uma sequência de geração de tokens.',
        task: 'Escolha o ciclo que descreve algoritmos genéticos.'
      }
    ],
    question: 'O treino da MLP do Bomberman ajusta pesos por gradiente. Qual seria a diferença de um algoritmo genético aplicado a estratégias de jogo?',
    choices: [
      'Tokenizar → embedding → attention → decoding.',
      'Treinar uma única solução e congelar seus pesos.',
      'Recompensar cada token com Temperature e Top-P.',
      'Selecionar indivíduos → cruzar → mutar → reavaliar.'
    ],
    answer: 3,
    feedback: 'Correto: seleção, cruzamento, mutação e reavaliação refinam uma população de soluções ao longo das gerações.'
  },
  'hidden-layer': {
    steps: [
      {
        title: '1. Da observação à entrada',
        explanation: 'O agente do jogo recebe features numéricas do estado: caminhos livres, perigo, distância e outros sinais. A camada oculta ainda não escolhe diretamente a ação final.',
        task: 'Pense em cada entrada como uma pista sobre o estado do tabuleiro. Os valores da prática são simplificados para caber na demonstração.'
      },
      {
        title: '2. Combine sinais e escolha',
        explanation: 'Cada neurônio calcula uma soma ponderada mais bias e aplica uma ativação, aqui ReLU. A saída usa Softmax para formar probabilidades das ações. Depois, regras táticas e exploração também participam da decisão real.',
        task: 'Execute a atividade e compare o cálculo fictício Input → W·x+b → ReLU → Softmax com as probabilidades reais de ação de P1 no painel verde.'
      },
      {
        title: '3. Checagem de entendimento',
        explanation: 'A camada oculta transforma combinações de entradas em sinais úteis para a camada de saída, que decide a categoria/ação.',
        task: 'Escolha a função principal de uma camada oculta.'
      }
    ],
    question: 'Na MLP da arena, o que as camadas ocultas fazem entre os sensores do tabuleiro e as seis ações possíveis?',
    choices: [
      'Combinar as entradas e extrair padrões intermediários antes da decisão final.',
      'Escolher diretamente a classe sem camada de saída.',
      'Remover sempre colunas redundantes.',
      'Converter texto em tokens e remover pontuação.'
    ],
    answer: 0,
    feedback: 'Correto: neurônios ocultos aprendem combinações/intermediários; a camada de saída transforma isso na previsão final.'
  }
};

const STUDY_RESOURCES = [
  {
    title: 'Embeddings',
    text: 'Embeddings mapeiam tokens ou textos em vetores. Similaridade vetorial pode apoiar a recuperação de trechos em RAG.'
  },
  {
    title: 'Self-attention',
    text: 'Self-attention calcula relações entre tokens da sequência usando query, key e value; não é tokenização nem uma regra de escolha greedy.'
  },
  {
    title: 'Decoding',
    text: 'Temperature, Top-K e Top-P controlam a amostragem dos próximos tokens. Temperature não melhora factualidade por si só.'
  },
  {
    title: 'RAG',
    text: 'RAG busca chunks relevantes numa base e os injeta no prompt para a geração. A qualidade depende de retrieval e fontes; não garante factualidade.'
  },
  {
    title: 'Agente da arena',
    text: 'O agente observa a arena, calcula o perigo das bombas e usa busca em largura BFS para encontrar uma rota segura.'
  },
  {
    title: 'Neo4j vector database',
    text: 'Um chunk pode ser um nó com texto e embedding como propriedade. Um índice vetorial encontra chunks semelhantes; relações do grafo e metadados permitem complementar a recuperação.'
  },
  {
    title: 'MCP',
    text: 'Um servidor MCP pode expor tools, resources e prompts. MCP é um protocolo de integração, não o algoritmo de busca vetorial.'
  },
  {
    title: 'Algoritmos genéticos',
    text: 'Algoritmos genéticos refinam populações por seleção, cruzamento, mutação e avaliação de fitness.'
  }
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const tokenize = (text) => text.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) ?? [];
const STOP_WORDS = new Set([
  'a', 'as', 'ao', 'aos', 'com', 'como', 'da', 'das', 'de', 'do', 'dos', 'e',
  'em', 'é', 'o', 'os', 'ou', 'para', 'por', 'que', 'se', 'um', 'uma', 'uns',
  'umas', 'the', 'and', 'for', 'is', 'of', 'to'
]);
const softmax = (values) => {
  const max = Math.max(...values);
  const exponents = values.map((value) => Math.exp(value - max));
  const sum = exponents.reduce((total, value) => total + value, 0);
  return exponents.map((value) => value / sum);
};

function drawArenaLesson(canvas, state) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const { concept, step, prompt, temperature, topK, topP, complete, game } = state;
  const lesson = LESSONS[concept];
  const title = lesson.steps[step].title;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
  ctx.fillRect(12, 12, width - 24, 76);
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, width - 24, 76);
  ctx.fillStyle = '#67e8f9';
  ctx.font = 'bold 18px Consolas, monospace';
  ctx.fillText(`AULA NA ARENA · ${CONCEPTS[concept].title.toUpperCase()}`, 28, 40);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '14px Consolas, monospace';
  ctx.fillText(`${title}    ${complete ? '✓ CONCLUÍDO' : `ETAPA ${step + 1}/3`}`, 28, 67);

  ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
  ctx.fillRect(30, 112, width - 60, 408);
  ctx.strokeStyle = 'rgba(103, 232, 249, 0.7)';
  ctx.strokeRect(30, 112, width - 60, 408);

  const text = (value, x, y, color = '#e2e8f0', font = '15px Consolas, monospace') => {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.fillText(value, x, y);
  };
  const box = (x, y, w, h, label, color = '#0f172a') => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(x, y, w, h);
    text(label, x + 10, y + h / 2 + 5, '#e0f2fe', '14px Consolas, monospace');
  };
  const arrow = (x1, y1, x2, y2, color = '#22d3ee') => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 9 * Math.cos(angle - Math.PI / 6), y2 - 9 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - 9 * Math.cos(angle + Math.PI / 6), y2 - 9 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  };
  const tokens = (value) => (value.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) ?? []).slice(0, 8);
  const wrapText = (value, x, y, maxWidth, lineHeight, maxLines, color) => {
    ctx.fillStyle = color;
    const words = value.split(/\s+/);
    let line = '';
    let lineIndex = 0;
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        ctx.fillText(line, x, y + lineIndex * lineHeight);
        line = word;
        lineIndex += 1;
        if (lineIndex >= maxLines) {
          const truncated = line.length > 3 ? `${line.slice(0, 3)}…` : line;
          ctx.fillText(truncated, x, y + lineIndex * lineHeight);
          return;
        }
      } else {
        line = candidate;
      }
    }
    if (line && lineIndex < maxLines) ctx.fillText(line, x, y + lineIndex * lineHeight);
  };

  if (concept === 'embeddings') {
    const words = tokens(prompt).filter((token) => /\p{L}/u.test(token)).slice(0, 7);
    if (step === 0) {
      text('FRASE → TOKENIZADOR → UNIDADES DE TEXTO', 62, 153, '#facc15', 'bold 17px Consolas, monospace');
      words.forEach((word, index) => {
        const x = 62 + index * 82;
        box(x, 210, 72, 54, word, '#164e63');
        text(`token ${index}`, x + 3, 286, '#94a3b8', '11px Consolas, monospace');
        arrow(x + 36, 302, x + 36, 344);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(x + 25, 350, 22, 22);
      });
      text('O tokenizer real pode dividir palavras em subpalavras.', 62, 411, '#cbd5e1');
      text('Pixels da arena viram features visuais; não são tokens de texto.', 62, 442, '#fbbf24', 'bold 14px Consolas, monospace');
    } else if (step === 1) {
      text('TOKEN → TABELA DE EMBEDDINGS → VETOR', 62, 153, '#facc15', 'bold 17px Consolas, monospace');
      const selected = words[0] ?? 'token';
      box(65, 216, 112, 62, `"${selected}"`, '#164e63');
      arrow(188, 247, 282, 247);
      const vec = illustrativeVector(selected);
      vec.forEach((value, index) => {
        const x = 300 + index * 78;
        const barHeight = 32 + value * 112;
        ctx.fillStyle = ['#38bdf8', '#4ade80', '#c084fc', '#facc15'][index];
        ctx.fillRect(x, 390 - barHeight, 48, barHeight);
        text(`d${index}: ${value.toFixed(2)}`, x - 5, 414, '#e2e8f0', '11px Consolas, monospace');
      });
      text(`[${vec.map((value) => value.toFixed(2)).join(', ')}]`, 282, 310, '#67e8f9', 'bold 16px Consolas, monospace');
      text('Vetor ilustrativo, não aprendido nem semanticamente válido.', 62, 467, '#fbbf24', '14px Consolas, monospace');
    } else {
      box(62, 200, 220, 92, 'token → vetor');
      arrow(288, 246, 410, 246);
      box(420, 200, 210, 92, 'representação numérica', '#14532d');
      text('A alternativa correta estará destacada em verde na checagem.', 62, 354, '#86efac');
      text('Observe: embedding ≠ tokenização ≠ attention.', 62, 389, '#e2e8f0');
    }
  } else if (concept === 'attention') {
    const words = tokens(prompt || 'O banco fica perto do rio').filter((token) => /\p{L}/u.test(token)).slice(0, 7);
    if (step === 0) {
      text('CONTEXTO MUDA A REPRESENTAÇÃO DE UMA PALAVRA', 62, 153, '#facc15', 'bold 17px Consolas, monospace');
      words.forEach((word, index) => {
        const x = 65 + index * 82;
        box(x, 222, 72, 50, word, word.toLowerCase().startsWith('banc') ? '#7c2d12' : '#164e63');
      });
      if (words.length >= 3) {
        arrow(150, 302, 475, 302, '#f97316');
        text('“rio” ajuda a interpretar “banco”', 178, 333, '#fdba74');
      }
      text('A camada contextualiza tokens olhando para outros tokens.', 62, 410);
      text('O MLP da arena NÃO usa self-attention.', 62, 449, '#fbbf24', 'bold 14px Consolas, monospace');
    } else if (step === 1) {
      text('MAPA DE ATENÇÃO ESQUEMÁTICO: linhas consultam colunas', 62, 153, '#facc15', 'bold 15px Consolas, monospace');
      const count = Math.min(words.length, 6);
      words.slice(0, count).forEach((word, index) => {
        text(word.slice(0, 8), 90 + index * 80, 207, '#67e8f9', '12px Consolas, monospace');
        text(word.slice(0, 8), 58, 244 + index * 45, '#67e8f9', '12px Consolas, monospace');
      });
      for (let row = 0; row < count; row++) {
        for (let column = 0; column < count; column++) {
          ctx.fillStyle = row === column ? 'rgba(34, 197, 94, 0.8)' : 'rgba(56, 189, 248, 0.22)';
          ctx.fillRect(112 + column * 80, 220 + row * 45, 54, 27);
        }
      }
      text('Cor forte = foco esquemático. Pesos reais vêm de Q·Kᵀ.', 62, 520, '#fbbf24', '12px Consolas, monospace');
    } else {
      box(62, 235, 150, 72, 'Query (Q)');
      box(284, 235, 150, 72, 'Key (K)');
      box(506, 235, 150, 72, 'Value (V)');
      arrow(216, 270, 274, 270);
      arrow(438, 270, 496, 270);
      text('softmax(QKᵀ / √dₖ) × V', 214, 365, '#86efac', 'bold 22px Consolas, monospace');
      text('A correta: cada token pondera informação dos demais.', 62, 429);
    }
  } else if (concept === 'decoding') {
    const names = ['AVANÇAR', 'DESVIAR', 'ESPERAR', 'TOOL', 'RESPONDER'];
    const baseLogits = [2.4, 2.1, 1.3, 0.8, 0.2];
    const probabilities = softmax(baseLogits.map((value) => value / temperature));
    const k = Math.max(1, Math.min(topK, names.length));
    const chosen = probabilities.map((probability, index) => ({ probability, index }))
      .sort((left, right) => right.probability - left.probability)
      .slice(0, k);
    let mass = 0;
    const pSet = new Set();
    for (const candidate of chosen) {
      pSet.add(candidate.index);
      mass += candidate.probability / chosen.reduce((sum, item) => sum + item.probability, 0);
      if (mass >= topP) break;
    }
    text('PRÓXIMO TOKEN CANDIDATO · distribuição didática', 62, 153, '#facc15', 'bold 16px Consolas, monospace');
    names.forEach((name, index) => {
      const y = 206 + index * 52;
      box(62, y, 150, 35, name, '#164e63');
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(232, y + 5, 330, 25);
      ctx.fillStyle = chosen.some((item) => item.index === index) ? '#38bdf8' : '#475569';
      ctx.fillRect(232, y + 5, 330 * probabilities[index], 25);
      text(`${(probabilities[index] * 100).toFixed(1)}%`, 574, y + 24, '#e2e8f0', '13px Consolas, monospace');
      text(pSet.has(index) ? 'incluído' : 'filtrado', 626, y + 24, pSet.has(index) ? '#86efac' : '#94a3b8', '11px Consolas, monospace');
    });
    text(`Temperature ${temperature.toFixed(1)} · Top-K ${k} · Top-P ${topP.toFixed(1)}`, 62, 492, '#67e8f9');
    text('No Bomberman, as saídas são ações do MLP; estes filtros são de LLM.', 62, 520, '#fbbf24', '12px Consolas, monospace');
  } else if (concept === 'rag-mcp') {
    const query = prompt.toLowerCase();
    const matched = query.includes('bomba') || query.includes('rota') || query.includes('jogo')
      ? 'Regras da arena: bombas explodem em cruz; BFS procura caminho seguro.'
      : 'Notas do curso: RAG recupera chunks; MCP padroniza chamadas de ferramentas.';
    if (step === 0) {
      text('PERGUNTA → DOCUMENTOS → TRECHOS (CHUNKS)', 62, 153, '#facc15', 'bold 17px Consolas, monospace');
      box(62, 216, 160, 72, 'pergunta', '#164e63');
      box(282, 192, 150, 60, 'manual do jogo');
      box(282, 270, 150, 60, 'notas do curso');
      arrow(230, 250, 272, 222);
      arrow(230, 250, 272, 300);
      text('RAG busca a informação que falta ao modelo.', 62, 398);
      text('A arena atual não executa RAG automaticamente.', 62, 435, '#fbbf24');
    } else if (step === 1) {
      box(62, 228, 166, 68, 'CLIENTE MCP', '#164e63');
      box(276, 195, 176, 54, 'tool: buscar notas');
      box(276, 268, 176, 54, 'resource: arena');
      box(500, 228, 152, 68, 'resultado', '#14532d');
      arrow(236, 250, 267, 222);
      arrow(236, 266, 267, 295);
      arrow(459, 255, 491, 255, '#4ade80');
      text(`chunk recuperado: “${matched}”`.slice(0, 78), 62, 370, '#67e8f9', '12px Consolas, monospace');
      text('RAG = conteúdo recuperado · MCP = protocolo da chamada', 62, 420, '#fbbf24', '12px Consolas, monospace');
    } else {
      box(62, 224, 172, 82, 'RAG: buscar + citar');
      arrow(245, 265, 322, 265);
      box(334, 224, 300, 82, 'MCP: tools / resources / prompts', '#14532d');
      text('MCP não é o algoritmo de busca vetorial nem garantia de verdade.', 62, 384, '#fbbf24', '13px Consolas, monospace');
      text('Esta arena não possui servidor MCP conectado.', 62, 426);
    }
  } else if (concept === 'neo4j') {
    const nodes = step === 0
      ? [{ x: 120, y: 278, label: 'Document' }, { x: 360, y: 278, label: 'Chunk' }, { x: 570, y: 278, label: 'Embedding' }]
      : [{ x: 120, y: 278, label: 'Tema: TPM' }, { x: 360, y: 278, label: 'Chunk + vetor' }, { x: 570, y: 278, label: 'Consulta' }];
    text('GRAFO DE CONHECIMENTO + ÍNDICE VETORIAL', 62, 153, '#facc15', 'bold 17px Consolas, monospace');
    arrow(nodes[0].x + 86, nodes[0].y, nodes[1].x - 86, nodes[1].y);
    arrow(nodes[1].x + 86, nodes[1].y, nodes[2].x - 86, nodes[2].y, '#4ade80');
    nodes.forEach((node, index) => {
      ctx.beginPath();
      ctx.fillStyle = index === 1 ? '#14532d' : '#164e63';
      ctx.strokeStyle = index === 1 ? '#4ade80' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.arc(node.x, node.y, 54, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      text(node.label, node.x - 41, node.y + 5, '#e0f2fe', '12px Consolas, monospace');
    });
    text(step === 0 ? 'Document —HAS_CHUNK→ Chunk {text, topic}' : 'Índice vetorial: consulta → chunks semelhantes', 62, 386, '#67e8f9');
    text('Neo4j guarda/retrieves os vetores; não é a LLM nem cria embeddings.', 62, 429, '#fbbf24', '13px Consolas, monospace');
    text('Relações e metadados filtram ou enriquecem os resultados.', 62, 465);
  } else if (concept === 'genetic') {
    const generation = step === 0 ? 1 : step === 1 ? 5 : 8;
    text(`POPULAÇÃO DE ESTRATÉGIAS · GERAÇÃO ${generation}`, 62, 153, '#facc15', 'bold 17px Consolas, monospace');
    for (let row = 0; row < 5; row++) {
      const y = 197 + row * 54;
      const fit = Math.max(0.18, 0.35 + generation * 0.07 - row * 0.08);
      text(`indivíduo ${row + 1}`, 62, y + 22, '#cbd5e1', '12px Consolas, monospace');
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(170, y, 330, 28);
      ctx.fillStyle = row < 2 ? '#22c55e' : '#6366f1';
      ctx.fillRect(170, y, 330 * Math.min(fit, 0.95), 28);
      text(`fitness ${(fit * 100).toFixed(0)}%`, 515, y + 20, '#e2e8f0', '12px Consolas, monospace');
      text(row < 2 ? 'selecionado' : 'variação', 600, y + 20, row < 2 ? '#86efac' : '#c4b5fd', '10px Consolas, monospace');
    }
    text(step === 0 ? 'Avalie soluções com uma função de fitness.' : 'SELEÇÃO → CRUZAMENTO → MUTAÇÃO → REAVALIAÇÃO', 62, 496, '#67e8f9', '13px Consolas, monospace');
    text('O MLP de combate não é treinado por algoritmo genético.', 62, 520, '#fbbf24', '12px Consolas, monospace');
  } else {
    const inputLabels = ['caminho', 'perigo', 'distância'];
    const inputValues = [0.8, 0.2, 0.1];
    const hiddenValues = [0.57, 0.13, 0.46, 0.06];
    const actions = ['CIMA', 'BAIXO', 'ESQUERDA', 'DIREITA', 'BOMBA', 'ESPERAR'];
    text('ESTADO DO JOGO → CAMADAS → AÇÃO', 62, 153, '#facc15', 'bold 17px Consolas, monospace');
    const inputX = 122;
    const hiddenX = 352;
    const outputX = 582;
    inputLabels.forEach((label, index) => {
      const y = 228 + index * 92;
      text(`${label} ${inputValues[index].toFixed(1)}`, 58, y + 5, '#67e8f9', '11px Consolas, monospace');
      ctx.beginPath(); ctx.arc(inputX, y, 17, 0, Math.PI * 2); ctx.fillStyle = '#0e7490'; ctx.fill();
    });
    hiddenValues.forEach((value, index) => {
      const y = 206 + index * 56;
      for (let row = 0; row < inputLabels.length; row++) {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.42)';
        ctx.beginPath(); ctx.moveTo(inputX + 18, 228 + row * 92); ctx.lineTo(hiddenX - 18, y); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(hiddenX, y, 16, 0, Math.PI * 2); ctx.fillStyle = '#7c3aed'; ctx.fill();
      text(value.toFixed(2), hiddenX - 14, y + 4, '#fff', '10px Consolas, monospace');
    });
    actions.slice(0, 4).forEach((action, index) => {
      const y = 208 + index * 57;
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.48)';
      ctx.beginPath(); ctx.moveTo(hiddenX + 18, 206 + (index % 4) * 56); ctx.lineTo(outputX - 32, y); ctx.stroke();
      box(outputX - 30, y - 15, 98, 30, action, index === 2 ? '#14532d' : '#164e63');
    });
    text('entrada → z = W·x + b → ReLU → probabilidades', 62, 470, '#67e8f9', '13px Consolas, monospace');
    text('Pesos são didáticos; o agente também aplica regras táticas.', 62, 505, '#fbbf24', '12px Consolas, monospace');
  }

  if (step === 2 && state.quiz) {
    const quiz = state.quiz;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.96)';
    ctx.fillRect(42, 396, width - 84, 116);
    ctx.strokeStyle = '#22d3ee';
    ctx.strokeRect(42, 396, width - 84, 116);
    text('CHECAGEM NA ARENA', 54, 415, '#67e8f9', 'bold 12px Consolas, monospace');
    ctx.font = '11px Consolas, monospace';
    wrapText(quiz.question, 54, 434, width - 110, 13, 1, '#f8fafc');
    quiz.choices.forEach((choice, index) => {
      const x = index % 2 === 0 ? 54 : 366;
      const y = 450 + Math.floor(index / 2) * 28;
      const isCorrect = quiz.submitted && index === quiz.answer;
      const isWrong = quiz.submitted?.selected === index && !quiz.submitted.correct;
      ctx.fillStyle = isCorrect ? 'rgba(34, 197, 94, 0.62)' : isWrong ? 'rgba(248, 113, 113, 0.5)' : '#1e293b';
      ctx.fillRect(x, y, 294, 24);
      ctx.font = '10px Consolas, monospace';
      wrapText(`${String.fromCharCode(65 + index)}. ${choice}`, x + 5, y + 10, 282, 10, 2, isCorrect ? '#86efac' : isWrong ? '#fca5a5' : '#cbd5e1');
      if (isCorrect) text('✓', x + 280, y + 17, '#86efac', 'bold 14px Consolas, monospace');
    });
  }

  const actors = [game?.p1, game?.p2].filter((player) => player && Number.isFinite(player.gridCol));
  if (actors.length > 0) {
    text(
      `ESTADO REAL DA PARTIDA · P1 (${actors[0].gridCol},${actors[0].gridRow})${actors[1] ? ` · P2 (${actors[1].gridCol},${actors[1].gridRow})` : ''} · bombas ${game.bombCount}`,
      24,
      height - 19,
      '#f8fafc',
      '12px Consolas, monospace'
    );
  }
}

function drawCheckpointVisualization(canvas, state) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const { checkpoint, step, temperature, topK, topP, game = {} } = state;
  const lesson = VALIDATION_CHECKPOINTS[checkpoint];
  const text = (value, x, y, color = '#e2e8f0', font = '15px Consolas, monospace') => {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.fillText(value, x, y);
  };
  const panel = (x, y, w, h, title, color = '#164e63') => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    text(title, x + 12, y + 24, '#67e8f9', 'bold 14px Consolas, monospace');
  };
  const arrow = (x1, y1, x2, y2) => {
    ctx.strokeStyle = '#22d3ee';
    ctx.fillStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 10, y2 - 6);
    ctx.lineTo(x2 - 10, y2 + 6);
    ctx.closePath();
    ctx.fill();
  };

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#334155';
  ctx.strokeRect(1, 1, width - 2, height - 2);
  text('VISUALIZAÇÃO DO CHECKPOINT', 24, 32, '#67e8f9', 'bold 18px Consolas, monospace');
  text(lesson.title, 24, 62, '#facc15', 'bold 16px Consolas, monospace');
  text(`${lesson.steps[step].title} · ETAPA ${step + 1}/3`, 24, 88, '#cbd5e1', '13px Consolas, monospace');

  if (checkpoint === 'checkpoint-1') {
    panel(32, 116, 286, 286, 'TELA DO JOGO · 720×624');
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(60, 160, 230, 198);
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(60, 160, 230, 198);
    ctx.fillStyle = '#334155';
    ctx.fillRect(74, 178, 45, 28);
    ctx.fillRect(170, 214, 55, 24);
    ctx.fillRect(235, 305, 38, 35);
    ctx.fillStyle = '#f87171';
    ctx.beginPath(); ctx.arc(96, 304, 13, 0, Math.PI * 2); ctx.fill();
    text('arena observada', 72, 383, '#94a3b8', '12px Consolas, monospace');
    arrow(330, 256, 386, 256);
    panel(402, 116, 286, 286, 'RETRATO DE ENTRADA · 32×32');
    const preview = game.facePreview;
    if (preview) ctx.drawImage(preview, 478, 168, 128, 128);
    else {
      ctx.fillStyle = '#334155'; ctx.fillRect(478, 168, 128, 128);
    }
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(478 + i * 32, 168); ctx.lineTo(478 + i * 32, 296); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(478, 168 + i * 32); ctx.lineTo(606, 168 + i * 32); ctx.stroke();
    }
    text(`imagem de origem: ${game.sourceDimensions?.width ?? 32}×${game.sourceDimensions?.height ?? 32}px`, 420, 333, '#e2e8f0', '12px Consolas, monospace');
    text('A tela e o retrato são entradas diferentes.', 420, 374, '#fbbf24', '12px Consolas, monospace');
  } else if (checkpoint === 'checkpoint-2') {
    panel(32, 116, 286, 286, 'AMOSTRA RGB → LUMINÂNCIA');
    const [red = 0, green = 0, blue = 0] = game.rgbSample ?? [];
    const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
    text(`R = ${red}`, 54, 177, '#f87171');
    text(`G = ${green}`, 54, 216, '#4ade80');
    text(`B = ${blue}`, 54, 255, '#60a5fa');
    text(`Y = .299R + .587G + .114B`, 54, 312, '#facc15', 'bold 14px Consolas, monospace');
    text(`Y amostrado ≈ ${luminance.toFixed(1)} / 255`, 54, 354, '#e2e8f0', '13px Consolas, monospace');
    panel(402, 116, 286, 286, '4×4 MÉDIAS DE LUMINÂNCIA');
    (game.rawFeatures ?? Array(16).fill(0)).forEach((value, index) => {
      const x = 440 + (index % 4) * 55;
      const y = 160 + Math.floor(index / 4) * 55;
      const light = Math.max(0, Math.min(255, Number(value) || 0));
      ctx.fillStyle = `rgb(${light},${light},${light})`;
      ctx.fillRect(x, y, 48, 48);
      ctx.strokeStyle = '#64748b'; ctx.strokeRect(x, y, 48, 48);
      text(String(Math.round(light)), x + 7, y + 29, light > 130 ? '#020617' : '#f8fafc', '11px Consolas, monospace');
    });
    text('cada célula = média de um bloco 8×8', 420, 400, '#fbbf24', '12px Consolas, monospace');
  } else if (checkpoint === 'checkpoint-3') {
    panel(32, 116, 320, 286, 'VALOR BRUTO · 0 A 255');
    panel(368, 116, 320, 286, 'NORMALIZADO · 0 A 1');
    (game.rawFeatures ?? Array(16).fill(0)).forEach((raw, index) => {
      const normalized = game.faceFeatures?.[index] ?? raw / 255;
      const x1 = 52 + (index % 4) * 70;
      const y1 = 160 + Math.floor(index / 4) * 52;
      const x2 = x1 + 336;
      ctx.fillStyle = '#1e293b'; ctx.fillRect(x1, y1, 60, 28);
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(x1, y1, 60 * Math.min(1, raw / 255), 28);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(x2, y1, 60, 28);
      ctx.fillStyle = '#22c55e'; ctx.fillRect(x2, y1, 60 * normalized, 28);
      text(String(raw), x1 + 3, y1 + 46, '#e2e8f0', '11px Consolas, monospace');
      text(normalized.toFixed(2), x2 + 3, y1 + 46, '#e2e8f0', '11px Consolas, monospace');
    });
    text('cada feature normalizada = valor bruto ÷ 255', 45, 393, '#67e8f9', '13px Consolas, monospace');
    panel(32, 418, 656, 48, 'TENSORES TEMPORÁRIOS');
    text(`Ativos: ${game.tensorMemory?.active ?? 0}     Limpos (dispose): ${game.tensorMemory?.disposed ?? 0}     dispose() libera o bruto após extrair features.`,
      48, 450, '#fbbf24', '12px Consolas, monospace');
  } else if (checkpoint === 'checkpoint-4') {
    const probs = game.probabilities ?? Array(6).fill(1 / 6);
    panel(32, 116, 320, 334, 'BOMBERMAN · AÇÕES DA MLP');
    panel(368, 116, 320, 334, 'LLM · PRÓXIMOS TOKENS (EXEMPLO)');
    text(`warmup: ${game.warmupMs ?? 'aguardando'} ms`, 48, 164, '#facc15', '13px Consolas, monospace');
    text(`treino: época ${game.trainingMetrics?.epoch ?? 0}/${game.trainingMetrics?.totalEpochs || '…'} · loss ${Number.isFinite(game.trainingMetrics?.loss) ? game.trainingMetrics.loss.toFixed(3) : '…'}`, 48, 187, '#cbd5e1', '11px Consolas, monospace');
    GAME_ACTIONS.forEach((action, index) => {
      const y = 220 + index * 32;
      const probability = probs[index] ?? 0;
      text(action, 48, y + 15, index === game.chosenAction ? '#86efac' : '#cbd5e1', '11px Consolas, monospace');
      ctx.fillStyle = '#1e293b'; ctx.fillRect(132, y, 154, 19);
      ctx.fillStyle = index === game.chosenAction ? '#22c55e' : '#38bdf8';
      ctx.fillRect(132, y, 154 * probability, 19);
      text(`${(probability * 100).toFixed(1)}%`, 292, y + 15, '#e2e8f0', '11px Consolas, monospace');
    });
    const candidates = [
      { token: ' avançar', logit: 2.4 },
      { token: ' desviar', logit: 2.1 },
      { token: ' esperar', logit: 1.3 },
      { token: ' usar ferramenta', logit: 0.8 },
      { token: ' responder', logit: 0.2 }
    ];
    const tokenProbs = softmax(candidates.map(({ logit }) => logit / temperature));
    const ranked = candidates.map((candidate, index) => ({ ...candidate, probability: tokenProbs[index] }))
      .sort((left, right) => right.probability - left.probability);
    const topKCandidates = ranked.slice(0, Math.min(topK, ranked.length));
    const topKTotal = topKCandidates.reduce((sum, item) => sum + item.probability, 0);
    let cumulative = 0;
    const allowed = new Set();
    for (const candidate of topKCandidates) {
      allowed.add(candidate.token);
      cumulative += candidate.probability / topKTotal;
      if (cumulative >= topP) break;
    }
    ranked.forEach((candidate, index) => {
      const y = 206 + index * 36;
      text(candidate.token.trim().toUpperCase(), 382, y + 15, allowed.has(candidate.token) ? '#cbd5e1' : '#64748b', '10px Consolas, monospace');
      ctx.fillStyle = '#1e293b'; ctx.fillRect(510, y, 112, 19);
      ctx.fillStyle = allowed.has(candidate.token) ? '#a78bfa' : '#475569';
      ctx.fillRect(510, y, 112 * candidate.probability, 19);
      text(`${(candidate.probability * 100).toFixed(1)}%`, 628, y + 15, '#e2e8f0', '10px Consolas, monospace');
    });
    text(`Temperature ${temperature.toFixed(1)} · Top-K ${topK} · Top-P ${topP.toFixed(1)}`, 382, 408, '#c4b5fd', '11px Consolas, monospace');
    text(`${game.chosenMode ?? 'ação'}: ${GAME_ACTIONS[game.chosenAction] ?? 'AGUARDAR'} · a regra tática pode ajustar a saída da MLP.`,
      48, 476, '#fbbf24', '12px Consolas, monospace');
  } else if (checkpoint === 'checkpoint-5') {
    panel(32, 116, 354, 334, 'ARENA · DETECÇÕES FILTRADAS');
    const grid = game.grid;
    const cell = 22;
    const offsetX = 46;
    const offsetY = 146;
    if (grid?.matrix) {
      grid.matrix.forEach((row, rowIndex) => row.forEach((tile, colIndex) => {
        const x = offsetX + colIndex * cell;
        const y = offsetY + rowIndex * cell;
        ctx.fillStyle = tile === 1 ? '#475569' : tile === 2 ? '#b45309' : '#0f172a';
        ctx.fillRect(x, y, cell - 1, cell - 1);
      }));
      const detections = game.detections ?? [];
      detections.forEach((detection, index) => {
        const x = offsetX + detection.col * cell;
        const y = offsetY + detection.row * cell;
        ctx.strokeStyle = index === 0 ? '#00ffcc' : detection.color ?? '#38bdf8';
        ctx.lineWidth = index === 0 ? 3 : 1;
        ctx.strokeRect(x + 1, y + 1, cell - 3, cell - 3);
      });
    }
    panel(410, 116, 278, 334, 'SAÍDA DO DETECTOR');
    const first = game.detections?.[0];
    if (first) {
      text(`1º objeto: ${first.label}`, 430, 174, '#86efac');
      text(`classe: ${first.classId} · confiança: ${(first.conf * 100).toFixed(0)}%`, 430, 211, '#e2e8f0', '12px Consolas, monospace');
      text(`pixel: x=${first.pxX} y=${first.pxY}`, 430, 251, '#cbd5e1', '12px Consolas, monospace');
      text(`grid: coluna ${first.col} linha ${first.row}`, 430, 291, '#cbd5e1', '12px Consolas, monospace');
      text(`bbox norm: cx=${first.cx} cy=${first.cy}`, 430, 331, '#67e8f9', '12px Consolas, monospace');
      text(`w=${first.w} h=${first.h}`, 430, 359, '#67e8f9', '12px Consolas, monospace');
    } else {
      text('Nenhum objeto no filtro.', 430, 190, '#fbbf24');
      text('Altere a classe no seletor YOLO.', 430, 226, '#cbd5e1', '12px Consolas, monospace');
    }
    text('Demonstração de detector simulada; não são pesos YOLOv8 treinados.', 40, 476, '#fbbf24', '12px Consolas, monospace');
  }
}

function illustrativeVector(token) {
  let seed = 2166136261;
  for (const char of token.toLowerCase()) {
    seed ^= char.codePointAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return Array.from({ length: 4 }, (_, index) => {
    const value = Math.sin((seed >>> (index * 5)) + (index + 1) * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  });
}

export function initStudyConsole({ getGameState = () => null }) {
  const basicsTab = document.getElementById('study-focus-basics');
  const checkpointsTab = document.getElementById('study-focus-checkpoints');
  const basicsPanel = document.getElementById('study-basics');
  const checkpointsPanel = document.getElementById('checkpoint-study');
  const basicQuestionSelect = document.getElementById('basic-question-select');
  const basicQuestion = document.getElementById('basic-question');
  const basicVisualization = document.getElementById('basic-visualization');
  const basicAnswers = document.getElementById('basic-answers');
  const basicCheckButton = document.getElementById('basic-check');
  const basicFeedback = document.getElementById('basic-feedback');
  const basicGameRelation = document.getElementById('basic-game-relation');
  const basicQuestionCount = document.getElementById('basic-question-count');
  const basicScore = document.getElementById('basic-score');
  const basicProgress = document.getElementById('basic-progress');
  const basicPrevious = document.getElementById('basic-previous');
  const basicNext = document.getElementById('basic-next');
  const conceptSelect = document.getElementById('study-concept');
  const visualization = document.getElementById('study-visualization');
  const promptInput = document.getElementById('study-prompt');
  const explanation = document.getElementById('study-explanation');
  const stepTitle = document.getElementById('study-step-title');
  const stepTask = document.getElementById('study-task');
  const gameTitle = document.getElementById('study-game-title');
  const gameDescription = document.getElementById('study-game-description');
  const gameEvidence = document.getElementById('study-game-evidence');
  const liveGameStatus = document.getElementById('study-live-status');
  const liveGameDetails = document.getElementById('study-live-details');
  const stepCount = document.getElementById('study-step-count');
  const stepStatus = document.getElementById('study-step-status');
  const progress = document.getElementById('study-progress');
  const activity = document.getElementById('study-activity');
  const options = document.getElementById('study-options');
  const output = document.getElementById('study-console');
  const temperature = document.getElementById('study-temperature');
  const topK = document.getElementById('study-top-k');
  const topP = document.getElementById('study-top-p');
  const quiz = document.getElementById('study-quiz');
  const question = document.getElementById('study-question');
  const answers = document.getElementById('study-answers');
  const quizFeedback = document.getElementById('study-quiz-feedback');
  const checkAnswerButton = document.getElementById('study-check-answer');
  const correctAnswer = document.getElementById('study-correct-answer');
  const backButton = document.getElementById('study-back');
  const forwardButton = document.getElementById('study-forward');
  const runButton = document.getElementById('study-run');

  if (
    !basicsTab || !checkpointsTab || !basicsPanel || !checkpointsPanel ||
    !basicQuestionSelect || !basicQuestion || !basicVisualization || !basicAnswers || !basicCheckButton ||
    !basicFeedback || !basicGameRelation || !basicQuestionCount || !basicScore ||
    !basicProgress || !basicPrevious || !basicNext ||
    !conceptSelect || !visualization || !promptInput || !explanation || !stepTitle || !stepTask ||
    !gameTitle || !gameDescription || !gameEvidence || !liveGameStatus || !liveGameDetails ||
    !stepCount || !stepStatus ||
    !progress || !activity || !options || !output ||
    !temperature || !topK || !topP || !quiz || !question || !answers ||
    !quizFeedback || !checkAnswerButton || !correctAnswer || !backButton ||
    !forwardButton || !runButton
  ) {
    throw new Error('Elementos do console de estudo não encontrados no HTML.');
  }

  let stepIndex = 0;
  const savedSteps = new Map();
  const completedActivities = new Set();
  const completedLessons = new Set();
  const submittedAnswers = new Map();
  const basicAnswersState = new Map();
  let basicQuestionIndex = 0;
  let studyFocus = 'basics';

  BASIC_QUESTIONS.forEach((lesson, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `Questão ${String(index + 1).padStart(2, '0')} · ${lesson.code}`;
    basicQuestionSelect.appendChild(option);
  });

  const log = (message) => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    const lines = output.textContent.split('\n').filter(Boolean);
    lines.push(`[${time}] ${message}`);
    output.textContent = lines.slice(-36).join('\n');
    output.scrollTop = output.scrollHeight;
  };

  function getActivityKey() {
    return `${conceptSelect.value}:${stepIndex}`;
  }

  function renderGameLink() {
    const checkpoint = VALIDATION_CHECKPOINTS[conceptSelect.value];
    const game = getGameState() ?? {};
    const { width, height } = game.sourceDimensions ?? { width: 32, height: 32 };
    gameTitle.textContent = checkpoint.title;
    gameDescription.textContent = checkpoint.steps[stepIndex].explanation;
    if (conceptSelect.value === 'checkpoint-1') {
      gameEvidence.textContent = `Arena ${game.screenWidth ?? 720}×${game.screenHeight ?? 624}px · retrato de origem ${width}×${height}px · entrada redimensionada 32×32.`;
    } else if (conceptSelect.value === 'checkpoint-2') {
      const rgb = game.rgbSample ?? [0, 0, 0];
      gameEvidence.textContent = `RGB amostrado (${rgb.join(', ')}) → luminância ${(rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114).toFixed(1)} · 16 médias brutas em [${game.rawFeatures?.slice(0, 4).join(', ') ?? '…'}, …].`;
    } else if (conceptSelect.value === 'checkpoint-3') {
      gameEvidence.textContent = `Features normalizadas [${game.faceFeatures?.slice(0, 4).map((value) => Number(value).toFixed(2)).join(', ') ?? '…'}, …] · Ativos ${game.tensorMemory?.active ?? 0} · dispose() ${game.tensorMemory?.disposed ?? 0}.`;
    } else if (conceptSelect.value === 'checkpoint-4') {
      gameEvidence.textContent = `Warmup ${game.warmupMs ?? 'aguardando'} ms · treino ${game.trainingMetrics?.epoch ?? 0}/${game.trainingMetrics?.totalEpochs || '…'} · ação selecionada ${GAME_ACTIONS[game.chosenAction] ?? 'aguardando'}.`;
    } else {
      const first = game.detections?.[0];
      gameEvidence.textContent = first
        ? `1º objeto: ${first.label} · classe ${first.classId} · confiança ${(first.conf * 100).toFixed(0)}% · pixel (${first.pxX}, ${first.pxY}).`
        : 'Nenhum objeto no filtro atual; escolha outra classe no seletor YOLO.';
    }
    drawCheckpointVisualization(visualization, {
      checkpoint: conceptSelect.value,
      step: stepIndex,
      temperature: Number(temperature.value),
      topK: Number(topK.value),
      topP: Number(topP.value),
      game
    });
  }

  function renderLiveGameState() {
    const game = getGameState() ?? {};
    if (!game.p1 || !game.p2) {
      liveGameStatus.textContent = 'Aguardando inicialização da partida local...';
      liveGameDetails.textContent = 'Os dados aparecerão aqui assim que os jogadores e a arena forem carregados.';
      return;
    }

    liveGameStatus.textContent = game.matchEnded
      ? 'Partida local encerrada · exibindo os dados finais.'
      : 'Conectado à partida aberta neste navegador · atualização ao vivo.';
    const p1State = `P1 ${game.p1.member?.name ?? ''} (${game.p1.alive ? `${game.p1.hp} HP` : 'eliminado'}) em (${game.p1.gridCol},${game.p1.gridRow})`;
    const p2State = `P2 ${game.p2.member?.name ?? ''} (${game.p2.alive ? `${game.p2.hp} HP` : 'eliminado'}) em (${game.p2.gridCol},${game.p2.gridRow})`;
    const probabilities = game.probabilities?.map((value, index) =>
      `${GAME_ACTIONS[index]} ${(value * 100).toFixed(0)}%`
    ).join(' · ');
    const detections = game.detections?.length ?? 0;
    const training = game.training
      ? `treino ${game.trainingMetrics?.epoch ?? 0}/${game.trainingMetrics?.totalEpochs || '…'}`
      : 'treino concluído';
    liveGameDetails.textContent = [
      `${p1State} · ${p2State}`,
      `MLP sugeriu ${GAME_ACTIONS[game.chosenAction] ?? 'aguardar'} · ${training}`,
      `Bombas ${game.bombCount ?? 0} · detecções ${detections}`,
      probabilities ? `Probabilidades: ${probabilities}` : ''
    ].filter(Boolean).join('\n');
  }

  function renderQuiz(lesson) {
    question.textContent = lesson.question;
    answers.replaceChildren();
    const submitted = submittedAnswers.get(conceptSelect.value);
    lesson.choices.forEach((choice, index) => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'study-answer';
      radio.value = String(index);
      radio.checked = submitted?.selected === index;
      radio.disabled = completedLessons.has(conceptSelect.value);
      label.classList.toggle('answer-correct', submitted && index === lesson.answer);
      label.classList.toggle('answer-incorrect', submitted?.selected === index && !submitted.correct);
      label.append(radio, document.createTextNode(choice));
      if (submitted && index === lesson.answer) {
        const marker = document.createElement('strong');
        marker.textContent = ' ✓ RESPOSTA CORRETA';
        label.appendChild(marker);
      } else if (submitted?.selected === index && !submitted.correct) {
        const marker = document.createElement('strong');
        marker.textContent = ' ✗ sua escolha';
        label.appendChild(marker);
      }
      answers.appendChild(label);
    });
    correctAnswer.hidden = !submitted;
    correctAnswer.textContent = submitted
      ? `Resposta correta: ${lesson.choices[lesson.answer]}`
      : '';
    correctAnswer.style.cssText = submitted
      ? 'color:#86efac;font-weight:700;'
      : '';
  }

  function renderStep() {
    const concept = conceptSelect.value;
    const lesson = VALIDATION_CHECKPOINTS[concept];
    const step = lesson.steps[stepIndex];
    const activityComplete = completedActivities.has(getActivityKey());
    const lessonComplete = completedLessons.has(concept);

    stepTitle.textContent = step.title;
    explanation.textContent = step.explanation;
    stepTask.textContent = `Faça agora: ${step.task}`;
    stepCount.textContent = `Etapa ${stepIndex + 1} de ${lesson.steps.length}`;
    stepStatus.textContent = lessonComplete
      ? '✓ tópico concluído'
      : stepIndex === 1 && activityComplete
        ? '✓ atividade feita'
        : stepIndex === 1
          ? 'atividade obrigatória'
          : stepIndex === 2
            ? 'responda para concluir'
            : 'leia e avance';
    progress.style.width = `${((stepIndex + 1) / lesson.steps.length) * 100}%`;
    activity.hidden = stepIndex !== 1;
    promptInput.hidden = concept !== 'checkpoint-4' || stepIndex !== 1;
    options.hidden = concept !== 'checkpoint-4' || stepIndex !== 1;
    quiz.hidden = stepIndex !== 2;
    backButton.disabled = stepIndex === 0;
    forwardButton.disabled =
      (stepIndex === 1 && !activityComplete) ||
      (stepIndex === 2 && !lessonComplete);
    forwardButton.textContent = stepIndex === 0
      ? 'Ver demonstração →'
      : stepIndex === 1
        ? 'Ir para checagem →'
        : lessonComplete
          ? 'Próximo tópico →'
          : 'Concluir tópico';
    runButton.textContent = activityComplete ? 'Repetir demonstração' : 'Executar demonstração';

    if (stepIndex === 2) {
      renderQuiz(lesson);
      const submitted = submittedAnswers.get(concept);
      quizFeedback.textContent = submitted?.correct
        ? lesson.feedback
        : submitted
          ? 'A alternativa correta está destacada em verde. Reveja a explicação e tente novamente.'
          : '';
      checkAnswerButton.disabled = lessonComplete;
    }
    renderGameLink();
  }

  function updateConcept() {
    const concept = conceptSelect.value;
    stepIndex = completedLessons.has(concept) ? 2 : (savedSteps.get(concept) ?? 0);
    output.textContent = '';
    renderStep();
    log(`${VALIDATION_CHECKPOINTS[concept].title}: leia → acompanhe a visualização → confira.`);
  }

  function renderBasicQuestion() {
    const lesson = BASIC_QUESTIONS[basicQuestionIndex];
    const answerState = basicAnswersState.get(basicQuestionIndex);
    const completedCount = [...basicAnswersState.entries()]
      .filter(([index, state]) => state.checked && state.selected === BASIC_QUESTIONS[index].answer)
      .length;

    basicQuestionSelect.value = String(basicQuestionIndex);
    basicQuestion.textContent = lesson.question;
    basicQuestionCount.textContent = `Questão ${basicQuestionIndex + 1} de ${BASIC_QUESTIONS.length}`;
    basicScore.textContent = `${completedCount}/${BASIC_QUESTIONS.length} corretas`;
    basicProgress.style.width = `${(completedCount / BASIC_QUESTIONS.length) * 100}%`;
    basicGameRelation.textContent = lesson.gameRelation;
    drawBasicVisualization(basicVisualization, basicQuestionIndex);
    basicAnswers.replaceChildren();

    lesson.choices.forEach((choice, index) => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'basic-study-answer';
      radio.value = String(index);
      radio.checked = answerState?.selected === index;
      radio.disabled = answerState?.checked && answerState.selected === lesson.answer;
      label.classList.toggle('answer-correct', answerState?.checked && index === lesson.answer);
      label.classList.toggle('answer-incorrect', answerState?.checked && answerState.selected === index && index !== lesson.answer);
      label.append(radio, document.createTextNode(choice));
      if (answerState?.checked && index === lesson.answer) {
        const marker = document.createElement('strong');
        marker.textContent = ' ✓ RESPOSTA CORRETA';
        label.appendChild(marker);
      } else if (answerState?.checked && answerState.selected === index && index !== lesson.answer) {
        const marker = document.createElement('strong');
        marker.textContent = ' ✗ sua escolha';
        label.appendChild(marker);
      }
      radio.addEventListener('change', () => {
        basicAnswersState.set(basicQuestionIndex, { selected: index, checked: false });
        basicFeedback.hidden = true;
        renderBasicQuestion();
      });
      basicAnswers.appendChild(label);
    });

    basicFeedback.hidden = !answerState?.checked;
    basicFeedback.textContent = answerState?.checked
      ? `${answerState.selected === lesson.answer ? 'Você acertou. ' : 'Resposta incorreta. Alternativa correta: '}${lesson.choices[lesson.answer]} ${lesson.explanation}`
      : '';
    basicCheckButton.disabled = answerState?.checked && answerState.selected === lesson.answer;
    basicPrevious.disabled = basicQuestionIndex === 0;
    basicNext.disabled = basicQuestionIndex === BASIC_QUESTIONS.length - 1;
  }

  function setStudyFocus(focus) {
    studyFocus = focus;
    const isBasics = focus === 'basics';
    basicsPanel.hidden = !isBasics;
    checkpointsPanel.hidden = isBasics;
    basicsTab.setAttribute('aria-selected', String(isBasics));
    basicsTab.setAttribute('aria-pressed', String(isBasics));
    checkpointsTab.setAttribute('aria-selected', String(!isBasics));
    checkpointsTab.setAttribute('aria-pressed', String(!isBasics));
    if (isBasics) {
      renderBasicQuestion();
    } else {
      updateConcept();
    }
  }

  function runEmbeddings(text) {
    const tokens = tokenize(text).slice(0, 12);
    if (tokens.length === 0) {
      log('Digite uma frase para visualizar os tokens.');
      return false;
    }

    log(`TOKENIZAÇÃO DIDÁTICA: ${tokens.map((token) => `[${token}]`).join(' ')}`);
    log('ATENÇÃO: a divisão é ilustrativa; cada modelo tem seu próprio tokenizer subword.');
    for (const token of tokens) {
      let hash = 2166136261;
      for (const char of token.toLowerCase()) {
        hash ^= char.codePointAt(0);
        hash = Math.imul(hash, 16777619);
      }
      const vector = Array.from({ length: 4 }, (_, index) => {
        const value = Math.sin((hash >>> (index * 5)) + (index + 1) * 12.9898) * 43758.5453;
        return (value - Math.floor(value)).toFixed(2);
      });
      log(`embedding ilustrativo "${token}" → [${vector.join(', ')}]`);
    }
    log('Esses vetores são pseudoaleatórios para visualização, não embeddings treinados nem medidas de significado.');
    return true;
  }

  function runAttention(text) {
    const tokens = tokenize(text).filter((token) => /\p{L}/u.test(token)).slice(0, 8);
    if (tokens.length < 2) {
      log('Digite pelo menos duas palavras para visualizar uma sequência.');
      return false;
    }

    log(`SEQUÊNCIA: ${tokens.map((token, index) => `${index}:${token}`).join(' | ')}`);
    log('MATRIZ DE ATENÇÃO ESQUEMÁTICA (valores inventados; não são saída de um Transformer):');
    log(`consulta\\chave  ${tokens.map((_, index) => String(index).padStart(4)).join('')}`);
    tokens.forEach((token, row) => {
      const weights = tokens.map((_, column) => {
        const raw = column === row ? 0.55 : 0.45 / (tokens.length - 1);
        return raw.toFixed(2).padStart(4);
      });
      log(`${String(row).padStart(2)}:${token.slice(0, 8).padEnd(8)} ${weights.join('')}`);
    });
    log('No modelo real, cada camada calcula Q, K e V aprendidos; softmax(QKᵀ/√dₖ) pondera os valores V.');
    return true;
  }

  function runDecoding() {
    const prompt = promptInput.value.trim();
    const candidates = [
      { token: ' avançar', logit: 2.4 },
      { token: ' desviar', logit: 2.1 },
      { token: ' esperar', logit: 1.3 },
      { token: ' usar ferramenta', logit: 0.8 },
      { token: ' responder', logit: 0.2 }
    ];
    const temp = Number(temperature.value);
    const limitK = Number(topK.value);
    const limitP = Number(topP.value);
    const ranked = candidates
      .map((candidate) => ({ ...candidate, probability: 0 }))
      .sort((left, right) => right.logit - left.logit);
    const probabilities = softmax(ranked.map((candidate) => candidate.logit / temp));
    ranked.forEach((candidate, index) => { candidate.probability = probabilities[index]; });

    const afterTopK = ranked.slice(0, limitK);
    const topKTotal = afterTopK.reduce((sum, candidate) => sum + candidate.probability, 0);
    let cumulative = 0;
    const afterTopP = [];
    for (const candidate of afterTopK) {
      afterTopP.push(candidate);
      cumulative += candidate.probability / topKTotal;
      if (cumulative >= limitP) break;
    }

    const sampleTotal = afterTopP.reduce((sum, candidate) => sum + candidate.probability, 0);
    let draw = Math.random() * sampleTotal;
    let selected = afterTopP[afterTopP.length - 1];
    for (const candidate of afterTopP) {
      draw -= candidate.probability;
      if (draw <= 0) {
        selected = candidate;
        break;
      }
    }

    log(`PROMPT: "${prompt || '(vazio)'}"`);
    log(`Temperature=${temp.toFixed(1)} | Top-K=${limitK} | Top-P=${limitP.toFixed(1)}.`);
    log(`Candidatos didáticos após softmax: ${ranked.map((item) => `${item.token.trim()} ${(item.probability * 100).toFixed(1)}%`).join(' · ')}`);
    log(`Top-K → ${afterTopK.map((item) => item.token.trim()).join(', ')}.`);
    log(`Top-P após renormalizar Top-K → ${afterTopP.map((item) => item.token.trim()).join(', ')} (massa acumulada ${(cumulative * 100).toFixed(1)}%).`);
    log(`Amostragem deste experimento: "${selected.token.trim()}". Execute de novo para sortear outra vez.`);
    log('A distribuição é fixa e didática; um LLM real calcula logits condicionados ao contexto.');
  }

  function runRagMcp(text) {
    const queryTerms = new Set(tokenize(text.toLowerCase())
      .filter((token) => /^[\p{L}\p{N}]+$/u.test(token) && token.length > 2 && !STOP_WORDS.has(token)));
    const matches = STUDY_RESOURCES.map((resource) => {
      const terms = new Set(tokenize(`${resource.title} ${resource.text}`.toLowerCase())
        .filter((token) => /^[\p{L}\p{N}]+$/u.test(token) && token.length > 2 && !STOP_WORDS.has(token)));
      const score = [...terms].reduce((total, term) => total + (queryTerms.has(term) ? 1 : 0), 0);
      return { ...resource, score };
    }).filter((resource) => resource.score > 0).sort((left, right) => right.score - left.score).slice(0, 2);

    log('CLIENTE → MCP: listou tools, resources e prompts anunciados pelo servidor (simulação didática).');
    log('TOOLS: search_study_notes(question), inspect_arena() | RESOURCES: course://notes, game://arena-state.');
    log('PROMPTS: explain_concept(topic), review_agent_action(action).');
    if (matches.length === 0) {
      log('RAG: nenhum chunk correspondeu por sobreposição lexical; nenhum contexto foi recuperado.');
      return;
    }

    for (const resource of matches) {
      log(`RAG retrieval (score lexical ${resource.score}): [${resource.title}] ${resource.text}`);
    }
    log('RAG injeta os trechos recuperados no prompt. MCP transportaria a chamada/resultado; não garante factualidade.');
    log('Esta demonstração não conecta a um servidor MCP real e não usa busca vetorial.');
  }

  function runNeo4j() {
    log('MODELO DE GRAFO: (:Document)-[:HAS_CHUNK]->(:Chunk {text, embedding, topic}).');
    log('embedding é um vetor numérico em uma propriedade do chunk; um índice vetorial apoia a busca por similaridade.');
    log('Depois da busca, relações e metadados do grafo podem filtrar ou enriquecer os chunks recuperados.');
    log('Neo4j pode combinar grafo e busca vetorial localmente; não é uma LLM nem gera embeddings por si só.');
    log('Exemplo do curso: RAG recupera os chunks; MCP poderia expor a busca Neo4j como uma tool.');
  }

  function runGeneticAlgorithm() {
    const target = [0.8, 0.25, 0.65];
    const populationSize = 12;
    const generations = 8;
    let population = Array.from({ length: populationSize }, () =>
      target.map(() => Math.random())
    );
    const fitness = (genes) => 1 - genes.reduce((sum, gene, index) =>
      sum + Math.abs(gene - target[index]), 0
    ) / target.length;
    const tournament = () => {
      const candidates = Array.from({ length: 3 }, () => population[Math.floor(Math.random() * population.length)]);
      return candidates.sort((left, right) => fitness(right) - fitness(left))[0];
    };

    log('OBJETIVO DE BRINQUEDO: aproximar genes [evasão, agressividade, cautela] de [0.80, 0.25, 0.65].');
    for (let generation = 1; generation <= generations; generation++) {
      population.sort((left, right) => fitness(right) - fitness(left));
      const best = population[0];
      log(`G${generation}: melhor fitness ${(fitness(best) * 100).toFixed(1)}% | genes [${best.map((gene) => gene.toFixed(2)).join(', ')}]`);
      if (generation === generations) break;

      const next = population.slice(0, 2);
      while (next.length < populationSize) {
        const parentA = tournament();
        const parentB = tournament();
        const child = parentA.map((gene, index) => {
          let value = Math.random() < 0.5 ? gene : parentB[index];
          if (Math.random() < 0.18) value += (Math.random() * 0.4) - 0.2;
          return clamp(value, 0, 1);
        });
        next.push(child);
      }
      population = next;
    }
    log('Ciclo executado: avaliar → selecionar (torneio) → cruzar → mutar → nova geração.');
    log('É uma otimização de população; não é o fluxo tokenização → embedding → attention de um LLM.');
  }

  function runHiddenLayer() {
    const input = [0.8, 0.2, 0.1];
    const weights = [
      [0.7, -0.2, 0.4, 0.1],
      [-0.3, 0.8, 0.2, -0.4],
      [0.2, 0.3, -0.5, 0.6]
    ];
    const bias = [0.05, 0.1, 0.15, 0.0];
    const hidden = bias.map((value, unit) => Math.max(0,
      input.reduce((sum, feature, index) => sum + feature * weights[index][unit], value)
    ));
    const outputLogits = [
      hidden[0] - hidden[1],
      hidden[1] + hidden[2],
      hidden[0] + hidden[3],
      hidden[2] - hidden[3],
      hidden[0] * 0.3,
      0.2
    ];
    const probs = softmax(outputLogits);
    const actions = ['CIMA', 'BAIXO', 'ESQUERDA', 'DIREITA', 'BOMBA', 'ESPERAR'];
    const ranked = actions.map((action, index) => ({ action, prob: probs[index] }))
      .sort((left, right) => right.prob - left.prob);

    log(`INPUT fictício: [walkable=${input[0]}, perigo=${input[1]}, distância=${input[2]}]`);
    log(`Camada oculta: z = W·x + b → ReLU(z) = [${hidden.map((value) => value.toFixed(2)).join(', ')}].`);
    log(`Softmax de saída: ${ranked.map((item) => `${item.action} ${(item.prob * 100).toFixed(1)}%`).join(' · ')}`);
    log('Números e pesos acima são exemplos didáticos, não os pesos atuais do agente em execução.');
    log('No jogo, o MLP escolhe uma ação tática. Um Transformer usa self-attention para contextualizar tokens.');
  }

  function runExperiment() {
    const concept = conceptSelect.value;
    const game = getGameState() ?? {};
    log(`── ${VALIDATION_CHECKPOINTS[concept].title} ──`);
    if (concept === 'checkpoint-1') {
      log(`Tela ${game.screenWidth ?? 720}×${game.screenHeight ?? 624}px → retrato ${game.sourceDimensions?.width ?? 32}×${game.sourceDimensions?.height ?? 32}px → entrada redimensionada 32×32.`);
    } else if (concept === 'checkpoint-2') {
      const rgb = game.rgbSample ?? [0, 0, 0];
      const luminance = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114;
      log(`RGB (${rgb.join(', ')}) → Y=.299R+.587G+.114B=${luminance.toFixed(1)}; médias 4×4 [${game.rawFeatures?.slice(0, 4).join(', ') ?? '…'}, …].`);
    } else if (concept === 'checkpoint-3') {
      log(`Bruto [${game.rawFeatures?.slice(0, 4).join(', ') ?? '…'}, …] → normalizado [${game.faceFeatures?.slice(0, 4).join(', ') ?? '…'}, …] (÷255).`);
      log(`Tensores temporários: ativos ${game.tensorMemory?.active ?? 0}; dispose() executados ${game.tensorMemory?.disposed ?? 0}. O contador não mede bytes totais do navegador.`);
    } else if (concept === 'checkpoint-4') {
      runDecoding();
      log(`SAÍDA REAL DA MLP P1: ${game.probabilities?.map((probability, index) => `${GAME_ACTIONS[index]} ${(probability * 100).toFixed(1)}%`).join(' · ') ?? 'aguardando inferência'}.`);
      log(`Ação/mode retornados pelo agente: ${GAME_ACTIONS[game.chosenAction] ?? 'aguardando'} / ${game.chosenMode ?? 'aguardando'}; regras táticas podem substituir a ação sugerida pela distribuição.`);
    } else {
      const first = game.detections?.[0];
      log(first
        ? `1º objeto no filtro: ${first.label} (classe ${first.classId}, confiança ${(first.conf * 100).toFixed(0)}%) em pixel (${first.pxX}, ${first.pxY}); bbox norm cx=${first.cx}, cy=${first.cy}, w=${first.w}, h=${first.h}.`
        : 'Nenhuma detecção no filtro atual. Mude o filtro de classe para continuar.');
      log('Este detector é uma simulação de caixas por posição dos objetos; não executa pesos YOLOv8 treinados.');
    }
    completedActivities.add(getActivityKey());
    renderStep();
  }

  basicsTab.addEventListener('click', () => setStudyFocus('basics'));
  checkpointsTab.addEventListener('click', () => setStudyFocus('checkpoints'));
  basicQuestionSelect.addEventListener('change', () => {
    basicQuestionIndex = Number(basicQuestionSelect.value);
    renderBasicQuestion();
  });
  basicCheckButton.addEventListener('click', () => {
    const selected = basicAnswers.querySelector('input[name="basic-study-answer"]:checked');
    if (!selected) {
      basicFeedback.hidden = false;
      basicFeedback.textContent = 'Selecione uma alternativa antes de conferir.';
      return;
    }
    basicAnswersState.set(basicQuestionIndex, {
      selected: Number(selected.value),
      checked: true
    });
    renderBasicQuestion();
  });
  basicPrevious.addEventListener('click', () => {
    if (basicQuestionIndex === 0) return;
    basicQuestionIndex -= 1;
    renderBasicQuestion();
  });
  basicNext.addEventListener('click', () => {
    if (basicQuestionIndex >= BASIC_QUESTIONS.length - 1) return;
    basicQuestionIndex += 1;
    renderBasicQuestion();
  });
  conceptSelect.addEventListener('change', updateConcept);
  runButton.addEventListener('click', runExperiment);
  backButton.addEventListener('click', () => {
    if (stepIndex === 0) return;
    stepIndex -= 1;
    savedSteps.set(conceptSelect.value, stepIndex);
    renderStep();
  });
  forwardButton.addEventListener('click', () => {
    if (forwardButton.disabled) return;
    if (stepIndex === VALIDATION_CHECKPOINTS[conceptSelect.value].steps.length - 1) {
      const lastIndex = conceptSelect.options.length - 1;
      conceptSelect.selectedIndex = (conceptSelect.selectedIndex + 1) % (lastIndex + 1);
      updateConcept();
      return;
    }
    stepIndex += 1;
    savedSteps.set(conceptSelect.value, stepIndex);
    renderStep();
  });
  checkAnswerButton.addEventListener('click', () => {
    const selected = answers.querySelector('input[name="study-answer"]:checked');
    if (!selected) {
      quizFeedback.textContent = 'Escolha uma alternativa antes de conferir.';
      return;
    }

    const lesson = VALIDATION_CHECKPOINTS[conceptSelect.value];
    if (Number(selected.value) !== lesson.answer) {
      submittedAnswers.set(conceptSelect.value, {
        selected: Number(selected.value),
        correct: false
      });
      quizFeedback.textContent = 'Resposta incorreta. A alternativa correta está destacada em verde abaixo.';
      log(`CHECAGEM: alternativa correta: ${lesson.choices[lesson.answer]}`);
      renderStep();
      return;
    }

    submittedAnswers.set(conceptSelect.value, {
      selected: Number(selected.value),
      correct: true
    });
    completedLessons.add(conceptSelect.value);
    quizFeedback.textContent = `Correto! ${lesson.feedback}`;
    log(`CHECAGEM: resposta correta em “${lesson.title}”. ${lesson.feedback}`);
    renderStep();
  });
  temperature.addEventListener('input', () => {
    document.getElementById('study-temp-value').textContent = Number(temperature.value).toFixed(1);
    renderStep();
  });
  topK.addEventListener('input', () => {
    document.getElementById('study-top-k-value').textContent = topK.value;
    renderStep();
  });
  topP.addEventListener('input', () => {
    document.getElementById('study-top-p-value').textContent = Number(topP.value).toFixed(1);
    renderStep();
  });
  renderBasicQuestion();
  log('Trilha de conceitos básicos: responda, confira a explicação e veja a relação com o jogo.');

  return () => {
    renderLiveGameState();
    if (studyFocus === 'checkpoints') renderGameLink();
  };
}

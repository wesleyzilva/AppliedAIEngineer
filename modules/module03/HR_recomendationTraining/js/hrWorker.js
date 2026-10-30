import * as tf from 'https://esm.sh/@tensorflow/tfjs@4.22.0';

console.log('[Worker] 🚀 HR Deep Learning Worker operacional no background.');

let _modeloTreinado = null;

// ============================================================================
// 1. O CATÁLOGO DE VAGAS-ALVO
// ============================================================================
// Cada vaga tem um vetor de 13 posições representando os requisitos ideais.
const CATALOGO_VAGAS = [
    {
        id: "vaga_tech_lead",
        sigla: "Tech Lead",
        titulo: "Tech Lead / Arquiteto Global",
        descricao: "Liderança de times remotos, arquitetura distribuída, inglês fluente e cloud.",
        vetor: [
            1.0, 0.66, 1.0, 1.0, 1.0,   // Hard Skills esperadas (Python, React, AWS, Docker, SQL)
            1.0, 1.0, 1.0, 1.0, 1.0,    // Soft Skills esperadas (100% em todas)
            1.0, 0.50, 0.66             // Inglês Fluente (1.0), 10 anos XP (0.50), Salário R$ 20k (0.66)
        ]
    },
    {
        id: "vaga_backend_pleno",
        sigla: "Dev Pleno",
        titulo: "Desenvolvedor Backend Pleno",
        descricao: "Construção de APIs REST, banco relacional e containers Docker.",
        vetor: [
            0.66, 0.0, 0.66, 0.66, 0.66, // Hard Skills
            0.33, 0.66, 0.66, 0.66, 0.33, // Soft Skills
            0.50, 0.20, 0.30              // Inglês Médio (0.50), 4 anos XP (0.20), Salário R$ 9k (0.30)
        ]
    },
    {
        id: "vaga_estagio_software",
        sigla: "Estágio",
        titulo: "Estágio em Engenharia de Software",
        descricao: "Apoio a testes e desenvolvimento acompanhado. Capacidade de aprender rápido.",
        vetor: [
            0.33, 0.0, 0.0, 0.0, 0.33,   // Hard Skills
            0.0, 0.33, 0.33, 0.33, 0.0,   // Soft Skills
            0.25, 0.05, 0.06              // Inglês Básico (0.25), 1 ano XP (0.05), Salário R$ 2k (0.06)
        ]
    }
];

// ============================================================================
// 2. FUNÇÃO DE VETORIZAÇÃO (FEATURE ENGINEERING)
// ============================================================================
const mapaNivel = { "Não possuo": 0.0, "Iniciante": 0.33, "Consegue Ensinar": 0.66, "Especialista": 1.0 };
const mapaIngles = { "Básico": 0.25, "Intermediário": 0.50, "Avançado": 0.75, "Fluente/Nativo": 1.0 };

function normalizarCandidato(c) {
    const hardSkills = [
        mapaNivel[c.Hard_Python] || 0,
        mapaNivel[c.Hard_React] || 0,
        mapaNivel[c.Hard_AWS] || 0,
        mapaNivel[c.Hard_Docker] || 0,
        mapaNivel[c.Hard_SQL] || 0
    ];

    const softSkills = [
        mapaNivel[c.Soft_Lideranca] || 0,
        mapaNivel[c.Soft_Comunicacao] || 0,
        mapaNivel[c.Soft_ResolucaoProb] || 0,
        mapaNivel[c.Soft_Autonomia] || 0,
        mapaNivel[c.Soft_Negociacao] || 0
    ];

    const ingles = mapaIngles[c.Ingles] || 0;
    const expNorm = Math.min((c.Anos_Experiencia || 0) / 20.0, 1.0);
    const salarioNorm = Math.min((c.Pretensao_Salarial_BRL || 0) / 30000.0, 1.0);

    // Retorna array de 13 posições normalizadas
    return [...hardSkills, ...softSkills, ingles, expNorm, salarioNorm];
}

// ============================================================================
// 3. INSPEÇÃO DETALHADA DAS CAMADAS DA REDE (DIDÁTICA NO CONSOLE)
// ============================================================================
function inspecionarTopologiaDaRede(model) {
    console.group("🧠 [ANATOMIA DA REDE NEURAL - MLOPS SUMMARY]");
    console.log(`Total de Camadas (Layers): ${model.layers.length}`);
    
    model.layers.forEach((layer, index) => {
        const config = layer.getConfig();
        const weights = layer.getWeights(); // Pesos (Kernel) e Vieses (Bias)
        
        const numWeights = weights[0] ? weights[0].shape : 'N/A';
        const numBiases = weights[1] ? weights[1].shape : 'N/A';

        console.log(
            `Camada ${index + 1}: Tipo: ${layer.name.toUpperCase()} | ` +
            `Neurônios: ${config.units} | ` +
            `Ativação: ${config.activation} | ` +
            `Matriz de Pesos: [${numWeights}] | Vieses: [${numBiases}]`
        );
    });

    console.log("Resumo Estrutural do TensorFlow:");
    model.summary();
    console.groupEnd();
}

// ============================================================================
// 4. TREINAMENTO SUPERVISIONADO
// ============================================================================
async function treinarRede(candidatos) {
    const paresEntrada = [];
    const alvosSupervisionados = [];

    // Monta os pares: Para cada candidato, gera a combinação com as 3 vagas
    candidatos.forEach(c => {
        const vetorCand = normalizarCandidato(c);
        const perfil = c.Perfil_Esperado_Oculto || "";

        CATALOGO_VAGAS.forEach(vaga => {
            // Concatenação: 13 features da vaga + 13 features do candidato = 26 features
            paresEntrada.push([...vaga.vetor, ...vetorCand]);

            // Definição da resposta correta (Ground Truth / Label)
            let targetScore = 0.05;
            if (vaga.id === "vaga_tech_lead") {
                if (perfil.includes("Tech Lead") || perfil.includes("Arquiteto")) targetScore = 0.95;
                else if (perfil.includes("Sênior")) targetScore = 0.70;
                else if (perfil.includes("Pleno")) targetScore = 0.30;
                else targetScore = 0.05;
            } else if (vaga.id === "vaga_backend_pleno") {
                if (perfil.includes("Pleno") || perfil.includes("Sênior")) targetScore = 0.90;
                else if (perfil.includes("Júnior")) targetScore = 0.50;
                else targetScore = 0.10;
            } else if (vaga.id === "vaga_estagio_software") {
                if (perfil.includes("Estagiário") || perfil.includes("Júnior")) targetScore = 0.95;
                else targetScore = 0.05;
            }

            alvosSupervisionados.push([targetScore]);
        });
    });

    postMessage({
        tipo: 'VETORIZACAO_CONCLUIDA',
        dados: { totalPares: paresEntrada.length }
    });

    const xs = tf.tensor2d(paresEntrada);
    const ys = tf.tensor2d(alvosSupervisionados);

    // Construção do Multi-Layer Perceptron (MLP)
    const model = tf.sequential();
    
    // Camada 1: Entrada (26 neurônios) conectada a 32 neurônios ocultos
    model.add(tf.layers.dense({ inputShape: [26], units: 32, activation: 'relu', name: 'camada_oculta_1' }));
    // Camada 2: 16 neurônios para compressão de atributos
    model.add(tf.layers.dense({ units: 16, activation: 'relu', name: 'camada_oculta_2' }));
    // Camada 3: 8 neurônios
    model.add(tf.layers.dense({ units: 8, activation: 'relu', name: 'camada_oculta_3' }));
    // Camada 4: Saída com 1 neurônio (Sigmoid para espremer a resposta entre 0.0 e 1.0)
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid', name: 'camada_saida_sigmoid' }));

    // Otimizador Adam com taxa de aprendizado estável
    model.compile({
        optimizer: tf.train.adam(0.005),
        loss: 'meanSquaredError'
    });

    // Inspeciona a topologia no console logo após a compilação
    inspecionarTopologiaDaRede(model);

    const totalEpocas = 150;

    // Treinamento (Ajuste iterativo de pesos)
    await model.fit(xs, ys, {
        epochs: totalEpocas,
        batchSize: 8,
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                if (epoch % 5 === 0) {
                    postMessage({
                        tipo: 'LOG_EPOCA',
                        dados: {
                            epoca: epoch,
                            totalEpocas: totalEpocas,
                            loss: logs.loss
                        }
                    });
                }
            }
        }
    });

    _modeloTreinado = model;

    // Descarte dos tensores de treino para liberar memória
    xs.dispose();
    ys.dispose();

    postMessage({ tipo: 'TREINO_FINALIZADO' });
}

// ============================================================================
// 5. INFERÊNCIA DINÂMICA (PREDICT)
// ============================================================================
function predizerAderencia(candidato) {
    if (!_modeloTreinado) return;

    const vetorCand = normalizarCandidato(candidato);
    
    // Cria os pares do candidato selecionado contra cada uma das vagas do catálogo
    const inputs = CATALOGO_VAGAS.map(vaga => [...vaga.vetor, ...vetorCand]);

    const tensorEntrada = tf.tensor2d(inputs);
    const predicoes = _modeloTreinado.predict(tensorEntrada);
    const scores = predicoes.dataSync();

    tensorEntrada.dispose();
    predicoes.dispose();

    // Mapeia os resultados com garantia numérica float
    const ranking = CATALOGO_VAGAS.map((vaga, idx) => {
        const scorePercentual = parseFloat((scores[idx] * 100).toFixed(1));
        return {
            sigla: vaga.sigla,
            titulo: vaga.titulo,
            descricao: vaga.descricao,
            score: scorePercentual
        };
    }).sort((a, b) => b.score - a.score);

    console.log(`[Inferência] Scores calculados para ${candidato.Nome_Ficticio}:`, ranking);

    postMessage({
        tipo: 'RESULTADO_INFERENCIA',
        dados: {
            nomeCandidato: candidato.Nome_Ficticio || 'Candidato Selecionado',
            ranking: ranking
        }
    });
}

// ============================================================================
// 6. ROTEADOR DE MENSAGENS
// ============================================================================
self.onmessage = (e) => {
    const { action, payload } = e.data;
    if (action === 'iniciarTreinamento') treinarRede(payload);
    if (action === 'executarInferência') predizerAderencia(payload);
};
// ============================================================================
// 1. GERENCIAMENTO DE ESTADO & UI DO LABORATÓRIO
// ============================================================================
let listaCandidatosCache = [];
const historicoLoss = [];

// Instanciação do Web Worker com Cache Busting para recarregar alterações imediatamente
const worker = new Worker(`/js/hrWorker.js?v=${Date.now()}`, { type: 'module' });

function registrarLog(msg) {
    const box = document.getElementById('boxTerminalLogs');
    if (box) {
        const time = new Date().toLocaleTimeString();
        box.innerHTML += `[${time}] ${msg}<br>`;
        box.scrollTop = box.scrollHeight;
    }
}

// Botão para exibir ou ocultar a gaveta gráfica lateral do tfjs-vis
document.getElementById('btnToggleVisor').addEventListener('click', () => {
    tfvis.visor().toggle();
});

// ============================================================================
// 2. PASSO 1: INGESTÃO DE DADOS (PAPAPARSE)
// ============================================================================
function dispararIngestao() {
    registrarLog("Iniciando requisição do arquivo 'discordCandidate.csv'...");
    document.getElementById('badge-step-1').className = 'badge bg-primary';
    document.getElementById('badge-step-1').innerText = 'Lendo CSV';

    // Abre a gaveta de métricas na lateral
    tfvis.visor().open();

    Papa.parse('/discordCandidate.csv', {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function (results) {
            listaCandidatosCache = results.data;
            
            document.getElementById('card-step-1').className = 'card card-step completed mb-3';
            document.getElementById('badge-step-1').className = 'badge bg-success';
            document.getElementById('badge-step-1').innerText = `${listaCandidatosCache.length} Linhas Ingeridas`;

            registrarLog(`CSV carregado com sucesso. Total de candidatos: ${listaCandidatosCache.length}`);
            console.log("[DataOps] Amostra do primeiro registro ingerido:", listaCandidatosCache[0]);

            // Avança para o Passo 2 e despacha o treinamento para o Worker
            document.getElementById('card-step-2').className = 'card card-step active mb-3';
            document.getElementById('badge-step-2').className = 'badge bg-primary';
            document.getElementById('badge-step-2').innerText = 'Vetorizando...';

            worker.postMessage({
                action: 'iniciarTreinamento',
                payload: listaCandidatosCache
            });
        },
        error: function (err) {
            registrarLog(`Falha de Ingestão: ${err}`);
            document.getElementById('badge-step-1').className = 'badge bg-danger';
            document.getElementById('badge-step-1').innerText = 'Erro 404/Leitura';
        }
    });
}

// ============================================================================
// 3. COMUNICAÇÃO DE MENSAGENS COM O WEB WORKER (MLOPS EM TEMPO REAL)
// ============================================================================
worker.onmessage = (e) => {
    const { tipo, dados } = e.data;

    // Notificação: Conclusão da Vetorização
    if (tipo === 'VETORIZACAO_CONCLUIDA') {
        document.getElementById('card-step-2').className = 'card card-step completed mb-3';
        document.getElementById('badge-step-2').className = 'badge bg-success';
        document.getElementById('badge-step-2').innerText = 'Tensores [26 Features]';

        document.getElementById('card-step-3').className = 'card card-step active mb-3';
        document.getElementById('badge-step-3').className = 'badge bg-warning text-dark';
        document.getElementById('badge-step-3').innerText = 'Descida do Gradiente';

        registrarLog(`Tensores prontos. ${dados.totalPares} pares de treino (Candidato x Vaga) criados.`);
        console.log(`[MLOps] Matriz de entrada criada com dimensão: [${dados.totalPares}, 26]`);
    }

    // Notificação: Época de Treino Concluída
    if (tipo === 'LOG_EPOCA') {
        const percentual = Math.round((dados.epoca / dados.totalEpocas) * 100);
        const bar = document.getElementById('progressBarTreino');
        bar.style.width = `${percentual}%`;
        bar.innerText = `Época ${dados.epoca}/${dados.totalEpocas} (Loss: ${dados.loss.toFixed(4)})`;

        registrarLog(`Treino | Época ${dados.epoca}/${dados.totalEpocas} - Erro Médio (Loss): ${dados.loss.toFixed(4)}`);

        // Renderiza o gráfico contínuo da Curva de Perda no tfjs-vis
        historicoLoss.push({ x: dados.epoca, y: dados.loss });
        tfvis.render.linechart(
            { name: 'Evolução da Função de Custo (Loss)', tab: 'Métricas de Treino' },
            { values: historicoLoss, series: ['Erro Quadrático Médio (MSE)'] },
            { xLabel: 'Épocas', yLabel: 'Loss', height: 240 }
        );
    }

    // Notificação: Treinamento Concluído com Sucesso
    if (tipo === 'TREINO_FINALIZADO') {
        document.getElementById('card-step-3').className = 'card card-step completed mb-3';
        document.getElementById('badge-step-3').className = 'badge bg-success';
        document.getElementById('badge-step-3').innerText = 'Convergência Atingida';

        const bar = document.getElementById('progressBarTreino');
        bar.style.width = '100%';
        bar.className = 'progress-bar bg-success';
        bar.innerText = 'Treinamento 100% Concluído';

        document.getElementById('card-step-4').className = 'card card-step active mb-3';
        document.getElementById('badge-step-4').className = 'badge bg-success';
        document.getElementById('badge-step-4').innerText = 'Pronto para Teste';

        registrarLog("✅ Treinamento finalizado. A rede neural calibrou os pesos sinápticos.");
        habilitarSelecaoDePerfis();

        // Faz uma inferência inicial com a Sofia (índice 7, ID 8) para preencher a tela
        document.getElementById('selectCandidato').value = 7;
        document.getElementById('selectCandidato').dispatchEvent(new Event('change'));
        document.getElementById('btnValidarPerfil').click();
    }

    // Notificação: Resultado da Inferência Recebido
    if (tipo === 'RESULTADO_INFERENCIA') {
        renderizarResultadoInferencial(dados);
    }
};

// ============================================================================
// 4. PASSO 4: VALIDAÇÃO INTERATIVA & RENDERIZAÇÃO
// ============================================================================
function habilitarSelecaoDePerfis() {
    const select = document.getElementById('selectCandidato');
    select.innerHTML = '<option value="">-- Escolha um amigo/candidato da lista --</option>';

    listaCandidatosCache.forEach((cand, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        option.innerText = `#${cand.ID} - ${cand.Nome_Ficticio} (XP: ${cand.Anos_Experiencia} anos | Salário: R$ ${cand.Pretensao_Salarial_BRL})`;
        select.appendChild(option);
    });

    select.disabled = false;
}

// Disparado ao selecionar um candidato no menu suspenso
document.getElementById('selectCandidato').addEventListener('change', (e) => {
    const idx = e.target.value;
    const btn = document.getElementById('btnValidarPerfil');
    const boxDetalhes = document.getElementById('boxDetalhesCandidato');

    if (idx === "") {
        btn.disabled = true;
        boxDetalhes.classList.add('d-none');
        return;
    }

    const c = listaCandidatosCache[idx];
    boxDetalhes.innerHTML = `
        <strong>Perfil Técnico:</strong> Python: ${c.Hard_Python} | React: ${c.Hard_React} | AWS: ${c.Hard_AWS} | Docker: ${c.Hard_Docker} | SQL: ${c.Hard_SQL}<br>
        <strong>Competências Soft:</strong> Liderança: ${c.Soft_Lideranca} | Comunicação: ${c.Soft_Comunicacao} | Resolução: ${c.Soft_ResolucaoProb}<br>
        <strong>Idiomas & Carreira:</strong> Inglês: ${c.Ingles} | Anos de XP: ${c.Anos_Experiencia}a | Pretensão: R$ ${c.Pretensao_Salarial_BRL}
    `;
    boxDetalhes.classList.remove('d-none');
    btn.disabled = false;
});

// Disparado ao clicar no botão "Validar Perfil"
document.getElementById('btnValidarPerfil').addEventListener('click', () => {
    const idx = document.getElementById('selectCandidato').value;
    const candidato = listaCandidatosCache[idx];

    registrarLog(`Submetendo '${candidato.Nome_Ficticio}' à inferência de rede neural...`);
    
    worker.postMessage({
        action: 'executarInferência',
        payload: candidato
    });
});

// Renderização visual dos resultados (com barras progressivas sem zerar)
function renderizarResultadoInferencial(dados) {
    const container = document.getElementById('boxResultadosInferencial');
    let html = `<h6 class="fw-bold mb-3">Relatório de Aderência para: <span class="text-primary">${dados.nomeCandidato}</span></h6>`;

    const dadosGraficoBarras = [];

    dados.ranking.forEach(item => {
        const score = item.score; // número float entre 0.0 e 100.0
        
        let corClasse = 'bg-danger';
        let textoAderencia = 'Baixa Compatibilidade';
        if (score >= 65) {
            corClasse = 'bg-success';
            textoAderencia = 'Forte Aderência';
        } else if (score >= 35) {
            corClasse = 'bg-warning text-dark';
            textoAderencia = 'Aderência Parcial';
        }

        html += `
            <div class="mb-3 p-2 bg-light border rounded">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="fw-bold">${item.titulo}</span>
                    <span class="badge ${corClasse}">${score.toFixed(1)}% (${textoAderencia})</span>
                </div>
                <small class="text-muted d-block mb-1">${item.descricao}</small>
                <div class="progress" style="height: 16px;">
                    <div class="progress-bar ${corClasse}" style="width: ${Math.max(score, 3)}%;">
                        ${score.toFixed(1)}%
                    </div>
                </div>
            </div>
        `;

        dadosGraficoBarras.push({
            index: item.sigla,
            value: score
        });
    });

    container.innerHTML = html;

    // Renderiza o gráfico de barras no tfjs-vis com eixo travado em 100%
    tfvis.render.barchart(
        { name: 'Comparativo de Match por Vaga (%)', tab: 'Inferência' },
        dadosGraficoBarras,
        {
            xLabel: 'Vaga',
            yLabel: 'Compatibilidade (%)',
            height: 240,
            yAxisDomain: [0, 100] // Impede que o gráfico zere ou mude a escala arbitrariamente
        }
    );

    registrarLog(`Inferência concluída para '${dados.nomeCandidato}'. Resultados exibidos.`);
}

// Inicia o laboratório
dispararIngestao();
# IA local pessoal

## Objetivo

Construir, de forma incremental, uma IA local que apoie seu desenvolvimento como TPM,
fullstack e profissional de IA em pós-graduação. Na fase atual, o projeto, os documentos
e o índice ficam em `modules/module09`, enquanto Ollama e os modelos são instalados
normalmente no notebook Windows. A cópia para pendrive será uma etapa futura.

Esta primeira versão é uma base funcional de **modelo local + RAG**. Ainda não treina
nem ajusta pesos de modelos: recupera trechos dos seus documentos e os fornece ao modelo
local para responder com contexto e fontes.

Para acompanhar o projeto e executar a montagem manualmente, abra o [C1 English Module 09 guide and TPM tracker](./manual-ia-local.html).
Ele funciona localmente, inclui comandos copiáveis, milestones e um checklist salvo neste navegador.

## Fase atual: uso local no Windows

Nesta primeira fase, o Ollama é instalado normalmente no Windows e guarda os modelos
no diretório padrão do usuário. O projeto, os documentos e o índice SQLite ficam em
`modules/module09`. Não é necessário provisionar executáveis dentro de `portable/` nem
copiar modelos para o pendrive. A portabilidade será tratada como uma fase posterior.

## Portabilidade (fase futura)

**Não siga esta seção para a configuração local atual.** Ela registra a arquitetura
pretendida para uma futura versão no pendrive.

Os caminhos de documentos, índice e modelos são relativos à raiz do módulo, tanto no
workspace de preparação quanto no pendrive.
Os inicializadores definem essa pasta como workspace, iniciam o Ollama incluído no pacote
e o encerram quando a consulta termina. O serviço escuta apenas em `127.0.0.1`; o inicializador
para se a porta `11434` já estiver ocupada, em vez de usar ou encerrar outro serviço.

Como o pendrive será usado em Windows e Linux, os runtimes e os stores de modelos são
separados por sistema operacional:

| Componente | Windows | Linux |
|---|---|---|
| Inicializador | `portable/windows/Run-LocalAI.ps1` | `portable/linux/run-local-ai.sh` |
| Python portátil | `portable/runtime/windows/python/python.exe` | `portable/runtime/linux/bin/python3` |
| Ollama | `portable/runtime/windows/ollama/ollama.exe` | `portable/runtime/linux/ollama/ollama` |
| Modelos Ollama | `portable/models/windows/ollama/` | `portable/models/linux/ollama/` |

Os binários e pesos de modelo não são incluídos no repositório: são grandes e específicos
da plataforma. Portanto, **os inicializadores já estão preparados, mas o pacote só fica
autônomo depois que você colocar esses componentes nos caminhos acima**. Python usa apenas
a biblioteca padrão em runtime. Escolha runtimes compatíveis com a arquitetura e o sistema
de cada computador; Linux também pode depender de bibliotecas do sistema. O computador
faz a inferência (CPU/GPU conforme suporte do runtime e hardware disponível); o pendrive
armazena programa, modelos e dados.

Em Linux, o computador também precisa ter Bash e permitir executar binários a partir do
local de montagem do pendrive. Se a unidade estiver montada com `noexec`, mova o pacote
para um local executável ou ajuste a montagem conforme a política do computador.

## Perfil do notebook atual

Hardware informado pelo Windows:

| Componente | Detalhe | Implicação para a IA local |
|---|---|---|
| Computador | Dell Inspiron 3583 | Execução local no próprio notebook |
| Memória RAM | 17.034.338.304 bytes (aprox. 15,9 GiB) | Suficiente para começar com um modelo quantizado pequeno, mantendo memória para Windows e outros aplicativos |
| Processador | Intel Core i5-8265U @ 1,60 GHz, 4 núcleos e 8 processadores lógicos | Base de CPU para testar um modelo pequeno quantizado; medir latência real antes de definir expectativas |
| Vídeo | Intel UHD Graphics 620 integrada | Os 1 GiB informados pelo Windows não devem ser tratados como 1 GiB de VRAM dedicada; planeje a inferência para CPU |

Para recapturar os dados do processador no PowerShell:

```powershell
Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors
```

### Configuração inicial recomendada

- Use `qwen3.5:4b` como modelo de conversa inicial e `nomic-embed-text` para embeddings.
  A variante `Q4_K_M` do modelo de chat ocupa cerca de 3,3 GB no store do Ollama. Com
  15,9 GiB de RAM, é um ponto inicial razoável para inferência em CPU; a velocidade
  depende do processador e do contexto. Não comece com modelos de 7B/14B nem com
  fine-tuning neste notebook.
- Considere a Intel UHD 620 como recurso gráfico para a tela, não como acelerador de IA
  garantido. O aplicativo deve continuar utilizável em CPU. Durante um teste, `ollama ps`
  ajuda a conferir como o modelo foi carregado; o Gerenciador de Tarefas mostra o consumo
  total de RAM do sistema.
- Para a fase portátil futura, prefira um pendrive USB 3.x rápido, com pelo menos 32 GB para um pacote Windows
  enxuto. Se mantiver runtimes e cópias dos modelos para Windows e Linux no mesmo
  dispositivo, prefira 64 GB ou mais; mantenha espaço adicional para documentos, índice
  SQLite, logs e atualizações. O modelo copiado por plataforma ocupa espaço em cada store.
- Use o notebook conectado à energia em ingestões e sessões longas. Feche aplicativos
  pesados se a memória ficar pressionada; não desative o arquivo de paginação do Windows.

### Validar desempenho local

Depois de instalar Ollama e baixar os modelos, consulte os metadados do modelo:

```powershell
ollama show qwen3.5:4b
ollama list
```

O Ollama instalado no Windows inicia o serviço em segundo plano; não rode outro
`ollama serve` se o serviço já estiver respondendo. Use `ollama ps` para inspecionar o
modelo carregado. Faça perguntas representativas, observe o tempo de resposta e a memória
no Gerenciador de Tarefas. Use os resultados para avaliar o modelo; não presuma que a
GPU integrada está acelerando a inferência.

## O que significa "treinar minha IA"

- **Adicionar conhecimento próprio:** organize seus documentos em `data/docs/` e use RAG.
  Isso é o primeiro passo e permite atualizar o conhecimento sem retreinar o modelo.
- **Personalizar comportamento:** reúna exemplos de respostas que você revisou e,
  depois de medir a qualidade do RAG e dos prompts, avalie fine-tuning com LoRA.
- **Pré-treinar um modelo do zero:** não é necessário para esse objetivo; exige grandes
  quantidades de dados e recursos de computação.

O fine-tuning não substitui RAG: use RAG para fatos e materiais que mudam; considere
fine-tuning para formato, estilo e padrões de resposta. A etapa de fine-tuning ainda
precisa ser implementada neste projeto.

## Stack inicial

- Ollama para executar um modelo aberto localmente.
- SQLite e embeddings para indexar e recuperar documentos.
- Python padrão no runtime; `pytest` para testes.
- Documentos de exemplo em `data/docs/`; substitua-os ou acrescente seus materiais.

O modelo de chat e o modelo de embeddings podem ser configurados por `TPM_CHAT_MODEL`
e `TPM_EMBED_MODEL`; `TPM_WORKSPACE` e `TPM_OLLAMA_URL` também podem ser usados para
configuração. Sem Ollama, a busca local continua disponível, mas não há geração real pelo
LLM: a resposta informa que o serviço está indisponível.

Embora `qwen3.5:4b` também aceite entradas multimodais no Ollama, esta versão do assistente
envia apenas texto ao endpoint de geração. A leitura de imagens ainda não está implementada.

## Começar: uso local no Windows

### 1. Instalar o Ollama

Para a fase local, use o instalador normal do Windows em um PowerShell:

```powershell
irm https://ollama.com/install.ps1 | iex
```

Isso instala Ollama no computador, não dentro do repositório nem no pendrive. Depois da
instalação, abra uma nova janela do PowerShell e verifique a CLI e o serviço local:

```powershell
$ollama = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
if (-not (Test-Path $ollama)) { throw "Executável Ollama não encontrado: $ollama" }
& $ollama --version
Invoke-RestMethod http://localhost:11434/api/tags
```

O Ollama para Windows normalmente executa em segundo plano. Se a API não responder,
abra Ollama pelo menu Iniciar e tente novamente. Não inicie um segundo `ollama serve`
quando o serviço instalado já estiver ativo.

Se `ollama` não for reconhecido como comando, mas o executável existir, use o caminho
completo em `$ollama`, como acima. Opcionalmente, adicione a pasta à sessão atual:

```powershell
$env:Path = "$env:LOCALAPPDATA\Programs\Ollama;$env:Path"
ollama --version
```

O comando deve concluir a instalação, não apenas baixar o arquivo. Se ele voltar ao
prompt logo após mostrar `Downloading Ollama for Windows... 100%`, verifique se o
instalador foi baixado:

```powershell
$setup = Join-Path $env:TEMP "OllamaSetup.exe"
Test-Path $setup
```

Se retornar `True`, abra as propriedades do arquivo, confira a aba **Digital Signatures**
e continue somente se a assinatura estiver válida e pertencer ao Ollama. Então inicie o
instalador e aguarde sua conclusão:

```powershell
Start-Process -FilePath $setup -Wait
```

Abra Ollama pelo menu Iniciar, inicie uma nova janela do PowerShell e repita
`ollama --version` e `Invoke-RestMethod http://localhost:11434/api/tags`.

### 2. Baixar e testar os modelos locais

Os modelos ficam no diretório padrão do usuário gerenciado pelo Ollama. Com internet,
baixe os modelos:

```powershell
$ollama = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
& $ollama pull qwen3.5:4b
& $ollama pull nomic-embed-text
& $ollama list
& $ollama run qwen3.5:4b "Reply with: local chat model is working."
```

`ollama list` deve mostrar as duas tags. O último comando deve imprimir uma resposta
gerada pelo modelo local. Teste também o modelo de embeddings via API:

```powershell
$body = @{ model = "nomic-embed-text"; input = "Local embedding smoke test" } | ConvertTo-Json
$embedding = Invoke-RestMethod -Uri "http://localhost:11434/api/embed" -Method Post -ContentType "application/json" -Body $body
if (-not $embedding.embeddings -or $embedding.embeddings.Count -eq 0) { throw "Embedding test failed." }
"Embedding dimensions: $($embedding.embeddings[0].Count)"
```

O teste deve informar uma dimensão maior que zero.

### 3. Fazer perguntas ao assistente com seus documentos

Use a `.venv` do repositório e instale o pacote Module 09 em modo editável uma vez.
Em cada nova janela do PowerShell, ative a mesma `.venv` antes de executar os comandos:

```powershell
Set-Location "E:\wesleyzilva\repo\AppliedAIEngineer"
.\.venv\Scripts\Activate.ps1
Set-Location .\modules\module09
python --version
python -m pip install -e .
python -m tpm_ai.cli ingest
python -m tpm_ai.cli ask "Quais são meus objetivos de aprendizagem?"
python -m tpm_ai.cli agent "Explique meus objetivos de aprendizagem usando meus arquivos."
```

O comando de instalação pode ser repetido sem problema e registra o pacote no ambiente
Python ativo. Depois da primeira instalação, não é necessário definir `PYTHONPATH`.
Se a ativação for bloqueada pela política do PowerShell, permita scripts somente para
a janela atual com `Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned`.

Resultados esperados:

- `ingest`: JSON com `"status": "ok"` e `"ingested_chunks"` maior que zero.
- `ask`: `results` com trechos relevantes e o caminho `perfil-e-objetivos.md`.
- `agent`: campos `answer` e `sources`; confira a resposta contra o documento de origem.

Para perguntar ao modelo usando seus arquivos, use o comando `agent` e escreva a
pergunta entre aspas:

```powershell
python -m tpm_ai.cli agent "Com base nos meus arquivos, liste as informações confirmadas para meu perfil profissional e o que ainda preciso preencher."
```

`ask` apenas mostra trechos encontrados; `agent` pede ao Qwen uma resposta baseada
nesses trechos. Já `ollama run qwen3.5:4b` abre uma conversa direta com o modelo, mas
essa conversa não consulta os documentos indexados pelo projeto.

Para restringir o contexto a um arquivo específico, use `--source`. Repita a opção
para selecionar mais de um arquivo:

```powershell
python -m tpm_ai.cli agent "Refine meu resumo profissional usando apenas meu perfil." --source docs\perfil-profissional.md
python -m tpm_ai.cli agent "Relacione meu perfil aos meus objetivos." --source docs\perfil-profissional.md --source docs\perfil-e-objetivos.md
python -m tpm_ai.cli ask "Quais experiências estão documentadas?" --source docs\perfil-profissional.md
```

No chat HTML, marque os arquivos em **Documents for context**. Sem arquivos marcados,
a busca usa todos os documentos indexados. A lista inclui arquivos já ingeridos; ao
adicionar ou editar documentos Markdown, texto ou CSV em `data/docs/`, execute
`python -m tpm_ai.cli ingest` para atualizar o índice antes de usá-los. A resposta
mostra as fontes efetivamente recuperadas.

O índice SQLite é criado em `data/local_ai_index.sqlite3`. Adicione arquivos `.md`,
`.txt` ou `.csv` autorizados em `data/docs/` e rode `ingest` novamente. O Ollama e os
modelos permanecem no computador nesta fase; o projeto e os dados ficam na pasta do módulo.
A primeira resposta pode demorar enquanto Qwen carrega na memória, especialmente em CPU.
O cliente usa `temperature=0.2`, `num_predict=128` e `think=false` por padrão. O índice
existente é reutilizado entre perguntas; rode `ingest` novamente depois de adicionar ou
editar documentos. O limite de tokens reduz tamanho e geralmente a latência, mas pode
truncar respostas longas; ele não substitui a conferência das fontes. O CLI também lida
com caracteres fora da codificação atual do console Windows.

Se `agent` exceder o tempo limite, tente reduzir o contexto para uma fonte:

```powershell
python -m tpm_ai.cli agent "Sua pergunta aqui" --top-k 1
```

### Experimentar opções de geração

`--top-k` controla a quantidade de trechos recuperados no RAG. Para mudar o `top_k`
de amostragem do Ollama, passe-o dentro de `--options-json`. O objeto JSON pode
sobrescrever os padrões e incluir qualquer opção de geração aceita pela combinação
instalada de Ollama, modelo e backend:

```powershell
$env:TPM_GENERATION_OPTIONS = (@{ temperature = 0.7; num_predict = 192; top_p = 0.9; seed = 42 } | ConvertTo-Json -Compress)
python -m tpm_ai.cli agent "Explique meus objetivos." --top-k 2 --model qwen3.5:4b
$env:TPM_GENERATION_OPTIONS = (@{ temperature = 0.2; num_predict = 192; num_ctx = 4096 } | ConvertTo-Json -Compress)
python -m tpm_ai.cli agent "Explique meus objetivos." --top-k 2 --model qwen3.5:4b
$env:TPM_GENERATION_OPTIONS = $null
python -m tpm_ai.cli agent "Explique meus objetivos." --top-k 2 --think low --model qwen3.5:4b
```

Altere uma variável por vez e compare qualidade factual, fontes, latência e memória.
No PowerShell, `TPM_GENERATION_OPTIONS` evita que o parser de argumentos nativos remova
as aspas internas de um JSON passado diretamente na linha de comando. Em outros shells,
também é possível usar `--options-json '{"temperature": 0.7}'`.
O catálogo comentado de parâmetros está no [manual HTML](./manual-ia-local.html#parameters).
Consulte também a referência oficial do
[Modelfile](https://docs.ollama.com/modelfile) e da
[API Generate](https://docs.ollama.com/api/generate). Parâmetros disponíveis e seus
efeitos variam por versão, modelo e runner; uma opção documentada pode não funcionar
na instalação local antiga.

### Logs para medir as chamadas

Cada chamada local de embeddings ou geração é acrescentada em
`data/logs/ollama-calls.jsonl` (um objeto JSON por linha). O log registra modelo,
operação, status, duração de parede em milissegundos, contagem de caracteres de entrada,
opções e as métricas reportadas pelo Ollama, como tokens de entrada/saída e durações de
carga, avaliação do prompt e geração. Não registra o texto dos prompts, documentos ou
respostas. O diretório de log é ignorado pelo Git.

Para inspecionar no PowerShell:

```powershell
Get-Content .\data\logs\ollama-calls.jsonl -Tail 10
```

Para mudar o caminho do arquivo antes de iniciar o CLI:

```powershell
$env:TPM_LOG_PATH = "E:\logs\module09-ollama.jsonl"
```

No painel HTML, as chamadas aparecem automaticamente pelo serviço local, sem escolher
arquivo de log. O painel atualiza a cada cinco segundos e depois de cada resposta do chat.
Para abrir o chat integrado, instale o pacote em modo editável na `.venv` uma vez e
execute o servidor:

```powershell
Set-Location "E:\wesleyzilva\repo\AppliedAIEngineer\modules\module09"
python -m pip install -e .
python -m tpm_ai.cli web --port 8766
```

Acesse `http://127.0.0.1:8766/`; o servidor escuta apenas no computador local. A
instalação editável registra `src/tpm_ai` na `.venv`, então não é preciso configurar
`PYTHONPATH` em cada terminal.

O Ollama informa várias durações em nanossegundos. Uma estimativa de velocidade de
geração é `eval_count / (eval_duration / 1_000_000_000)` tokens por segundo. A duração
de parede inclui a verificação de disponibilidade e a chamada HTTP. O arquivo mantém
milissegundos e dados brutos; a análise por `logs` e no HTML exibe cada duração em
milissegundos, segundos e minutos. Compare várias perguntas fixas: uma única execução
pode incluir carga inicial do modelo.

Analise as chamadas diretamente no PowerShell:

```powershell
python -m tpm_ai.cli logs --tail 10 --operation generate
python -m tpm_ai.cli logs --tail 20 --operation all
```

Cada chamada mostra os parâmetros e suas durações de parede, carga do modelo, avaliação
do prompt e geração. O resumo exibe média e mediana de tempo total das gerações.

Para experimentar parâmetros pelo CLI, defina `TPM_GENERATION_OPTIONS` no PowerShell
com `ConvertTo-Json` (isso preserva as aspas JSON ao chamar Python):

```powershell
Set-Location "E:\wesleyzilva\repo\AppliedAIEngineer\modules\module09"
$env:TPM_GENERATION_OPTIONS = (@{ temperature = 0.2; num_predict = 128; seed = 7 } | ConvertTo-Json -Compress)
python -m tpm_ai.cli agent "Como posso organizar meu portfólio profissional?" --top-k 2
$env:TPM_GENERATION_OPTIONS = (@{ temperature = 0.7; num_predict = 128; seed = 7 } | ConvertTo-Json -Compress)
python -m tpm_ai.cli agent "Como posso organizar meu portfólio profissional?" --top-k 2
Remove-Item Env:TPM_GENERATION_OPTIONS
python -m tpm_ai.cli logs --tail 10 --operation generate
```

Execute os comandos na pasta `module09`, em uma janela PowerShell separada do servidor
web. O HTML atualiza automaticamente mesmo quando as chamadas são executadas pelo CLI.

Confirme também que o modelo responde diretamente, sem RAG:

```powershell
$ollama = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
& $ollama run qwen3.5:4b "Responda apenas: ok"
```

### 4. Rodar os testes automatizados

Com um Python de desenvolvimento e `pytest` disponível:

```powershell
Set-Location "E:\wesleyzilva\repo\AppliedAIEngineer\modules\module09"
python -m pytest -q
```

O resultado esperado é `15 passed`. Estes testes não precisam do Ollama nem dos modelos.
Se `pytest` não estiver instalado nesse ambiente de desenvolvimento, execute
`python -m pip install pytest` e rode a suíte novamente.

### Depois: preparar a versão portátil

Somente depois de aceitar o fluxo local, planejaremos o empacotamento dos runtimes e
modelos para o USB, com caminhos de armazenamento separados do Ollama instalado no Windows.
Os scripts em `portable/` são destinados a essa fase futura; não são necessários para os
comandos locais acima. Antes de indexar documentos corporativos, pessoais ou acadêmicos
restritos, confirme as políticas aplicáveis.

## Próximas etapas

1. **Perfil e portfólio:** complete `data/docs/perfil-profissional.md` com experiências,
   competências e projetos verificáveis; depois rode a ingestão e peça ao agente para
   revisar o perfil sem inventar informações.
2. **RAG pessoal:** reunir materiais selecionados de TPM, fullstack e IA; criar perguntas
   de avaliação com respostas esperadas; medir se as respostas usam as fontes certas.
3. **Qualidade e segurança:** testar citações, perguntas sem resposta, erros factuais e
   proteção de informações sensíveis. Evitar que ausência de evidência vire fato inventado.
4. **Ferramentas controladas:** adicionar integrações úteis aos seus fluxos, começando por
   leitura; exigir aprovação para qualquer ação que altere dados.
5. **Dataset curado:** guardar exemplos revisados e anonimizados em formato versionável;
   deduplicar, separar treino/validação/teste e inspecionar os dados antes de treinar.
5. **Fine-tuning opcional:** comparar modelo base e ajustado no mesmo conjunto de avaliação.
   Escolher o ambiente de treino conforme o hardware e a política dos dados; não presumir
   que serviços externos ou Colab são apropriados para dados privados.
6. **Operação local:** registrar execuções sem armazenar conteúdo sensível por padrão,
   revisar mudanças de modelo e manter o RAG como fonte atualizável de conhecimento.

## Estrutura

- `src/tpm_ai/llm.py`: cliente do Ollama e embeddings.
- `src/tpm_ai/rag.py`: ingestão, divisão em trechos, indexação e busca.
- `src/tpm_ai/agent.py`: montagem do contexto e resposta com fontes.
- `src/tpm_ai/cli.py`: comandos de linha de comando.
- `data/docs/`: materiais pessoais selecionados e editáveis.
- `tests/`: testes sem necessidade de executar um modelo Ollama.

Os exemplos são dados de demonstração, não representam projetos, métricas ou experiências
reais do usuário. O diretório `data/docs/` é o ponto inicial, não um dataset de treino.

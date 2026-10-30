# 🚀 MASTER PROMPT & BLUEPRINT: APPLIED AI ENGINEER & AGENTIC TPM

> **Instrução de Uso:** Copie todo o conteúdo deste arquivo (ou salve-o na raiz do seu repositório `https://github.com/wesleyzilva/AppliedAIEngineer.git` como `CLAUDE.md` / `.cursorrules` / `PROMPT_MESTRE.md`) e envie para a sua IA assistente no Cursor, Claude ou VS Code com o comando:
> *"Leia este documento mestre e execute o Passo 1 (Scaffolding completo do Monorepo, scripts de inicialização e arquivos base)."*
 
---

## 🤖 1. SYSTEM PROMPT PARA O AGENTE DE IA (CURSOR / CLAUDE / COPILOT)

Você está atuando como **Staff AI Architect, Principal Full-Stack Engineer e Co-Pilot de um Agentic Technical Product/Program Manager (TPM)**. 

### Perfil do Usuário e Contexto Acadêmico/Profissional
* **Nome:** Wesley Gomes da Silva
* **Repositório Central:** `https://github.com/wesleyzilva/AppliedAIEngineer.git`
* **Formação Atual:** Pós-Graduação Lato Sensu em **Engenharia de Software em IA Aplicada** (Centro Universitário Anhanguera / UNIPDS Educação | RA: `14108700` | Período: `28/10/2026` a `27/10/2027`).
* **Objetivo Duplo:**
  1. **Construir Aplicações Próprias & MicroSaaS AI-First:** Transformar cada disciplina da Pós em módulos de software prontos para produção, alimentando produtos reais (ex: plataformas de serviços, automações via n8n/WhatsApp, sistemas RAG e servidores MCP).
  2. **Consolidar o Papel de Agentic TPM:** Criar um framework prático e ferramental técnico (*Agentic TPM Toolkit*) que automatiza descoberta de produto, refinamento de backlog, priorização quantitativa (RICE, WSJF), simulações preditivas (Monte Carlo), governança (LGPD/GDPR/MITRE ATLAS) e FinOps de IA.
  3. **Maximizar o Ecossistema Estudantil (Zero-Cost / High-Leverage):** Priorizar arquiteturas, SDKs, nuvens, APIs e serviços que aproveitem 100% os créditos, licenças e benefícios de estudante universitário.

---

## 🏗️ 2. TAREFA IMEDIATA PARA A IA: SCAFFOLDING DO MONOREPO

Ao receber este arquivo, você (IA) deve criar imediatamente a seguinte estrutura de diretórios e arquivos base no repositório local antes de qualquer outra coisa:

```text
AppliedAIEngineer/
├── .github/
│   └── workflows/
│       └── ai-ci-cd.yml                # Pipeline base de lint, testes e auditoria de segurança/custos
├── .cursorrules                        # Regras persistentes de engenharia e contexto Agentic TPM
├── CLAUDE.md                           # Memória rápida de comandos, arquitetura e convenções do projeto
├── docs/
│   ├── 00-student-perks-tracker.md     # Checklist vivo de todos os benefícios de estudante (Tech + Lifestyle)
│   ├── 01-syllabus-roadmap.md          # Cronograma oficial das 15 disciplinas (Out/2026 - Out/2027)
│   ├── architecture-decisions/         # ADRs (Architecture Decision Records)
│   └── governance-lgpd-atlas/          # Políticas de LGPD, GDPR, AI Act e mitigação MITRE ATLAS
├── packages/
│   └── shared-llm-gateway/             # SDK unificado (OpenAI, Gemini, Claude, HuggingFace) com fallback e FinOps
├── modules/                            # Laboratórios práticos conectados às disciplinas da Pós
│   ├── 01-llm-foundations/             # (Início: 29/10/2026) Tensores, Embeddings, Attention e Vector DBs (JS/Python)
│   ├── 02-generative-apis-prompts/     # (Início: 22/11/2026) Prompt Chaining, OCR, Áudio/Vídeo e Multimodalidade
│   ├── 03-mcp-servers/                 # (Início: 16/12/2026) Servidores Model Context Protocol em TS/JS + Auth/WAF
│   ├── 04-autonomous-agents/           # (Início: 09/01/2027) ReAct, Plan-and-Execute, Tree of Thoughts e LangGraph
│   ├── 05-ai-ux-ui/                    # (Início: 03/02/2027) Prototipação assistida, Design Systems e testes heurísticos
│   ├── 06-ai-devops-aiops/             # (Início: 27/02/2027) IaC, AIOps, Observabilidade (NL->PromQL) e Auto-remediação
│   ├── 07-agentic-tpm-pm/              # (Início: 23/03/2027) RICE, WSJF, Monte Carlo e automação Jira/Trello/Notion
│   ├── 08-ai-system-architecture/      # (Início: 17/04/2027) Arquitetura AI-First, RAG avançado, Model Tiering e Caching
│   ├── 09-data-finetuning-lora/        # (Início: 11/05/2027) Engenharia de dados JSONL, LoRA, PEFT e Testes A/B
│   ├── 10-ai-security-governance/      # (Início: 04/06/2027) Defesas contra Prompt Injection, Data Poisoning e Vieses
│   ├── 11-career-system-design/        # (Início: 23/07/2027) Cases de System Design em IA, Live Coding e Storytelling
│   └── 12-industry40-foresight-innov/  # (Ago-Out/2027) IoT, Método Delphi, Business Cube e Maturidade de Inovação
├── agentic-tpm-toolkit/                # Framework proprietário para Gestão Técnica de Produtos com Agentes
│   ├── epic-to-stories-agent/          # Transforma PRDs/Épicos em User Stories, Gherkin BDD e tarefas técnicas
│   ├── predictive-monte-carlo/         # Motor estatístico de previsão de entregas, riscos e orçamento
│   ├── mcp-agile-bridge/               # Servidor MCP conectando GitHub + Jira + Notion + Slack/WhatsApp
│   └── finops-token-calculator/        # Simulador de ROI, custo por token, latência e model routing
├── capstone-microsaas/                 # (Início oficial: 29/06/2027 - Construção contínua desde o Dia 1)
│   ├── apps/
│   │   ├── web-frontend/
│   │   └── api-backend/
│   ├── agents-orchestrator/
│   └── docker-compose.yml
├── .env.example                        # Template seguro de variáveis de ambiente para todas as APIs estudantis
├── package.json                        # Configuração de Workspaces (Node.js / TypeScript)
├── pyproject.toml                      # Configuração de ambiente Python (Poetry / uv) para ML & Fine-Tuning
└── README.md                           # Vitrine executiva e técnica do repositório
```

---

## 🎓 3. CHECKLIST COMPLETO DE BENEFÍCIOS DE ESTUDANTE (DO SPOTIFY AO CLOUD)

A IA deve manter o arquivo `docs/00-student-perks-tracker.md` atualizado e sempre sugerir o uso dessas ferramentas gratuitas/descontadas antes de propor soluções pagas.

### Dados Oficiais para Verificação (SheerID / UNiDAYS / Student Beans / GitHub)
* **Nome:** Wesley Gomes da Silva
* **Data de Nascimento:** `18/01/1984`
* **Instituição:** `Centro Universitário Anhanguera` (ou `Universidade Anhanguera - UNIDERP` / `Cogna Educação`)
* **RA / Matrícula:** `14108700`
* **Curso:** Pós-Graduação em Engenharia de Software em IA Aplicada
* **Validade da Carteirinha:** `27/10/2027`
* **Documentos de Comprovação:** Cartão de Identificação Estudantil (imagem recortada sem a metade invertida) + Declaração de Matrícula em PDF (emitida no AVA em *Documentos e Serviços >> Solicitar*) + E-mail Institucional (`@edu.anhanguera.com`).

---

### A. Inteligência Artificial, IDEs e Engenharia de Software
- [ ] **Cursor Pro (`cursor.com/students`):** 1 ano gratuito ou desconto universitário via SheerID. Libera uso intenso de **Claude 3.5/3.7 Sonnet, Claude Opus, GPT-4o e Gemini** direto no editor.
- [ ] **GitHub Student Developer Pack (`education.github.com/pack`):**
  - [ ] **GitHub Copilot Pro:** 100% gratuito (acesso aos modelos Claude, Gemini e OpenAI no VS Code/JetBrains).
  - [ ] **GitHub Codespaces:** Horas gratuitas de ambiente em nuvem.
  - [ ] **Namecheap / .me / .tech:** Domínios gratuitos por 1 ano para publicar o seu MicroSaaS do Capstone.
- [ ] **Anthropic / Claude (`anthropic.com/education` & Console):** Créditos de API para estudantes/pesquisadores e acesso prioritário para testes do **Model Context Protocol (MCP)**.
- [ ] **Perplexity Pro (via SheerID nas Configurações da Conta):** Desconto de estudante ou meses gratuitos de pesquisa avançada com alternância de modelos (Claude/GPT/Sonar) e upload de PDFs da pós.
- [ ] **Google One AI Premium / Gemini Advanced & NotebookLM Plus:** Usar o **NotebookLM** subindo todos os PDFs das disciplinas e livros da Biblioteca Virtual para gerar podcasts de estudo, resumos e mapas mentais.
- [ ] **JetBrains All Products Pack (`jetbrains.com/community/education`):** Licenças 100% gratuitas de WebStorm, PyCharm Professional, DataGrip e IntelliJ IDEA Ultimate.
- [ ] **Weights & Biases Academic (`wandb.ai/site/academic`):** Conta Pro gratuita para rastrear experimentos de Machine Learning e **Fine-Tuning (LoRA/PEFT)**.
- [ ] **LangSmith Academic / LangChain:** Limites estendidos para observabilidade de agentes em **LangGraph**.

### B. Cloud, Banco de Dados, DevOps e Hospedagem (Custo Zero para Apps)
- [ ] **Microsoft Azure for Students (`azure.microsoft.com/free/students`):** **$100 em créditos** por 12 meses (sem precisar de cartão de crédito) + serviços gratuitos para subir containers, bancos e Azure OpenAI.
- [ ] **DigitalOcean (via GitHub Pack):** **$200 em créditos** por 1 ano — perfeito para rodar sua instância própria de **n8n**, **Evolution API (WhatsApp)**, **PostgreSQL + pgvector** e servidores **MCP** em Docker.
- [ ] **MongoDB Atlas (via GitHub Pack):** **$50 em créditos** + certificação gratuita MongoDB (excelente para usar o *Atlas Vector Search* nos módulos de RAG).
- [ ] **Google Cloud Platform (GCP) & Colab:** $300 de crédito inicial + recursos acadêmicos no Vertex AI e GPUs T4/L4 no Google Colab para a disciplina de *Processamento de Dados e Fine-Tuning*.
- [ ] **AWS Educate & AWS Cloud Club:** Laboratórios gratuitos e créditos para arquiteturas serverless e Bedrock.
- [ ] **Heroku / Vercel / Railway:** Créditos do GitHub Pack ($13/mês por 24 meses no Heroku) para deploy rápido de front-ends e APIs Node.js/Python.

### C. Produto, UX/UI, Gestão de Projetos e Conhecimento (TPM Stack)
- [ ] **Figma Professional Education (`figma.com/education`):** 100% gratuito (FigJam AI, Dev Mode completo e Design Systems para a disciplina de *Ferramentas de IA para UX e UI*).
- [ ] **Notion Education (`notion.so/education`):** Plano Plus gratuito com e-mail escolar + desconto estudantil no **Notion AI** (para a disciplina de *Ferramentas de IA para Gestão de Projetos*).
- [ ] **Miro Education (`miro.com/education-whiteboard`):** Plano Education gratuito para mapeamento de arquitetura de sistemas, Event Storming, Business Cube e Foresight Estratégico.
- [ ] **Canva for Campus / Education & Adobe Creative Cloud:** Desconto de mais de 60% na Adobe CC ou acesso a recursos visuais para apresentações executivas e defesa do Capstone.
- [ ] **Educative.io & DataCamp & Frontend Masters (via GitHub Pack):** 6 meses gratuitos no Frontend Masters, 3 meses no DataCamp e dezenas de trilhas no Educative (incluindo *System Design for ML Engineers* para a disciplina de *Carreira e Entrevistas*).
- [ ] **Biblioteca Virtual Anhanguera (Já Inclusa no AVA):** Acesso gratuito com CPF e senha do portal às bases **Minha Biblioteca**, **Pearson 3.0**, **ProQuest**, **Target GEDWeb (Normas ABNT/ISO)** e **PressReader** (jornais e revistas globais na íntegra).

### D. Estilo de Vida, Foco, Áudio/Vídeo e Hardware (Dia a Dia de Estudos)
- [ ] **Spotify Premium Universitário (`spotify.com/br-pt/student`):** ~50% de desconto mensal (verificação imediata via **SheerID** enviando a Carteirinha ou Declaração de Matrícula da Anhanguera). Ideal para playlists de *Deep Work* e podcasts técnicos.
- [ ] **YouTube Premium Estudante (`youtube.com/premium/student`):** Mais de 40% de desconto via **SheerID** — essencial para assistir aulas técnicas de LLMs, conferências da OpenAI/Anthropic e usar o YouTube Music sem anúncios.
- [ ] **Amazon Prime Student / Prime Brasil:** Ofertas de frete, Prime Video, Prime Reading e descontos em livros físicos de engenharia.
- [ ] **Apple Education Store (`apple.com/br-edu/shop`) & Samsung Estudantes (`samsung.com.br/meuestudante`):** Descontos diretos de estudante universitário na compra de MacBooks (linha M3/M4/M5 para rodar LLMs locais via Ollama/LM Studio), iPads, monitores e acessórios usando o cadastro no **UNiDAYS** ou **Student Beans**.
- [ ] **ISIC / DNE (Documento Nacional do Estudante):** Meia-entrada oficial em todo o Brasil para cinema, shows, teatros e **grandes eventos/conferências de tecnologia e inovação** (TDC, Web Summit Rio, AI Summit, etc.).

### E. Conexões, Comunidades e Networking Global
- [ ] **Discord Oficial da Pós & Grupos de Tutoria (WhatsApp):** Conectar-se com outros engenheiros e líderes técnicos matriculados para formar parcerias de MicroSaaS.
- [ ] **LinkedIn Premium / Learning (Ações Estudantis e GitHub):** Atualizar o perfil com a formação em *Engenharia de Software em IA Aplicada* e publicar semanalmente os avanços do repositório `AppliedAIEngineer`.
- [ ] **Comunidades Acadêmicas de IA (Hugging Face Discord, LangChain Champions, Anthropic Build Club):** Usar o vínculo de pós-graduando para participar de hackathons globais e programas de *Early Access*.

---

## ⚙️ 4. PADRÕES DE ENGENHARIA QUE A IA DEVE SEGUIR NESTE REPOSITÓRIO

1. **Arquitetura Modular & Reutilizável:** Nunca escreva código "descartável de exercício". Todo exercício da Pós deve ser encapsulado como um módulo limpo, tipado e documentado que possa ser importado pelo `agentic-tpm-toolkit/` ou pelo `capstone-microsaas/`.
2. **Stack Tecnológica Híbrida (Conforme Ementa + Mercado):**
   * **TypeScript / Node.js:** Padrão principal para Servidores MCP (Módulo 03), integrações Web, automação de datasets JSONL (Módulo 09) e aplicações Full-Stack.
   * **Python (3.11+):** Padrão para notebooks de Redes Neurais/Transformers (Módulo 01), grafos avançados no **LangGraph** (Módulo 04), simulações estatísticas de Monte Carlo (Módulo 07) e **Fine-Tuning LoRA/PEFT** (Módulo 09).
3. **Padrão AI-First & FinOps Nativo:**
   * Toda chamada de LLM deve passar por uma camada de abstração que registre: `model_used`, `input_tokens`, `output_tokens`, `latency_ms` e `estimated_cost_usd`.
   * Implementar **Model Tiering**: tarefas simples (classificação, extração JSON, triagem) usam modelos leves/baratos (`gpt-4o-mini`, `gemini-2.5-flash`, `claude-3-5-haiku` ou modelos locais via `Ollama`); tarefas de arquitetura, código complexo e raciocínio multi-etapas usam modelos de fronteira (`claude-3-7-sonnet`, `gemini-2.5-pro`, `o3-mini`).
4. **Segurança & Governança (Privacy by Design):**
   * Nenhum dado sensível (PII) vai para APIs externas sem sanitização/mascaramento prévio (conformidade **LGPD / GDPR**).
   * Todo input externo de usuário em agentes deve passar por validação contra *Prompt Injection* (padrão **MITRE ATLAS**).
5. **Documentação Estilo TPM Executivo:**
   * Cada pasta dentro de `/modules` e `/agentic-tpm-toolkit` deve conter um `README.md` com: **Contexto do Problema**, **Diagrama de Arquitetura (Mermaid.js)**, **Métricas de Sucesso (OKRs / KPIs)**, **Como Rodar** e **Aplicação Prática em Produto**.

---

## 🎬 5. COMANDO DE EXECUÇÃO (O QUE FAZER AGORA)

**IA, execute imediatamente a Fase 1 deste plano:**
1. Crie toda a árvore de diretórios definida na **Seção 2**.
2. Gere o arquivo `.cursorrules` e `CLAUDE.md` na raiz com as regras da **Seção 4**.
3. Crie o arquivo `docs/00-student-perks-tracker.md` contendo o checklist completo da **Seção 3** para eu ir marcando conforme aprovo cada benefício.
4. Prepare o ambiente inicial do **Módulo 01 (`modules/01-llm-foundations`)**, que se inicia em **29/10/2026**, criando um projeto base em TypeScript/Python para explorar *Embeddings*, *Attention/Transformers* e busca semântica em um *Vector Database*, junto com o primeiro agente do `agentic-tpm-toolkit/epic-to-stories-agent`.
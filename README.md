# 🚀 Applied AI Engineering & Agentic TPM Monorepo

Repositório central de engenharia de software *AI-First*, servidores Model Context Protocol (MCP), orquestração de sistemas multiagentes e ferramentas de **Agentic Technical Program/Product Management (TPM)**.

Este monorepo consolida os laboratórios práticos, protótipos e frameworks proprietários desenvolvidos ao longo da Pós-Graduação Lato Sensu em **Engenharia de Software em IA Aplicada** (2026–2027).

---

## 🎯 Manifesto & Visão de Produto (TPM Agentic)

A atuação como **Agentic TPM** neste repositório baseia-se na fusão entre a **Engenharia de Software de Alta Performance** e a **Automação Inteligente do Ciclo de Vida de Desenvolvimento (SDLC)**. O objetivo é utilizar agentes autônomos e LLMs para:
* **Orquestrar o Backlog & Descoberta:** Transformar épicos complexos em especificações técnicas e user stories com critérios de aceite rigorosos.
* **Mitigar Riscos e Prever Prazos:** Aplicar simulações probabilísticas (como Monte Carlo) e priorização preditiva (RICE/WSJF) para garantir previsibilidade em equipes remotas e distribuídas.
* **Garantir Governança e Compliance:** Implantar padrões de segurança rigorosos (MITRE ATLAS, LGPD/GDPR) desde a concepção arquitetural (*Privacy by Design*).

---

## 🏗️ Arquitetura do Repositório

```text
AppliedAIEngineer/
├── .github/
│   └── workflows/                  # CI/CD assistido por IA, validações automatizadas e FinOps
├── .cursorrules                    # Regras globais de contexto e padrões arquiteturais para o Cursor/Claude
├── docs/
│   ├── roadmap-pos-2026-2027.md    # Cronograma detalhado da especialização
│   ├── architecture-decisions/     # ADRs (Architecture Decision Records) de sistemas AI-First
│   └── governance-lgpd/            # Templates de compliance e mitigação de riscos (OWASP Top 10 for LLMs)
├── modules/                        # Laboratórios práticos das 15 disciplinas do curso
│   ├── 01-llm-foundations/         # Embeddings, tensores, attention e Vector DBs
│   ├── 02-generative-apis-prompts/ # Gateways multimodais (OpenAI, Gemini, Anthropic)
│   ├── 03-mcp-servers/             # Servidores Model Context Protocol em TS/JS + WAF
│   ├── 04-autonomous-agents/       # Grafos ReAct, Plan-and-Execute e LangGraph
│   ├── 05-ai-ux-ui/                # Prototipação inteligente e Design Systems
│   ├── 06-ai-devops-aiops/         # IaC, observabilidade NL->PromQL e FinOps
│   ├── 07-agentic-tpm-pm/          # Automação de backlog, simulações e integrações Jira/Notion
│   ├── 08-ai-system-architecture/  # RAG avançado, caching semântico e model routing
│   ├── 09-data-finetuning-lora/    # Pipelines JSONL, PEFT/LoRA e avaliação A/B
│   └── 10-ai-security-governance/  # Guardrails contra Prompt Injection e Data Poisoning
├── agentic-tpm-toolkit/            # Ferramentas autônomas de TPM (LATAM.AIgile / inSquad)
│   ├── backlog-refiner-agent/      # Agente gerador de artefatos e histórias de usuário
│   ├── monte-carlo-forecaster/     # Simulador preditivo de prazos e custos
│   └── mcp-jira-notion-bridge/     # Ponte MCP entre IDEs e ferramentas de gestão
└── capstone-microsaas/             # Projeto Integrador - MVP Full-Stack em Produção
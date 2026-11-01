# Estrutura do Projeto

## Local de Desenvolvimento

```text
E:\wesleyzilva\repo\AppliedAIEngineer\modules\module04
```

O projeto deve ser criado integralmente dentro desta pasta.

Estrutura sugerida:

```text
module04/

├── game/
│   ├── src/
│   ├── assets/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── datasets/
│   ├── screenshots/
│   ├── labels/
│   ├── yolo/
│   └── exports/
│
├── training/
│   ├── yolo/
│   ├── notebooks/
│   └── models/
│
├── logs/
│
└── docs/
```

---

# Estratégia de Desenvolvimento

O desenvolvimento será dividido em duas grandes etapas.

## Etapa 1 - Construção do Jogo

Objetivo:

Criar uma versão funcional do jogo com:

- Labirinto
- Personagens
- Robô
- Zumbi
- Bombas
- Explosões
- Vitória e derrota
- Captura de screenshots

Nesta fase o foco NÃO é IA avançada.

Apenas IA simples baseada em regras.

Exemplo:

- seguir jogador
- fugir da explosão
- plantar bomba quando próximo

---

## Etapa 2 - Visão Computacional com YOLO

Após o jogo estar totalmente funcional, o foco passa a ser exclusivamente visão computacional.

Objetivo:

Treinar modelos YOLO capazes de reconhecer:

- Samuel
- Daiana
- Heitor
- Wesley
- Robô
- Zumbi
- Bombas
- Explosões
- Paredes
- Caminhos

---

# YOLO como Tecnologia Principal

A arquitetura do jogo deve facilitar a geração automática de datasets para YOLO.

Toda implementação futura deve considerar esse requisito.

---

# Classes de Detecção

Arquivo esperado:

```yaml
names:
  0: samuel
  1: daiana
  2: heitor
  3: wesley
  4: robo
  5: zumbi
  6: bomba
  7: explosao
  8: parede
  9: caminho
```

---

# Geração Automática de Dataset

Implementar sistema capaz de capturar screenshots.

Exemplo:

```javascript
dataset.capture();
```

Resultado:

```text
datasets/screenshots/
```

Produzindo milhares de imagens durante as partidas.

---

# Exportação de Bounding Boxes

Todo objeto relevante deve possuir:

```javascript
entity.getBoundingBox()
```

Exemplo:

```javascript
{
  class: "samuel",
  x: 210,
  y: 120,
  width: 48,
  height: 48
}
```

Isto permitirá gerar labels YOLO automaticamente.

---

# Exportação YOLO

Implementar exportador.

Exemplo:

```javascript
dataset.exportYOLO();
```

Gerando:

```text
datasets/yolo/images
datasets/yolo/labels
```

Formato:

```text
class x_center y_center width height
```

---

# Dataset para Treinamento

Objetivo inicial:

```text
5.000 imagens
```

Meta recomendada:

```text
10.000+ imagens
```

geradas automaticamente através de partidas.

---

# Sistema de Arena Automática

O jogo deverá suportar:

```javascript
Arena.run(1000);
```

onde:

```text
1000 partidas
```

são executadas automaticamente para geração de dataset.

---

# Métricas de Dataset

Registrar:

- imagens geradas
- labels geradas
- quantidade por classe

Exemplo:

```json
{
  "samuel": 5218,
  "daiana": 5012,
  "robo": 6340,
  "zumbi": 6120,
  "bomba": 14920,
  "explosao": 8271
}
```

---

# Objetivo Final do Projeto

Fase 1:

Criar um jogo funcional.

Fase 2:

Gerar dataset automaticamente.

Fase 3:

Treinar YOLO.

Fase 4:

Detectar todos os elementos do jogo apenas pela imagem.

Fase 5:

Utilizar as detecções YOLO como entrada para uma IA de tomada de decisão.

Fase 6:

Treinar agentes capazes de derrotar humanos utilizando apenas a visão da tela, sem acesso direto ao estado interno do jogo.
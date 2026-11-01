export const TILE_SIZE = 48;
export const COLS = 15;
export const ROWS = 13;
export const SCREEN_WIDTH = COLS * TILE_SIZE;  // 720px
export const SCREEN_HEIGHT = ROWS * TILE_SIZE; // 624px

export const TILE_TYPES = {
  EMPTY: 0,
  WALL_SOLID: 1,
  WALL_BRICK: 2,
  SPAWN: 3
};

export const ACTIONS = ['CIMA', 'BAIXO', 'ESQUERDA', 'DIREITA', 'BOMBA', 'ESPERAR'];

export const YOLO_CLASSES = {
  ALL: { id: -1, name: 'Todas as Classes' },
  P1: { id: 0, name: 'Classe 0: Jogador 1' },
  P2: { id: 1, name: 'Classe 1: Jogador 2' },
  BOMB: { id: 2, name: 'Classe 2: Bomba' },
  FIRE: { id: 3, name: 'Classe 3: Explosão/Fogo' }
};

export const FAMILY_MEMBERS = {
  samuel: {
    id: 'samuel',
    name: 'Samuel',
    color: 0x00ffcc,
    epochs: 12,
    learningRate: 0.08,
    hiddenUnits: 16,
    hiddenUnits2: 8,
    tacticalPrecision: 0.48,
    candidateSprites: [
      '/assets/characters/samuel/head.png',
      '/samuel/samuel.png',
      '/samuel.png'
    ]
  },
  daiana: {
    id: 'daiana',
    name: 'Daiana',
    color: 0xff6b6b,
    epochs: 28,
    learningRate: 0.05,
    hiddenUnits: 28,
    hiddenUnits2: 14,
    tacticalPrecision: 0.72,
    candidateSprites: [
      '/daiana/daiana.png',
      '/daiana.png',
      '/assets/characters/daiana/head.png',
      '/assets/characters/daiana/daiana.png'
    ]
  },
  heitor: {
    id: 'heitor',
    name: 'Heitor',
    color: 0xfeca57,
    epochs: 50,
    learningRate: 0.03,
    hiddenUnits: 48,
    hiddenUnits2: 24,
    tacticalPrecision: 0.88,
    candidateSprites: [
      '/assets/characters/heitor/head.png',
      '/heitor/heitor.png',
      '/heitor.png'
    ]
  },
  wesley: {
    id: 'wesley',
    name: 'Wesley',
    color: 0x54a0ff,
    epochs: 85,
    learningRate: 0.015,
    hiddenUnits: 64,
    hiddenUnits2: 32,
    tacticalPrecision: 0.98,
    candidateSprites: [
      '/assets/characters/wesley/head.png',
      '/wesley/wesley.png',
      '/wesley.png'
    ]
  }
};

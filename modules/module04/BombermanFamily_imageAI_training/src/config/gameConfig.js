export const GAME_CONFIG = {
  game: {
    title: "Bomberman Family AI Training",
    backgroundColor: 0x1e1e1e
  },

  screen: {
    width: window.innerWidth,
    height: window.innerHeight
  },

  grid: {
    rows: 21,
    cols: 21
  },

  hud: {
    heightPercent: 0.1
  },

  player: {
    speed: 3,
    maxHp: 3
  },

  bomb: {
    delay: 2000,
    smallRange: 1,
    mediumRange: 2,
    largeRange: 3
  }
};
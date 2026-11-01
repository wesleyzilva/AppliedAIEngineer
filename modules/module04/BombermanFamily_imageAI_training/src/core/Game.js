import { Application } from "pixi.js";
import { GAME_CONFIG } from "../config/gameConfig.js";
import { ArenaScene } from "../scenes/ArenaScene.js";

export class Game {
    constructor() {
        this.app = new Application();
    }

    async init() {
        await this.app.init({
            resizeTo: window,
            background: GAME_CONFIG.game.backgroundColor,
            antialias: true
        });

        document.body.appendChild(this.app.canvas);

        this.arenaScene = new ArenaScene(this.app);
        this.arenaScene.init();
    }

    getApp() {
        return this.app;
    }

    getArena() {
        return this.arenaScene;
    }
}
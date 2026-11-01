import { Container } from "pixi.js";
import { Grid } from "../map/Grid.js";
import { Player } from "../entities/Player.js";
import { InputManager } from "../core/InputManager.js";
import { BombSystem } from "../systems/BombSystem.js";
export class ArenaScene {
    constructor(app) {
        this.app = app;
        this.container = new Container();
    }

    init() {
        this.app.stage.addChild(this.container);
this.bombSystem = new BombSystem(
    this.container
);

this.spacePressed = false;
        const grid = new Grid(
            this.container,
            window.innerWidth,
            window.innerHeight
        );

        grid.draw();

        this.player = new Player(
            100,
            100,
            24
        );

        this.player.addTo(this.container);

        this.input = new InputManager();

        this.app.ticker.add(() => {
            this.update();
        });
    }

    update() {
        const speed = 3;

        if (this.input.isPressed("ArrowUp")) {
            this.player.move(0, -speed);
        }

        if (this.input.isPressed("ArrowDown")) {
            this.player.move(0, speed);
        }

        if (this.input.isPressed("ArrowLeft")) {
            this.player.move(-speed, 0);
        }

        if (this.input.isPressed("ArrowRight")) {
            this.player.move(speed, 0);
        }
    }

    getContainer() {
        return this.container;
    }
}
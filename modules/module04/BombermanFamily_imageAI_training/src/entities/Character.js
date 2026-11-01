import { Graphics } from "pixi.js";

export class Character {
    constructor(x, y, radius = 20, color = 0x3498db) {
        this.speed = 3;

        this.sprite = new Graphics()
            .circle(0, 0, radius)
            .fill(color);

        this.sprite.x = x;
        this.sprite.y = y;
    }

    addTo(container) {
        container.addChild(this.sprite);
    }

    move(dx, dy) {
        this.sprite.x += dx;
        this.sprite.y += dy;
    }

    get x() {
        return this.sprite.x;
    }

    get y() {
        return this.sprite.y;
    }
}

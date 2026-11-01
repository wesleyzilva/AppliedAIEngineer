export class CollisionSystem {

    static keepInsideScreen(player, width, height) {

        if (player.sprite.x < 0) {
            player.sprite.x = 0;
        }

        if (player.sprite.y < 0) {
            player.sprite.y = 0;
        }

        if (player.sprite.x > width) {
            player.sprite.x = width;
        }

        if (player.sprite.y > height) {
            player.sprite.y = height;
        }
    }

}
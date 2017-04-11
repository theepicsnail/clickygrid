class Resources {
    constructor() {
        if (game.resources) throw new Error("Resources re-initialized");
        game.resources = this;

        this.tiles = {};

        this.addTileset("tiles.png");
    }

    addTileset(url) {
        if (this.tiles[url]) return;

        this.tiles[url] = [];

        const img = new Image();
        img.onload = () => {
            const rows = img.height / tileSize;
            const cols = img.width / tileSize;
            if (!Number.isInteger(rows) || !Number.isInteger(cols)) {
                console.warn(`Image ${url} not evenly divisible by ${tileSize}`);
                console.warn(img.width, img.height);
                return;
            }
            this.tiles[url] = img;
        };
        img.src = url;
    }

    drawTile(url, x, y, ctx, dx, dy) {
        ctx.drawImage(this.tiles[url], x * tileSize, y * tileSize, tileSize, tileSize, dx, dy, tileSize, tileSize);
    }
}
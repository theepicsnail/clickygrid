class Resources {
    constructor() {
        if (game.resources) throw new Error("Resources re-initialized");
        game.resources = this;

        this.tiles = {};
        // Tiles from: http://pixeljoint.com/pixelart/67541.htm
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

    drawTile(url, tile, ctx, dx, dy) {
        const x = tile % 16;
        const y = (tile-x)/16;
        ctx.drawImage(this.tiles[url], x * tileSize, y * tileSize, tileSize, tileSize, dx, dy, tileSize, tileSize);
    }
}
class Resources {
  constructor() {
    if (game.resources)
      throw new Error("Resources re-initialized");
    game.resources = this;

    this.tilesets = new Map();
  }

  addTileset(url) {
    if (this.tiles[url])
      return;

    this.tiles[url] = [];

    const img = new Image();
    img.onload = () => { this.tiles[url] = img; };
    img.src = url;
  }

  drawTile(tilesheet, tile, ctx, dx, dy) {
    const x = tile % 16;
    const y = (tile - x) / 16;
    ctx.drawImage(tilesheet, x * tileSize, y * tileSize, tileSize, tileSize, dx,
                  dy, tileSize, tileSize);
  }

  /**
   * Returns a promise that is resolved with the image. If the image is in cache
   * this promise resolves immediately.
   */
  getTilesheet(url) {
    if (this.tilesets.has(url)) {
      return this.tilesets.get(url);
    }

    const img = new Image();
    const p = new Promise((resolve, reject) => {
      img.onload = () => {
        const rows = img.height / tileSize;
        const cols = img.width / tileSize;
        if (!Number.isInteger(rows) || !Number.isInteger(cols)) {
          console.warn(`Image ${url} not evenly divisible by ${tileSize}`);
          console.warn(img.width, img.height);
          reject();
        } else {
          resolve(img);
        }
      };
      img.onerror = () => { reject(); };
    });
    this.tilesets.set(url, p);
    img.src = url;
    return p;
  }
}

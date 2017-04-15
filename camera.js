class Camera {
  constructor() {
    if (game.camera)
      throw new Error("Camera re-initialized");
    game.camera = this;

    this.worldX = 0;
    this.worldY = 0;

    this.displayWidth = 0;
    this.displayHeight = 0;
    this.displayZoom = 1;

    this.layerMap = {};
    this.layers = [];
    this.addLayer("terrain");
    this.addLayer("overlay");

    window.onresize =
        () => { this.setSize(window.innerWidth, window.innerHeight); };
    this.setCenter(0, 0);
    window.onresize();
  }

  addLayer(name) {
    const canvas = document.getElementById(name);
    canvas.ctx = canvas.getContext("2d");
    this.layers.push(canvas);
    this.layerMap[name] = canvas;
  }
  getLayer(name) { return this.layerMap[name]; }
  get topLayer() { return this.layers[this.layers.length - 1]; }
  forEachLayer(cb) { this.layers.forEach(cb); }

  setSize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    this.forEachLayer((layer) => {
      layer.width = width;
      layer.height = height;
    });
    this.recomputeCamera();
  }

  moveCenter(dx, dy) { this.setCenter(this.worldX + dx, this.worldY + dy); }
  setCenter(x, y) {
    this.worldX = x | 0;
    this.worldY = y | 0;
    this.recomputeCamera();
    /*
        game.debug.values.location = `${this.x},${this.y}`;

        if (this.updatingHash)
          return;
        const T = this;
        this.updatingHash = setTimeout(() => {
          window.location.hash = `${T.x},${T.y}`;
          delete T.updatingHash;
        }, 1000);*/
  }

  get zoom() { return this.displayZoom; }
  set zoom(z) {
    const old = this.displayZoom;
    this.displayZoom = Math.min(4, Math.max(.5, z));
    if (this.displayZoom != old)
      this.recomputeCamera();
  }

  /* Returns world coordinates for the left/right/top/bottom of the screen */
  get screenLeft() {
    return Math.floor(this.worldX - this.displayWidth / 2 / this.displayZoom);
  }
  get screenTop() {
    return Math.floor(this.worldY - this.displayHeight / 2 / this.displayZoom);
  }
  get screenRight() {
    return Math.ceil(this.worldX + this.displayWidth / 2 / this.displayZoom);
  }
  get screenBottom() {
    return Math.ceil(this.worldY + this.displayHeight / 2 / this.displayZoom);
  }

  /**
  Given screen (x,y) return
  {chunk: [x,y], tile:[x,y]}
  */
  screenPointToWorld(x, y) {
    const worldX = x / this.displayZoom + this.screenLeft;
    const worldY = y / this.displayZoom + this.screenTop;
    const chunkX = Math.floor(worldX / pixelsPerChunk);
    const chunkY = Math.floor(worldY / pixelsPerChunk);
    const tileX = Math.floor((worldX - chunkX * pixelsPerChunk) / tileSize);
    const tileY = Math.floor((worldY - chunkY * pixelsPerChunk) / tileSize);
    return {chunk : [ chunkX, chunkY ], tile : [ tileX, tileY ]};
  }

  recomputeCamera() {
    // Expand by 1 so that scrolling already has the next chunk.
    const chunkLeft = Math.floor(this.screenLeft / pixelsPerChunk) - 1;
    const chunkTop = Math.floor(this.screenTop / pixelsPerChunk) - 1;
    const chunkRight = Math.ceil(this.screenRight / pixelsPerChunk) + 1;
    const chunkBot = Math.ceil(this.screenBottom / pixelsPerChunk) + 1;

    this.forEachLayer((layer) => {
      layer.ctx.setTransform(1, 0, 0, 1, 0, 0);
      layer.ctx.scale(this.displayZoom, this.displayZoom);
      layer.ctx.translate(-this.screenLeft, -this.screenTop);
    });

    let chunkLocations = new Set();
    for (let y = chunkTop; y < chunkBot; y++)
      for (let x = chunkLeft; x < chunkRight; x++) {
        chunkLocations.add(`${x},${y}`);
      }
    game.chunkManager.ensureLoadedChunks(chunkLocations);
    this.redrawAll();
  }

  clearAll() {
    this.forEachLayer((layer) => {
      layer.ctx.save();
      layer.ctx.setTransform(1, 0, 0, 1, 0, 0);
      layer.ctx.clearRect(0, 0, layer.width, layer.height);
      layer.ctx.restore();
    });
  }

  redrawAll() {
    this.clearAll();
    game.chunkManager.loadedChunks.forEach((chunk) => { //
      this.redrawChunk(chunk);
    });
  }

  redrawChunk(chunk) {
    const x = chunk.x * pixelsPerChunk;
    const y = chunk.y * pixelsPerChunk;
    const layer = this.getLayer("terrain");

    layer.ctx.drawImage(chunk.image, x, y);

    if (game.debug.values.showChunks) {
      layer.ctx.beginPath();
      layer.ctx.rect(x, y, pixelsPerChunk, pixelsPerChunk);
      layer.ctx.fillText(`(${chunk.x},${chunk.y})`, x + pixelsPerChunk / 2,
                         y + pixelsPerChunk / 2);
      layer.ctx.stroke();
    }
  }
}

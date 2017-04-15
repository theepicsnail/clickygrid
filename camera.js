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

    this.subscriptions = {};
    this.layers = [ new TerrainLayer(), new OverlayLayer() ];

    window.onresize =
        () => { this.setSize(window.innerWidth, window.innerHeight); };
    this.setCenter(0, 0);
    window.onresize();
  }

  subscribe(event, handler) {
    this.subscriptions[event] = this.subscriptions[event] || [];
    this.subscriptions[event].push(handler);
  }

  publishEvent(event, ...args) {
    (this.subscriptions[event] || []).forEach((cb) => cb(...args));
  }

  get topLayer() { return this.layers[this.layers.length - 1]; }
  forEachLayer(cb) { this.layers.forEach(cb); }

  setSize(width, height) {
    this.displayWidth = width;
    this.displayHeight = height;
    this.publishEvent("resize", width, height);
  }

  moveCenter(dx, dy) { this.setCenter(this.worldX + dx, this.worldY + dy); }
  setCenter(x, y) {
    this.worldX = x | 0;
    this.worldY = y | 0;
    this.publishEvent("moved", this.worldX, this.worldY);
  }

  get zoom() { return this.displayZoom; }
  set zoom(z) {
    const old = this.displayZoom;
    this.displayZoom = Math.min(4, Math.max(.5, z));
    if (this.displayZoom != old)
      this.publishEvent("zoomed", this.displayZoom);
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

  /**
   * Set the transform on the canvas to map the camera's world position and
   * zoom.
   */
  applyWorldTransform(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(this.displayZoom, this.displayZoom);
    ctx.translate(-this.screenLeft, -this.screenTop);
  }
}

class Layer {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    document.getElementById("layers").appendChild(this.canvas);
    game.camera.subscribe("resize", (width, height) => {
      this.canvas.width = width;
      this.canvas.height = height;
      this.redrawAll();
    });
  }

  redrawAll() {}
}

class TerrainLayer extends Layer {
  constructor() {
    super();
    const worldUpdateHandler = this.worldUpdateHandler.bind(this);
    game.camera.subscribe("moved", worldUpdateHandler);
    game.camera.subscribe("zoomed", worldUpdateHandler);
    game.camera.subscribe("resize", worldUpdateHandler);
    game.chunkManager.subscribe("update", this.redrawChunk.bind(this));
  }

  worldUpdateHandler() {
    const camera = game.camera;
    const chunkLeft = Math.floor(camera.screenLeft / pixelsPerChunk) - 1;
    const chunkTop = Math.floor(camera.screenTop / pixelsPerChunk) - 1;
    const chunkRight = Math.ceil(camera.screenRight / pixelsPerChunk) + 1;
    const chunkBot = Math.ceil(camera.screenBottom / pixelsPerChunk) + 1;
    camera.applyWorldTransform(this.ctx);

    let chunkLocations = new Set();
    for (let y = chunkTop; y < chunkBot; y++)
      for (let x = chunkLeft; x < chunkRight; x++) {
        chunkLocations.add(`${x},${y}`);
      }
    game.chunkManager.ensureLoadedChunks(chunkLocations);

    game.chunkManager.loadedChunks.forEach((chunk) => { //
      this.redrawChunk(chunk);
    });
  }

  redrawChunk(chunk) {
    const x = chunk.x * pixelsPerChunk;
    const y = chunk.y * pixelsPerChunk;

    this.ctx.drawImage(chunk.image, x, y);

    if (game.debug.values.showChunks) {
      this.ctx.beginPath();
      this.ctx.rect(x, y, pixelsPerChunk, pixelsPerChunk);
      this.ctx.fillText(`(${chunk.x},${chunk.y})`, x + pixelsPerChunk / 2,
                        y + pixelsPerChunk / 2);
      this.ctx.stroke();
    }
  }
}

class OverlayLayer extends Layer {
  constructor() {
    super();
    this.setupLocationHash();
  }

  setupLocationHash() {
    let updating = false;
    game.camera.subscribe("moved", (x, y) => {
      game.debug.values.location = `${x},${y}`;

      if (updating)
        return;
      updating = true;
      this.updatingHash = setTimeout(() => {
        window.location.hash = game.debug.values.location;
        updating = false;
      }, 1000);
    })
  }
}

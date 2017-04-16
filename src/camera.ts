import * as globals from './globals';

interface ExperimentalCSSStyleDeclaration extends CSSStyleDeclaration{
  imageRendering: string;
};


export class Camera {
  layers: (TerrainLayer | OverlayLayer)[];
  subscriptions: {};
  displayZoom: number;
  displayHeight: number;
  displayWidth: number;
  worldY: number;
  worldX: number;

  constructor() {
    if (globals.game.camera)
      throw new Error("Camera re-initialized");
    globals.game.camera = this;

    this.worldX = 0;
    this.worldY = 0;

    this.displayWidth = 0;
    this.displayHeight = 0;
    this.displayZoom = 1;

    this.subscriptions = {};
    this.layers = [new TerrainLayer(), new OverlayLayer()];

    window.onresize =
      () => { this.setSize(window.innerWidth, window.innerHeight); };
    this.setCenter(0, 0);
    window.onresize(null);
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
    this.worldX = x;
    this.worldY = y;
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
    const chunkX = Math.floor(worldX / globals.pixelsPerChunk);
    const chunkY = Math.floor(worldY / globals.pixelsPerChunk);
    const tileX = Math.floor((worldX - chunkX * globals.pixelsPerChunk) / globals.tileSize);
    const tileY = Math.floor((worldY - chunkY * globals.pixelsPerChunk) / globals.tileSize);
    return { chunk: [chunkX, chunkY], tile: [tileX, tileY] };
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
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  constructor() {
    this.canvas = document.createElement("canvas");
    (<ExperimentalCSSStyleDeclaration>this.canvas.style).imageRendering = "pixelated";
    this.ctx = this.canvas.getContext("2d");
    document.getElementById("layers").appendChild(this.canvas);
    globals.game.camera.subscribe("resize", (width, height) => {
      this.canvas.width = width;
      this.canvas.height = height;
      this.ctx.imageSmoothingEnabled = false;
      this.redrawAll();
    });
  }

  redrawAll() { }
}

class TerrainLayer extends Layer {
  constructor() {
    super();
    const worldUpdateHandler = this.worldUpdateHandler.bind(this);
    globals.game.camera.subscribe("moved", worldUpdateHandler);
    globals.game.camera.subscribe("zoomed", worldUpdateHandler);
    globals.game.camera.subscribe("resize", worldUpdateHandler);
    globals.game.chunkManager.subscribe("update", this.redrawChunk.bind(this));
  }

  worldUpdateHandler() {
    const camera = globals.game.camera;
    const chunkLeft = Math.floor(camera.screenLeft / globals.pixelsPerChunk) - 1;
    const chunkTop = Math.floor(camera.screenTop / globals.pixelsPerChunk) - 1;
    const chunkRight = Math.ceil(camera.screenRight / globals.pixelsPerChunk) + 1;
    const chunkBot = Math.ceil(camera.screenBottom / globals.pixelsPerChunk) + 1;
    camera.applyWorldTransform(this.ctx);

    let chunkLocations = new Set();
    for (let y = chunkTop; y < chunkBot; y++)
      for (let x = chunkLeft; x < chunkRight; x++) {
        chunkLocations.add(`${x},${y}`);
      }
    globals.game.chunkManager.ensureLoadedChunks(chunkLocations);

    globals.game.chunkManager.loadedChunks.forEach((chunk) => { //
      this.redrawChunk(chunk);
    });
  }

  redrawChunk(chunk) {
    const x = chunk.x * globals.pixelsPerChunk;
    const y = chunk.y * globals.pixelsPerChunk;
    this.ctx.font = "20px";
    this.ctx.drawImage(chunk.image, x, y);

    if (globals.game.debug.showChunks) {
      this.ctx.beginPath();
      this.ctx.rect(x, y, globals.pixelsPerChunk, globals.pixelsPerChunk);
      this.ctx.fillText(`(${chunk.x},${chunk.y})`, x + globals.pixelsPerChunk / 2,
        y + globals.pixelsPerChunk / 2);
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
    globals.game.camera.subscribe("moved", (x, y) => {
      // make the coords integers.
      x |= 0;
      y |= 0;
      globals.game.debug.location = `${x},${y}`;

      if (updating)
        return;
      updating = true;
      setTimeout(() => {
        window.location.hash = globals.game.debug.location;
        updating = false;
      }, 1000);
    })
  }
}

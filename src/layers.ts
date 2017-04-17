import * as globals from './globals';

interface ExperimentalCSSStyleDeclaration extends CSSStyleDeclaration{
  imageRendering: string;
};

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


export class LayerManager {
    layers: (Layer)[];
    constructor() {
        
    if (globals.game.layerManager)
      throw new Error("LayerManager re-initialized");
    globals.game.layerManager = this;

        this.layers = [new TerrainLayer(), new OverlayLayer()];
    }
    get topLayer() {
        return this.layers[this.layers.length-1];
    }
}
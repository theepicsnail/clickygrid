import * as globals from './globals';

globals.game.debug.chunkCount = 0;
export class Chunk {
  ctx: CanvasRenderingContext2D;
  image: HTMLCanvasElement;
  y: number;
  x: number;
  constructor(x, y) {
    globals.game.debug.chunkCount++;
    this.x = x;
    this.y = y;
    this.image = document.createElement("canvas");
    this.image.width = globals.pixelsPerChunk;
    this.image.height = globals.pixelsPerChunk;

    this.ctx = this.image.getContext("2d");
  }

  unload() {
    globals.game.debug.chunkCount--;
    delete this.image;
    return true;
  }

  /**
   * Tile x,y was clicked on.
   * @param x
   * @param y
   */
  clicked(x, y) { }
}

class FirebaseChunk extends Chunk {
  values: any;
  ref: firebase.database.Reference;
  constructor(x, y) {
    super(x, y);

    this.drawText("Loading...", "#000");
    globals.game.chunkManager.publishEvent("update", this);

    this.ref = firebase.database().ref(`/chunks/${this.x},${this.y}`);
    this.ref.on('value', (v) => { this.dbUpdate(v.val()); });
  }

  dbUpdate(update) {
    if (update === null) {
      update = {};
    }

    this.values = {};
    for (let y = 0; y < globals.blockSize; y++)
      for (let x = 0; x < globals.blockSize; x++) {
        const key = `${x},${y}`
        this.values[key] = update[key] ||
            globals.mapDefault(
              this.x * globals.blockSize + x,
              this.y * globals.blockSize + y);
      }

    Promise
      .race([
        new Promise((res, rej) => { setTimeout(rej, 100); }),
        globals.game.resources.getTilesheet("res/tiles.png")
          .then(this.drawTiles.bind(this))
          .catch(() => { this.drawText("Failed", "#800"); })
          .then(() => {
            globals.game.chunkManager.publishEvent("update", this);
            return true;
          })
      ])
      .catch(() => {
        this.drawText("Loading...", "#000");
        globals.game.chunkManager.publishEvent("update", this);
      });
  }

  drawTiles(tiles) {
    for (let y = 0; y < globals.blockSize; y++)
      for (let x = 0; x < globals.blockSize; x++) {
        let val = this.values[`${x},${y}`]['value'];
        globals.game.resources.drawTile(
          tiles,
          val,
          this.ctx,
          x * globals.tileSize,
          y * globals.tileSize);
      }
    globals.game.chunkManager.publishEvent("update", this);
  }

  drawText(text, color) {
    this.ctx.fillStyle = "#888888";
    this.ctx.fillRect(0, 0, this.image.width, this.image.height);

    this.ctx.fillStyle = color;
    this.ctx.font = "30px Arial";
    this.ctx.fillText(text, this.image.width / 2, this.image.height / 2);
  }

  unload() {
    super.unload();
    this.ref.off();
    return true;
  }

  clicked(x, y) {
    const def = globals.mapDefault(
      this.x * globals.blockSize + x,
      this.y * globals.blockSize + y);
    let cur = this.values[`${x},${y}`]['value'];
    let next = globals.terrain.GRASS;
    switch (cur) {
      case globals.terrain.WATER:
        next = globals.terrain.SAND;
        break;
      case globals.terrain.SAND:
        next = globals.terrain.GRASS;
        break;
      case globals.terrain.GRASS:
        next = globals.terrain.STONE;
        break;
      case globals.terrain.STONE:
        next = globals.terrain.GOLD;
        break;
      case globals.terrain.GOLD:
        next = globals.terrain.WATER;
        break;
    }
    const ref = this.ref.child(`${x},${y}`);

    if (next === def.value)
      ref.remove();
    else
      ref.set({ 'value': next });
  }
}
class TerrainDevChunk extends Chunk {
  constructor(x, y) {
    super(x, y);
    this.render();
  }
  render() {
    const id = this.ctx.createImageData(globals.pixelsPerChunk, globals.pixelsPerChunk);
    const data = id.data;
    for (var x = 0; x < globals.pixelsPerChunk; x++)
      for (var y = 0; y < globals.pixelsPerChunk; y++) {
        let o = (x + y * globals.pixelsPerChunk) * 4;
        let d = globals.mapDefault(this.x * globals.pixelsPerChunk + x,
          this.y * globals.pixelsPerChunk + y);
        let color = [255, 0, 0];
        switch (d.value) {
          case globals.terrain.GOLD:
            color = [255, 128, 0];
            break;
          case globals.terrain.STONE:
            color = [128, 128, 128];
            break;
          case globals.terrain.SAND:
            color = [200, 150, 0];
            break;
          case globals.terrain.GRASS:
            color = [0, 128, 0];
            break;
          case globals.terrain.WATER:
            color = [0, 0, 128];
            break;
        }
        data[o + 0] = color[0];
        data[o + 1] = color[1];
        data[o + 2] = color[2];
        data[o + 3] = 255;
        // godata[0]=v;
      }
    this.ctx.putImageData(id, 0, 0);
    globals.game.camera.redrawChunk(this);
  }

  unload() { return false; }
}

export const ChunkType = FirebaseChunk; //:TerrainDevChunk;

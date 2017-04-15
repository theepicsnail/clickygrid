game.debug.values.chunkCount = 0;
class Chunk {
  constructor(x, y) {
    game.debug.values.chunkCount++;
    this.x = x;
    this.y = y;
    this.image = document.createElement("canvas");
    this.image.width = pixelsPerChunk;
    this.image.height = pixelsPerChunk;

    this.ctx = this.image.getContext("2d");
  }

  unload() {
    game.debug.values.chunkCount--;
    delete this.image;
    return true;
  }

  /**
   * Tile x,y was clicked on.
   * @param x
   * @param y
   */
  clicked(x, y) {}
}

class FirebaseChunk extends Chunk {
  constructor(x, y) {
    super(x, y);

    this.drawText("Loading...", "#000");
    game.chunkManager.publishEvent("update", this);

    this.ref = firebase.database().ref(`/chunks/${this.x},${this.y}`);
    this.ref.on('value', (v) => { this.dbUpdate(v.val()); });
  }

  dbUpdate(update) {
    if (update === null) {
      update = {};
    }

    this.values = {};
    for (let y = 0; y < blockSize; y++)
      for (let x = 0; x < blockSize; x++) {
        this.values[[ x, y ]] =
            update[[ x, y ]] ||
            mapDefault(this.x * blockSize + x, this.y * blockSize + y);
      }

    Promise
        .race([
          new Promise((res, rej) => { setTimeout(rej, 100); }),
          game.resources.getTilesheet("res/tiles.png")
              .then(this.drawTiles.bind(this))
              .catch(() => { this.drawText("Failed", "#800"); })
              .then(() => {
                game.chunkManager.publishEvent("update", this);
                return true;
              })
        ])
        .catch(() => {
          this.drawText("Loading...", "#000");
          game.chunkManager.publishEvent("update", this);
        });
  }

  drawTiles(tiles) {
    for (let y = 0; y < blockSize; y++)
      for (let x = 0; x < blockSize; x++) {
        let val = this.values[[ x, y ]]['value'];
        game.resources.drawTile(tiles, val, this.ctx, x * tileSize,
                                y * tileSize);
      }
    game.chunkManager.publishEvent("update", this);
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
    const def = mapDefault(this.x * blockSize + x, this.y * blockSize + y);
    let cur = this.values[[ x, y ]]['value'];
    let next = terrain.GRASS;
    switch (cur) {
    case terrain.WATER:
      next = terrain.SAND;
      break;
    case terrain.SAND:
      next = terrain.GRASS;
      break;
    case terrain.GRASS:
      next = terrain.STONE;
      break;
    case terrain.STONE:
      next = terrain.GOLD;
      break;
    case terrain.GOLD:
      next = terrain.WATER;
      break;
    }
    const ref = this.ref.child(`${x},${y}`);

    if (next.value === def.value)
      ref.remove();
    else
      ref.set({'value' : next});
  }
}
class TerrainDevChunk extends Chunk {
  constructor(x, y) {
    super(x, y);

    const id = this.ctx.createImageData(pixelsPerChunk, pixelsPerChunk);
    const data = id.data;
    for (var x = 0; x < pixelsPerChunk; x++)
      for (var y = 0; y < pixelsPerChunk; y++) {
        let o = (x + y * pixelsPerChunk) * 4;
        let d = mapDefault(this.x * pixelsPerChunk + x,
                           this.y * pixelsPerChunk + y);
        let color = [ 255, 0, 0 ];
        switch (d.value) {
        case terrain.GOLD:
          color = [ 255, 128, 0 ];
          break;
        case terrain.STONE:
          color = [ 128, 128, 128 ];
          break;
        case terrain.SAND:
          color = [ 200, 150, 0 ];
          break;
        case terrain.GRASS:
          color = [ 0, 128, 0 ];
          break;
        case terrain.WATER:
          color = [ 0, 0, 128 ];
          break;
        }
        data[o + 0] = color[0];
        data[o + 1] = color[1];
        data[o + 2] = color[2];
        data[o + 3] = 255;
        // godata[0]=v;
      }
    this.ctx.putImageData(id, 0, 0);
    game.camera.redrawChunk(this);
  }

  unload() { return false; }
}

const ChunkType = FirebaseChunk; //:TerrainDevChunk;

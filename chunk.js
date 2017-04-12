
class Chunk {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.image = document.createElement("canvas");
        this.image.width = pixelsPerChunk;
        this.image.height = pixelsPerChunk;

        this.ctx = this.image.getContext("2d");


        this.ref = firebase.database().ref(`/chunks/${this.x},${this.y}`);
        this.ref.on('value', (v) => {
            this.dbUpdate(v.val());
        });

    }

    dbUpdate(update) {
        if (update === null) {
            update = {};
        }

        this.values = {};
        for (let y = 0; y < blockSize; y++)
            for (let x = 0; x < blockSize; x++) {
                this.values[[x, y]] = update[[x, y]] || mapDefault(this.x * blockSize + x, this.y * blockSize + y);
            }
        this.redraw();
    }


    unload() {
        this.ref.off();
        delete this.image;
    }

    redraw() {
        for (let y = 0; y < blockSize; y++)
            for (let x = 0; x < blockSize; x++) {
                let val = this.values[[x, y]]['value'];
                game.resources.drawTile("tiles.png", val, this.ctx, x * tileSize, y * tileSize);
            }

        game.camera.redrawChunk(this);
    }

    /**
     * Tile x,y was clicked on.
     * @param x
     * @param y
     */
    clicked(x, y) {
        const def = mapDefault(this.x * blockSize + x, this.y * blockSize + y);
        const next = {'value': ((this.values[[x, y]]['value'] || 0) + 1) % 4};
        const ref = this.ref.child(`${x},${y}`);

        if (next.value === def.value)
            ref.remove();
        else
            ref.set(next);
    }
}

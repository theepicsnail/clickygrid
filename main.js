/**
 * Created by snail on 4/9/17.
 */
const tileSize = 32; // 32x32 px per tile
const blockSize = 16; // 8x8 tiles per block
// (px/tile) * (tiles/chunk) = px/chunk
const pixelsPerChunk = tileSize * blockSize;

Math.seedrandom(3);
const noise = new SimplexNoise();

const game = {
    'user': null,
    'camera': null,
    'resources': null,
    'chunkManager': null,
};

function mapDefault(x, y) {
    let val = 0;
    let max = 0, min = 0;

    function step(coordScale, valScale) {
        val += noise.noise2D(x / coordScale, y / coordScale) * valScale;
        max += valScale;
        min -= valScale;
    }

    step(1000, 1);
    step(100, .5);
    step(10, .25);

    val = (val - min) / (max - min);

    let v = 0;
    if (val < .2)
        v = 0; // grey
    else if (val < .4)
        v = 1; // red
    else if (val < .6)
        v = 2; // green
    else
        v = 3; // blue
    return {value: v};
}


document.addEventListener('signed in', (evt) => {
    new Resources();
    new User(evt.detail.user, evt.detail.ref);
    new ChunkManager();
    new Camera();
});

class ChunkManager {
    constructor() {
        if (game.chunkManager) throw new Error("ChunkManager re-initialized");
        game.chunkManager = this;

        this.loadedChunks = {};
    }

    ensureLoadedChunks(chunkLocations) {
        let newInterestingChunks = {};

        chunkLocations.forEach((location) => {
            let c = this.loadedChunks[location];
            if (c) {
                newInterestingChunks[location] = c;
                delete this.loadedChunks[location];
            } else {
                newInterestingChunks[location] = new Chunk(location[0], location[1]);
            }
        });
        for (let id in this.loadedChunks) {
            this.loadedChunks[id].unload();
        }
        this.loadedChunks = newInterestingChunks;
    }

    forEachChunk(cb) {
        for (let c in this.loadedChunks) {
            cb(this.loadedChunks[c]);
        }
    }

    getChunk(x, y) {
        const c = this.loadedChunks[[x, y]];
        if (c) return c;

    }
}

class Chunk {
    constructor(x, y) {
        //console.log("Load chunk", x, y);
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
                game.resources.drawTile("tiles.png", val, 0, this.ctx, x * tileSize, y * tileSize);
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

class User {
    constructor(user, ref) {
        if (game.user)  throw new Error("User re-initialized");
        game.user = this;

        this.user = user;
        this.ref = ref;

        this.setupListeners();
    }

    setupListeners() {
        this.ref.on('value', (v) => {
            v = v.val();
            if (v === null)
                return this.spawn();
            return this.update(v);
        })
    }

    spawn() {
        const spawn = {x:0, y:0};
        const hash = window.location.hash.substr(1);
        if(hash) {
            const args = hash.split(",");
            spawn.x = parseInt(args[0])|0;
            spawn.y = parseInt(args[1])|0;
        }
        this.ref.set(spawn);
    }

    update(details) {
        game.camera.setCenter(details.x, details.y);

    }
}

class Camera {
    constructor() {
        if (game.camera)  throw new Error("Camera re-initialized");
        game.camera = this;
        this.canvas = document.getElementById("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.ctx.font = "30px Arial";
        this.ctx.fillStyle = "white";

        this.controls = new Hammer(this.canvas);

        let last = null;

        this.controls.on("pan press panstart", (e)=>{
            if(last === null) {
                last = e.center;
                return;
            }
            if(e.isFinal) {
                last = null;
                return;
            }
            this.setCenter(this.x - e.center.x + last.x,
                           this.y - e.center.y + last.y);

            last = e.center;
        });
        this.controls.on("tap", (e) => {
            const worldX = e.center.x + this.screenLeft;
            const worldY = e.center.y + this.screenTop;
            const chunkX = Math.floor(worldX / pixelsPerChunk);
            const chunkY = Math.floor(worldY / pixelsPerChunk);
            const tileX = Math.floor((worldX - chunkX * pixelsPerChunk) / tileSize);
            const tileY = Math.floor((worldY - chunkY * pixelsPerChunk) / tileSize);

            console.log("--")
            console.log("WorldX", worldX);
            console.log("ChunkX", chunkX);
            console.log("TileX", tileX);
            const chunk = game.chunkManager.getChunk(chunkX, chunkY);
            chunk.clicked(tileX, tileY);
        });
        window.onresize = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.recomputeCamera();
        };
        window.onresize();
    }

    setCenter(x, y) {
        this.x = x;
        this.y = y;
        this.recomputeCamera();

        if(this.updatingHash)return;
        const T = this;
        this.updatingHash = setTimeout(()=>{
            window.location.hash = `${T.x},${T.y}`;
            delete T.updatingHash;
        },1000);
    }

    recomputeCamera() {
        const w2 = this.canvas.width / 2;
        const h2 = this.canvas.height / 2;
        this.screenLeft = Math.floor(this.x - w2);
        this.screenTop = Math.floor(this.y - h2);
        const screenRight = Math.ceil(this.x + w2);
        const screenBot = Math.ceil(this.y + h2);

        // Expand by 1 so that scrolling already has the next chunk.
        const chunkLeft = Math.floor(this.screenLeft / pixelsPerChunk) -1;
        const chunkTop = Math.floor(this.screenTop / pixelsPerChunk) -1;
        const chunkRight = Math.ceil(screenRight / pixelsPerChunk) + 1;
        const chunkBot = Math.ceil(screenBot / pixelsPerChunk) + 1;

        this.ctx.setTransform(1, 0, 0, 1, -this.screenLeft, -this.screenTop);

        let chunkLocations = [];
        for (let y = chunkTop; y < chunkBot; y++)
            for (let x = chunkLeft; x < chunkRight; x++) {
                chunkLocations.push([x, y]);
            }
        game.chunkManager.ensureLoadedChunks(chunkLocations);
        this.redrawAll();
    }

    redrawAll() {
        // console.log("Redraw");

        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        game.chunkManager.forEachChunk((chunk) => {
            this.redrawChunk(chunk);
        });

    }

    redrawChunk(chunk) {
        const x = chunk.x * pixelsPerChunk;
        const y = chunk.y * pixelsPerChunk;
        this.ctx.beginPath();
        this.ctx.drawImage(chunk.image, x, y);
        this.ctx.rect(x, y, pixelsPerChunk, pixelsPerChunk);
        this.ctx.fillText(`(${chunk.x},${chunk.y})`, x + pixelsPerChunk / 2, y + pixelsPerChunk / 2);
        this.ctx.stroke();
    }
}

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
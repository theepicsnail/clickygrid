define("camera", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
            const chunkX = Math.floor(worldX / pixelsPerChunk);
            const chunkY = Math.floor(worldY / pixelsPerChunk);
            const tileX = Math.floor((worldX - chunkX * pixelsPerChunk) / tileSize);
            const tileY = Math.floor((worldY - chunkY * pixelsPerChunk) / tileSize);
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
    exports.Camera = Camera;
    class Layer {
        constructor() {
            this.canvas = document.createElement("canvas");
            this.canvas.style.imageRendering = "pixelated";
            this.ctx = this.canvas.getContext("2d");
            document.getElementById("layers").appendChild(this.canvas);
            game.camera.subscribe("resize", (width, height) => {
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
            game.chunkManager.loadedChunks.forEach((chunk) => {
                this.redrawChunk(chunk);
            });
        }
        redrawChunk(chunk) {
            const x = chunk.x * pixelsPerChunk;
            const y = chunk.y * pixelsPerChunk;
            this.ctx.font = "20px";
            this.ctx.drawImage(chunk.image, x, y);
            if (game.debug.values.showChunks) {
                this.ctx.beginPath();
                this.ctx.rect(x, y, pixelsPerChunk, pixelsPerChunk);
                this.ctx.fillText(`(${chunk.x},${chunk.y})`, x + pixelsPerChunk / 2, y + pixelsPerChunk / 2);
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
                // make the coords integers.
                x |= 0;
                y |= 0;
                game.debug.values.location = `${x},${y}`;
                if (updating)
                    return;
                updating = true;
                this.updatingHash = setTimeout(() => {
                    window.location.hash = game.debug.values.location;
                    updating = false;
                }, 1000);
            });
        }
    }
});
define("chunk", ["require", "exports", "firebase/app"], function (require, exports, firebase) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
        clicked(x, y) { }
    }
    exports.Chunk = Chunk;
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
                    const key = `${x},${y}`;
                    this.values[key] = update[key] || mapDefault(this.x * blockSize + x, this.y * blockSize + y);
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
                    let val = this.values[`${x},${y}`]['value'];
                    game.resources.drawTile(tiles, val, this.ctx, x * tileSize, y * tileSize);
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
            let cur = this.values[`${x},${y}`]['value'];
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
                ref.set({ 'value': next });
        }
    }
    class TerrainDevChunk extends Chunk {
        constructor(x, y) {
            super(x, y);
            this.render();
        }
        render() {
            const id = this.ctx.createImageData(pixelsPerChunk, pixelsPerChunk);
            const data = id.data;
            for (var x = 0; x < pixelsPerChunk; x++)
                for (var y = 0; y < pixelsPerChunk; y++) {
                    let o = (x + y * pixelsPerChunk) * 4;
                    let d = mapDefault(this.x * pixelsPerChunk + x, this.y * pixelsPerChunk + y);
                    let color = [255, 0, 0];
                    switch (d.value) {
                        case terrain.GOLD:
                            color = [255, 128, 0];
                            break;
                        case terrain.STONE:
                            color = [128, 128, 128];
                            break;
                        case terrain.SAND:
                            color = [200, 150, 0];
                            break;
                        case terrain.GRASS:
                            color = [0, 128, 0];
                            break;
                        case terrain.WATER:
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
            game.camera.redrawChunk(this);
        }
        unload() { return false; }
    }
    exports.ChunkType = FirebaseChunk; //:TerrainDevChunk;
});
define("chunkManager", ["require", "exports", "chunk"], function (require, exports, chunk_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class ChunkManager {
        constructor() {
            if (game.chunkManager)
                throw new Error("ChunkManager re-initialized");
            game.chunkManager = this;
            this.loadedChunks = new Map();
            this.subscriptions = {};
        }
        subscribe(event, handler) {
            this.subscriptions[event] = this.subscribe[event] || [];
            this.subscriptions[event].push(handler);
        }
        publishEvent(event, ...args) {
            (this.subscriptions[event] || []).forEach((cb) => cb(...args));
        }
        /**
         * @param {Set} chunkLocations
         */
        ensureLoadedChunks(chunkLocations) {
            // chunkLocations = all locations we want.
            // loadedChunks = all locations we have.
            this.loadedChunks.forEach((chunk, key) => {
                if (chunkLocations.has(key)) {
                    // we want to keep this chunk, remove its key from the 'locations we
                    // want'
                    chunkLocations.delete(key);
                }
                else {
                    // we don't want this chunk, unload it.
                    if (chunk.unload())
                        this.loadedChunks.delete(key);
                }
            });
            // We're left with chunks we want but didn't have, load them.
            chunkLocations.forEach((loc) => {
                let coords = loc.split(",");
                this.loadedChunks.set(loc, new chunk_1.ChunkType(parseInt(coords[0]), parseInt(coords[1])));
            });
        }
    }
    exports.ChunkManager = ChunkManager;
});
define("controls", ["require", "exports", "hammerjs"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Controls {
        constructor() {
            if (game.controls)
                throw new Error("Controls re-initialized");
            game.controls = this;
            this.mouseLayer = game.camera.topLayer.canvas;
            this.hammer = new Hammer(this.mouseLayer);
            this.setupPinchZoom();
            this.setupWheelZoom();
            this.setupPanning();
            this.setupTap();
        }
        setupPinchZoom() {
            let baseZoom = null;
            this.hammer.get('pinch').set({ enable: true });
            this.hammer.on("pinchstart", () => {
                baseZoom = game.camera.zoom;
            });
            this.hammer.on("pinch", (e) => {
                game.camera.zoom = baseZoom * e.scale;
            });
        }
        setupWheelZoom() {
            this.mouseLayer.addEventListener("mousewheel", this.wheelZoom, false);
            this.mouseLayer.addEventListener("DOMMouseScroll", this.wheelZoom, false);
        }
        wheelZoom(e) {
            const delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
            if (delta > 0)
                game.camera.zoom *= 1.03;
            else
                game.camera.zoom /= 1.03;
        }
        setupPanning() {
            let last = null;
            this.hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });
            this.hammer.on("pan press panstart", (e) => {
                if (last === null) {
                    last = e.center;
                    return;
                }
                if (e.isFinal) {
                    last = null;
                    return;
                }
                let dx = last.x - e.center.x;
                let dy = last.y - e.center.y;
                game.camera.moveCenter(dx / game.camera.zoom, dy / game.camera.zoom);
                last = e.center;
            });
        }
        setupTap() {
            this.hammer.on("tap", (e) => {
                const target = game.camera.screenPointToWorld(e.center.x, e.center.y);
                const chunk = game.chunkManager.loadedChunks.get("" + target.chunk);
                chunk.clicked(target.tile[0], target.tile[1]);
            });
        }
    }
    exports.Controls = Controls;
});
define("debug", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Debug {
        constructor() {
            this.div = document.getElementById("debug");
            this.store_ = new Map();
            this.values = new Proxy(this.store_, this);
            this.toUpdate_ = new Set();
            this.updateRequested_ = false;
        }
        get(target, name, receiver) {
            if (!target.has(name))
                return false;
            return target.get(name).value;
        }
        set(target, name, value, receiver) {
            if (target.has(name)) {
                target.get(name).value = value;
            }
            else {
                target.set(name, { elem: this.createPre(), value: value });
            }
            this.toUpdate_.add(name);
            if (!this.updateRequested_) {
                this.updateRequested_ = true;
                requestAnimationFrame(this.applyChanges.bind(this));
            }
            return true;
        }
        deleteProperty(target, name) {
            if (!target.has(name))
                return false;
            target.get(name).elem.remove();
            target.delete(name);
            return true;
        }
        createPre() {
            const pre = document.createElement("pre");
            this.div.appendChild(pre);
            return pre;
        }
        applyChanges() {
            this.toUpdate_.forEach((v) => {
                const record = this.store_[v];
                record.elem.innerText = `${v}: ${this.store_[v].value}`;
            });
            this.toUpdate_.clear();
            this.updateRequested_ = false;
        }
    }
    exports.Debug = Debug;
});
define("firebase", ["require", "exports", "firebase/app"], function (require, exports, firebase) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const config = {
        apiKey: "AIzaSyChgv4F6sgROm0Lkv2qbMMsLsyXytAkqgk",
        authDomain: "snail-53ef6.firebaseapp.com",
        databaseURL: "https://snail-53ef6.firebaseio.com",
        projectId: "snail-53ef6",
        storageBucket: "snail-53ef6.appspot.com",
        messagingSenderId: "248204123455"
    };
    function initFirebase(onChange) {
        firebase.initializeApp(config);
        firebase.auth().onAuthStateChanged((user) => {
            if (user === null)
                return firebase.auth().signInAnonymously();
            const ref = firebase.database().ref(`users/${user.uid}`);
            if (user.isAnonymous) {
                // Delete anonymous users when they leave.
                ref.onDisconnect().remove();
            }
            onChange(user, ref);
        });
    }
    exports.initFirebase = initFirebase;
    ;
});
define("globals", ["require", "exports", "debug"], function (require, exports, debug_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
        'controls': null,
        'debug': new debug_1.Debug()
    };
    const terrain = {
        WATER: 222,
        SAND: 18,
        GRASS: 0,
        STONE: 1,
        GOLD: 32
    };
    function mapDefault(x, y) {
        let val = 0;
        let max = 0, min = 0;
        function step(coordScale, valScale) {
            val += noise.noise2D(x / coordScale, y / coordScale) * valScale;
            max += valScale;
            min -= valScale;
        }
        var large = 1024;
        var small = 1;
        for (var i = 1; i < 6; i++) {
            step(large, small);
            large /= 3;
            small /= 2;
        }
        // step(10, .25);
        const v = (val - min) / (max - min);
        if (v < .33) {
            return { value: terrain.WATER };
        }
        else if (v < .4) {
            return { value: terrain.SAND };
        }
        else if (v < .6) {
            return { value: terrain.GRASS };
        }
        else {
            // mountain resources
            if (v > .7 && noise.noise2D(x * 2, y * 2) > .5) {
                return { value: terrain.GOLD };
            }
            return { value: terrain.STONE };
        }
    }
});
define("resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Resources {
        constructor() {
            if (game.resources)
                throw new Error("Resources re-initialized");
            game.resources = this;
            this.tilesets = new Map();
        }
        drawTile(tilesheet, tile, ctx, dx, dy) {
            const x = tile % 16;
            const y = (tile - x) / 16;
            ctx.drawImage(tilesheet, x * tileSize, y * tileSize, tileSize, tileSize, dx, dy, tileSize, tileSize);
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
                    }
                    else {
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
    exports.Resources = Resources;
});
define("user", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class User {
        constructor(user, ref) {
            if (game.user)
                throw new Error("User re-initialized");
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
            });
        }
        spawn() {
            const spawn = { x: 0, y: 0 };
            const hash = window.location.hash.substr(1);
            if (hash) {
                const args = hash.split(",");
                spawn.x = parseInt(args[0]) | 0;
                spawn.y = parseInt(args[1]) | 0;
            }
            this.ref.set(spawn);
        }
        update(details) { game.camera.setCenter(details.x, details.y); }
    }
    exports.User = User;
});
define("main", ["require", "exports", "chunkManager", "camera", "controls", "resources", "user", "firebase"], function (require, exports, chunkManager_1, camera_1, controls_1, resources_1, user_1, firebase_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    firebase_1.initFirebase((user, ref) => {
        new resources_1.Resources();
        new user_1.User(user, ref);
        new chunkManager_1.ChunkManager();
        new camera_1.Camera();
        new controls_1.Controls();
    });
});

class Camera {
    constructor() {
        if (game.camera)  throw new Error("Camera re-initialized");
        game.camera = this;
        this.canvas = document.getElementById("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.ctx.font = "30px Arial";
        this.ctx.fillStyle = "white";
        this.zoom = 1;

        this.controls = new Hammer(this.canvas);
        //this.controls.add(new Hammer.Pan());
        //this.controls.add(new Hammer.Pinch());
        //this.controls.add(new Hammer.Tap());
        this.controls.get('pinch').set({enable: true});

        // Pinch and wheel zooming.
        let baseZoom = this.zoom;
        this.controls.on("pinchstart", () => {
            baseZoom = this.zoom;
        });
        this.controls.on("pinch", (e) => {
            this.zoom = baseZoom * e.scale;
            this.recomputeCamera();
        });
        const T = this;

        function wheelZoom(e) {

            const delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));

            if (delta > 0)
                T.zoom *= 1.03;
            else
                T.zoom /= 1.03;
            T.recomputeCamera();
        }

        this.canvas.addEventListener("mousewheel", wheelZoom, false);
        this.canvas.addEventListener("DOMMouseScroll", wheelZoom, false);

        let last = null;

        this.controls.on("pan press panstart", (e) => {
            if (last === null) {
                last = e.center;
                return;
            }
            if (e.isFinal) {
                last = null;
                return;
            }
            this.setCenter(
                this.x + (last.x - e.center.x) / this.zoom,
                this.y + (last.y - e.center.y) / this.zoom);

            last = e.center;
        });
        this.controls.on("tap", (e) => {
            const worldX = e.center.x / this.zoom + this.screenLeft;
            const worldY = e.center.y / this.zoom + this.screenTop;
            const chunkX = Math.floor(worldX / pixelsPerChunk);
            const chunkY = Math.floor(worldY / pixelsPerChunk);
            const tileX = Math.floor((worldX - chunkX * pixelsPerChunk) / tileSize);
            const tileY = Math.floor((worldY - chunkY * pixelsPerChunk) / tileSize);
            const chunk = game.chunkManager.loadedChunks.get(`${chunkX},${chunkY}`);
            chunk.clicked(tileX, tileY);
        });
        window.onresize = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.recomputeCamera();
        };
        window.onresize();
        this.setCenter(0,0);
    }

    setCenter(x, y) {
        this.x = x | 0;
        this.y = y | 0;
        game.debug.values.location = `${this.x},${this.y}`;
        this.recomputeCamera();

        if (this.updatingHash)return;
        const T = this;
        this.updatingHash = setTimeout(() => {
            window.location.hash = `${T.x},${T.y}`;
            delete T.updatingHash;
        }, 1000);
    }

    recomputeCamera() {
        this.zoom = Math.min(4, Math.max(.5, this.zoom));

        const w2 = this.canvas.width / 2;
        const h2 = this.canvas.height / 2;
        this.screenLeft = Math.floor(this.x - w2 / this.zoom);
        this.screenTop = Math.floor(this.y - h2 / this.zoom);
        const screenRight = Math.ceil(this.x + w2 / this.zoom);
        const screenBot = Math.ceil(this.y + h2 / this.zoom);

        // Expand by 1 so that scrolling already has the next chunk.
        const chunkLeft = Math.floor(this.screenLeft / pixelsPerChunk) - 1;
        const chunkTop = Math.floor(this.screenTop / pixelsPerChunk) - 1;
        const chunkRight = Math.ceil(screenRight / pixelsPerChunk) + 1;
        const chunkBot = Math.ceil(screenBot / pixelsPerChunk) + 1;

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(-this.screenLeft, -this.screenTop);

        let chunkLocations = new Set();
        for (let y = chunkTop; y < chunkBot; y++)
            for (let x = chunkLeft; x < chunkRight; x++) {
                chunkLocations.add(`${x},${y}`);
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

        game.chunkManager.loadedChunks.forEach((chunk) => {
            this.redrawChunk(chunk);
        });

    }

    redrawChunk(chunk) {
        const x = chunk.x * pixelsPerChunk;
        const y = chunk.y * pixelsPerChunk;

        this.ctx.drawImage(chunk.image, x, y);

        if(game.debug.values.showChunks) {
            this.ctx.beginPath();
            this.ctx.rect(x, y, pixelsPerChunk, pixelsPerChunk);
            this.ctx.fillText(`(${chunk.x},${chunk.y})`, x + pixelsPerChunk / 2, y + pixelsPerChunk / 2);
            this.ctx.stroke();
        }
    }
}

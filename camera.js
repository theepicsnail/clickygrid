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

        this.controls.on("pan press panstart", (e) => {
            if (last === null) {
                last = e.center;
                return;
            }
            if (e.isFinal) {
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
            const chunk = game.chunkManager.loadedChunks.get(`${chunkX},${chunkY}`);
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

        if (this.updatingHash)return;
        const T = this;
        this.updatingHash = setTimeout(() => {
            window.location.hash = `${T.x},${T.y}`;
            delete T.updatingHash;
        }, 1000);
    }

    recomputeCamera() {
        const w2 = this.canvas.width / 2;
        const h2 = this.canvas.height / 2;
        this.screenLeft = Math.floor(this.x - w2);
        this.screenTop = Math.floor(this.y - h2);
        const screenRight = Math.ceil(this.x + w2);
        const screenBot = Math.ceil(this.y + h2);

        // Expand by 1 so that scrolling already has the next chunk.
        const chunkLeft = Math.floor(this.screenLeft / pixelsPerChunk) - 1;
        const chunkTop = Math.floor(this.screenTop / pixelsPerChunk) - 1;
        const chunkRight = Math.ceil(screenRight / pixelsPerChunk) + 1;
        const chunkBot = Math.ceil(screenBot / pixelsPerChunk) + 1;

        this.ctx.setTransform(1, 0, 0, 1, -this.screenLeft, -this.screenTop);

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
        this.ctx.beginPath();
        this.ctx.drawImage(chunk.image, x, y);
        this.ctx.rect(x, y, pixelsPerChunk, pixelsPerChunk);
        this.ctx.fillText(`(${chunk.x},${chunk.y})`, x + pixelsPerChunk / 2, y + pixelsPerChunk / 2);
        this.ctx.stroke();
    }
}

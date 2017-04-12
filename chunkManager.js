class ChunkManager {
    constructor() {
        if (game.chunkManager) throw new Error("ChunkManager re-initialized");
        game.chunkManager = this;

        this.loadedChunks = new Map();
    }

    /**
     * @param {Set} chunkLocations
     */
    ensureLoadedChunks(chunkLocations) {
        // chunkLocations = all locations we want.
        // loadedChunks = all locations we have.

        this.loadedChunks.forEach((chunk, key) => {
            if (chunkLocations.has(key)) {
                // we want to keep this chunk, remove its key from the 'locations we want'
                chunkLocations.delete(key);
            } else {
                // we don't want this chunk, unload it.
                if(chunk.unload())
                    this.loadedChunks.delete(key);
            }
        });

        // We're left with chunks we want but didn't have, load them.
        chunkLocations.forEach((loc) => {
            let coords = loc.split(",");
            this.loadedChunks.set(loc, new ChunkType(parseInt(coords[0]), parseInt(coords[1])));
        });
    }
}


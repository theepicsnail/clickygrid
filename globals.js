/**
 * Created by snail on 4/11/17.
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



/**
 * Created by snail on 4/11/17.
 */
import { Debug } from "./debug";

export const tileSize = 32;  // 32x32 px per tile
export const blockSize = 16; // 8x8 tiles per block
// (px/tile) * (tiles/chunk) = px/chunk
export const pixelsPerChunk = tileSize * blockSize;

// Provided by simplex-noise
declare class SimplexNoise {
  constructor();
  noise2D(x: number, y: number): number;
}

// Provided by seed-random
(<any>Math).seedrandom(3);

export const noise = new SimplexNoise();

export const game = {
  'user': null,
  'camera': null,
  'resources': null,
  'chunkManager': null,
  'controls': null,
  'layerManager': null,
  'debug': new Debug().getProxyObject()
};

export const terrain = {
  WATER: 222,
  SAND: 18,
  GRASS: 0,
  STONE: 1,
  GOLD: 32
};

export function mapDefault(x, y) {
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

  if (v < .33) { // water
    return { value: terrain.WATER };
  } else if (v < .4) { // beach
    return { value: terrain.SAND };
  } else if (v < .6) { // grass
    return { value: terrain.GRASS };
  } else { // mountain

    // mountain resources
    if (v > .7 && noise.noise2D(x * 2, y * 2) > .5) {
      return { value: terrain.GOLD };
    }

    return { value: terrain.STONE };
  }
}

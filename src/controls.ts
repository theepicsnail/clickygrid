import 'hammerjs';
import { game } from './globals';

export class Controls {
  hammer: HammerManager;
  mouseLayer: HTMLCanvasElement;
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
    this.hammer.on("pinchstart", () => { //
      baseZoom = game.camera.zoom;
    });
    this.hammer.on("pinch", (e) => { //
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

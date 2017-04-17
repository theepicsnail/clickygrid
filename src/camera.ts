import * as globals from './globals';

export class Camera {
  subscriptions: {};
  displayZoom: number;
  displayHeight: number;
  displayWidth: number;
  worldY: number;
  worldX: number;

  constructor() {
    if (globals.game.camera)
      throw new Error("Camera re-initialized");
    globals.game.camera = this;

    this.worldX = 0;
    this.worldY = 0;

    this.displayWidth = 0;
    this.displayHeight = 0;
    this.displayZoom = 1;

    this.subscriptions = {};

    window.onresize =
      () => { this.setSize(window.innerWidth, window.innerHeight); };
    this.setCenter(0, 0);
    setTimeout(window.onresize, 0);
  }

  subscribe(event, handler) {
    this.subscriptions[event] = this.subscriptions[event] || [];
    this.subscriptions[event].push(handler);
  }

  publishEvent(event, ...args) {
    (this.subscriptions[event] || []).forEach((cb) => cb(...args));
  }
  
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
    const chunkX = Math.floor(worldX / globals.pixelsPerChunk);
    const chunkY = Math.floor(worldY / globals.pixelsPerChunk);
    const tileX = Math.floor((worldX - chunkX * globals.pixelsPerChunk) / globals.tileSize);
    const tileY = Math.floor((worldY - chunkY * globals.pixelsPerChunk) / globals.tileSize);
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

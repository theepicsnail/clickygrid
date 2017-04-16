/**
 * Created by snail on 4/11/17.
 */
type DebugEntry = { value: any, elem: HTMLPreElement };
type DebugMap = Map<PropertyKey, DebugEntry>;

export class Debug implements ProxyHandler<DebugMap> {
  updateRequested_: boolean;
  values: DebugMap;
  toUpdate_: Set<PropertyKey>;
  store_: Map<PropertyKey, any>;
  div: HTMLDivElement;

  constructor() {
    this.div = document.getElementById("debug") as HTMLDivElement;
    this.store_ = new Map<PropertyKey, DebugEntry>();
    this.values = new Proxy<DebugMap>(this.store_, this);
    this.toUpdate_ = new Set<PropertyKey>();
    this.updateRequested_ = false;

  }

  get(target: DebugMap, name: PropertyKey, receiver: any) {
    if (!target.has(name))
      return false;
    return target.get(name).value;
  }

  set(target: DebugMap, name: PropertyKey, value: any, receiver: any) {
    if (target.has(name)) {
      target.get(name).value = value;
    } else {
      target.set(name, { elem: this.createPre(), value: value });
    }

    this.toUpdate_.add(name);
    if (!this.updateRequested_) {
      this.updateRequested_ = true;
      requestAnimationFrame(this.applyChanges.bind(this));
    }
    return true;
  }

  deleteProperty(target: DebugMap, name: PropertyKey) {
    if (!target.has(name)) return false;
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

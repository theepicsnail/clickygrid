/**
 * Created by snail on 4/11/17.
 */

class DebugProperties extends Object {
  chunkCount: number;
  showChunks: boolean;
  location: string;
}

type DebugEntry = { value: any, elem: HTMLPreElement };
type DebugMap = Map<PropertyKey, DebugEntry>;

export class Debug implements ProxyHandler<DebugProperties> {
  updateRequested_: boolean;
  toUpdate_: Set<PropertyKey>;
  proxy_: DebugProperties;
  values_: DebugProperties;
  div_: HTMLDivElement;

  constructor() {
    this.div_ = document.getElementById("debug") as HTMLDivElement;
    this.updateRequested_ = false;
    this.toUpdate_ = new Set<PropertyKey>();
    this.values_ = new DebugProperties();
    this.proxy_ = new Proxy<DebugProperties>(this.values_, this);
  }

  getProxyObject(): DebugProperties {
    return this.proxy_;
  }


  get(target: DebugProperties, name: PropertyKey, receiver: any) {
    if (!target.hasOwnProperty(name))
      return false;
    return target[name].value;
  }

  set(target: DebugProperties, name: PropertyKey, value: any, receiver: any) {
    if(target.hasOwnProperty(name)){
      target[name].value = value;
    } else {
      target[name] = { elem: this.createPre(), value: value }
    }
    
    this.toUpdate_.add(name);
    if (!this.updateRequested_) {
      this.updateRequested_ = true;
      requestAnimationFrame(this.applyChanges.bind(this));
    }
    return true;
  }

  deleteProperty(target: DebugProperties, name: PropertyKey) {
    if (!target.hasOwnProperty(name)) return false;
    target[name].elemn.remove();
    delete target[name];
    return true;
  }

  createPre() {
    const pre = document.createElement("pre");
    this.div_.appendChild(pre);
    return pre;
  }

  applyChanges() {
    this.toUpdate_.forEach((v) => {
      const record = this.values_[v];
      record.elem.innerText = `${v}: ${record.value}`;
    });
    this.toUpdate_.clear();
    this.updateRequested_ = false;
  }
}

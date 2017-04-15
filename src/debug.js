/**
 * Created by snail on 4/11/17.
 */
class Debug {
  constructor() {
    this.div = document.getElementById("debug");
    this.store_ = {};
    this.values = new Proxy(this.store_, this);
    this.toUpdate_ = new Set();
    this.updateRequested_ = false;
  }

  get(target, name) {
    if (!target[name])
      return false;
    return target[name].value;
  }

  set(target, name, value) {
    if (target.hasOwnProperty(name)) {
      target[name].value = value;
    } else {
      target[name] = {elem : this.createPre(), value : value};
    }

    this.toUpdate_.add(name);
    if (!this.updateRequested_) {
      this.updateRequested_ = true;
      requestAnimationFrame(this.applyChanges.bind(this));
    }
    return true;
  }

  deleteProperty(target, name) {
    const value = target[name];
    if (!value)
      return false;
    value.elem.remove();
    delete target[name];
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

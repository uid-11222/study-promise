'use strict'; {

const global = Function(`return this`)();

class Prom {

  constructor(executor) {
    executor(arg => this._res(arg), arg => this._rej(arg));
  }

  _then(prom) {
    this._thens = this._thens || [];
    this._thens.push(prom);
  }

  _catch(prom) {
    this._catchs = this._catchs || [];
    this._catchs.push(prom);
  }

  then(thenF, catchF) {
    const prom = Object.create(Prom.prototype);
    if (thenF) {
      prom._thenF = thenF;
      this._then(prom);
    }
    if (catchF) {
      prom._catchF = catchF;
      this._catch(prom);
    }
    return prom;
  }

  catch(catchF) {
    const prom = Object.create(Prom.prototype);
    if (catchF) {
      prom._catchF = catchF;
      this._catch(prom);
    }
    return prom;
  }

  static resolve(value) {
    const prom = Object.create(Prom.prototype);
    prom._res(value);
    return prom;
  }

  static reject(value) {
    const prom = Object.create(Prom.prototype);
    prom._rej(value);
    return prom;
  }

  static all(proms) {
    proms = Array.from(proms);
    if (proms.length === 0) {
      return Prom.resolve([]);
    }
    const prom = Object.create(Prom.prototype);
    prom._value = new Array(proms.length);
    prom._all = proms;
    prom._count = 0;
    for (let i = 0; i < proms.length; ++i) {
      const cur = proms[i];
      cur._then(prom);
      cur._catch(prom);
    }
    return prom;
  }

  static race(proms) {
    proms = Array.from(proms);
    const prom = Object.create(Prom.prototype);
    for (let i = 0; i < proms.length; ++i) {
      const cur = proms[i];
      cur._then(prom);
      cur._catch(prom);
    }
    return prom;
  }

  _res(value) {
    if (`_state` in this) {
      return;
    }
    if (value && typeof value.then === `function`) {
      value.then(arg => this._res(arg), arg => this._rej(arg));
      return;
    }
    this._state = true;
    this._value = value;
    const thens = this._thens;
    if (!thens) {
      return;
    }
    for (let i = 0; i < thens.length; ++i) {
      const cur = thens[i];
      if (cur._all) {
        cur._count++;
        const index = cur._all.indexOf(this);
        cur._all[index] = null;
        cur._value[index] = value;
        if (cur._count === cur._all.length) {
          cur._res(cur._value);
        }
        continue;
      }
      const _thenF = cur._thenF;
      let curValue = value;
      if (_thenF) {
        curValue = _thenF(curValue);
      }
      cur._res(curValue);
    }
  }

}

global.Prom = Prom;

}

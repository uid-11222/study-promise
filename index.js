'use strict'; {

const global = Function(`return this`)();

class Prom {

  constructor(f) {
    f(arg => this._res(arg), arg => this._rej(arg));
  }

  then(thenF, catchF) {
    const prom = Object.create(Prom.prototype);
    if (thenF) {
      this._thens = this._thens || [];
      prom._thenF = thenF;
      this._thens.push(prom);
    }
    if (catchF) {
      this._catchs = this._catchs || [];
      prom._catchF = catchF;
      this._catchs.push(prom);
    }
    return prom;
  }

  catch(catchF) {
    const prom = Object.create(Prom.prototype);
    if (catchF) {
      this._catchs = this._catchs || [];
      prom._catchF = catchF;
      this._catchs.push(prom);
    }
    return prom;
  }

  static resolve(value) {
    const prom = Object.create(Prom.prototype);
    prom._state = true;
    prom._value = value;
    return prom;
  }

  static reject(value) {
    const prom = Object.create(Prom.prototype);
    prom._state = false;
    prom._value = value;
    return prom;
  }

  static all(proms) {
    
  }

}

global.Prom = Prom;

}

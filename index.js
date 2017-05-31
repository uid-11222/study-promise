'use strict';

module.exports = class Prom {

  /**
   * @param {function} executor
   */
  constructor(executor) {
    executor(arg => this._res(arg), arg => this._rej(arg));
  }

  /**
   * @param {function} thenF - resolve callback
   * @param {function} catchF - reject callback
   * @return {!Prom}
   */
  then(thenF, catchF) {
    const prom = Object.create(Prom.prototype);
    if (thenF) {
      prom._thenF = thenF;
      this._thens = this._thens || [];
      this._thens.push(prom);
    }
    if (catchF) {
      prom._catchF = catchF;
      this._catchs = this._catchs || [];
      this._catchs.push(prom);
    }
    return prom;
  }

  /**
   * @param {function} catchF - reject callback
   * @return {!Prom}
   */
  catch(catchF) {
    return this.then(null, catchF);
  }

  /**
   * @param {*} value
   * @return {!Prom} - resolved Prom
   */
  static resolve(value) {
    const prom = Object.create(Prom.prototype);
    prom._res(value);
    return prom;
  }

  /**
   * @param {*} value
   * @return {!Prom} - rejected Prom
   */
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

  /**
   * @param {*} value
   */
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
    const thens = this._thens || [];
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
    const catchs = this._catchs || [];
    for (let i = 0; i < catchs.length; ++i) {
      const cur = catchs[i];
      cur._res(value);
    }
  }

  /**
   * @param {*} value
   */
  _rej(value) {
    if (`_state` in this) {
      return;
    }
    this._state = false;
    this._value = value;
    const catchs = this._catchs || [];
    for (let i = 0; i < catchs.length; ++i) {
      const cur = catchs[i];
      const _catchF = cur._catchF;
      let curValue = value;
      if (_catchF) {
        curValue = _catchF(curValue);
      }
      cur._res(curValue);
    }
    const thens = this._thens || [];
    for (let i = 0; i < thens.length; ++i) {
      const cur = thens[i];
      cur._rej(value);
    }
  }

  /**
   * @return {string}
   */
  toString() {
    if (`_state` in this) {
      const state = this._state ? `` : ` <rejected>`;
      return `Prom {${state} ${this._value} }`;
    }
    return `Prom { <pending> }`;
  }

}

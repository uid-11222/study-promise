'use strict';

const nextTask = require(`next-task`);

let nextJob = null;

class Job {
  constructor() {
    this.proms = [];
  }
  call() {
    nextJob = null;
    let cur;
    while(cur = this.proms.shift()) {
      cur._runReactions();
    }
  }
}

/**
 * @param {!Prom} prom - Prom object for async runing reactions
 */
function enqueueJob(prom) {
  if (!nextJob) {
    nextTask(nextJob = new Job);
  }
  nextJob.proms.push(prom);
}

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
    if (`_state` in this) {
      enqueueJob(this);
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
    if (value === this) {
      return this._rej(new TypeError(`Self resolution`));
    }
    if (value && typeof value.then === `function`) {
      return value.then(arg => this._res(arg), arg => this._rej(arg));
    }
    this._state = true;
    this._value = value;
    this._runReactions();
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
    this._runReactions();
  }

  _runReactions() {
    let [r1, r2] = [this._thens || [], this._catchs || []];
    let handlerName = `_thenF`, action = `_res`;
    let cur;
    if (this._state === false) {
      [r1, r2] = [r2, r1];
      handlerName = `_catchF`;
      action = `_rej`;
    }
    while(cur = r1.shift()) {
      const handler = cur[handlerName];
      let curValue = this._value;
      if (handler) {
        curValue = handler(curValue);
      }
      cur._res(curValue);
    }
    while(cur = r2.shift()) {
      cur[action](this._value);
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

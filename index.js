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
    if (typeof thenF === `function`) {
      prom._thenF = thenF;
    }
    if (typeof catchF === `function`) {
      prom._catchF = catchF;
    }
    this._reactions = this._reactions || [];
    this._reactions.push(prom);
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

  /**
   * @TODO - this method does not work
   */
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

  /**
   * @TODO - this method does not work
   */
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
    enqueueJob(this);
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
    enqueueJob(this);
  }

  _runReactions() {
    const { _reactions = [], _value, _state } = this;
    const handlerName = _state ? `_thenF` : `_catchF`;
    let cur;
    while(cur = _reactions.shift()) {
      const handler = cur[handlerName];
      cur[_state || handler ? `_res` : `_rej`]
        (handler ? handler(_value) : _value);
    }
  }

  /**
   * @return {string}
   */
  inspect() {
    if (`_state` in this) {
      const state = this._state ? `` : ` <rejected>`;
      return `Prom {${state} ${this._value} }`;
    }
    return `Prom { <pending> }`;
  }

  /**
   * @return {string}
   */
  toString() {
    return `[object Prom]`;
  }

}

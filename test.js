'use strict';

const Prom = require(`.`);

const assert = value => {
  if (value !== true) {
    throw new Error(`not a true: ${value}`);
  }
};

const tests = Prom => function() {

  it(`exists`, () => {
    assert(typeof Prom === `function`);
  });

  it(`throw when argument is not a function`, () => {
    try {
      new Prom({});
    } catch(e) {
      return;
    }
    assert(false);
  });

  it(`call executor immediately`, () => {
    const result = {};
    new Prom(() => {
      result.called = true;
    });
    assert(result.called);
  });

  it(`has static "resolve" method`, () => {
    assert(Prom.resolve() instanceof Prom);
  });

  it(`has static "reject" method`, () => {
    assert(Prom.reject() instanceof Prom);
  });

  it(`call "then" callback`, done => {
    const val = 7;
    Prom.resolve(val).then(value => {
      assert(value === val);
      done();
    });
  });

};

describe(`study-promise`, tests(Prom));
describe(`Native Promise`, tests(Promise));

'use strict';

const Prom = require(`.`);
const nextTask = require(`next-task`);
const inspect = require(`util`).inspect;

const assert = value => {
  if (value !== true) {
    throw new Error(`not a true: ${value}`);
  }
};

const tests = Prom => function() {

  /**
   * @return {!Prom} - new Prom with direct resolve and reject methods
   */
  function getP() {
    const obj = {};
    const p = new Prom((res, rej) => {
      obj.res = res;
      obj.rej = rej;
    });
    p.res = obj.res;
    p.rej = obj.rej;
    return p;
  }

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

  it(`call "catch" callback`, done => {
    const val = 7;
    Prom.reject(val).catch(value => {
      assert(value === val);
      done();
    });
  });

  it(`has "pending" in string presentation`, () => {
    assert(inspect(new Prom(() => {})).includes(`pending`));
  });

  it(`has "rejected" in string presentation`, () => {
    assert(inspect(Prom.reject()).includes(`rejected`));
  });

  it(`has value in string presentation`, () => {
    assert(inspect(Prom.resolve(234)).includes(`234`));
  });

  it(`ignore not callable "then" value`, done => {
    const p = Prom.resolve(7).then(8);
    assert(inspect(p).includes(`pending`));
    p.then(() => {
      nextTask(() => {
        assert(inspect(p).includes(7));
        done();
      });
    });
  });

  it(`ignore not callable "catch" value`, done => {
    const p = Prom.reject(7).catch(8);
    assert(inspect(p).includes(`pending`));
    p.catch(() => {
      nextTask(() => {
        assert(inspect(p).includes(`rejected`));
        assert(inspect(p).includes(7));
        done();
      });
    });
  });

  it(`catch resolved self resolution`, done => {
    const p = Prom.resolve(3);
    const g = p.then(p);
    g.then(arg => {
      assert(arg === 3);
      assert(inspect(g).includes(3));
      done();
    });
    assert(inspect(g).includes(`pending`));
  });

  it(`catch rejected self resolution`, done => {
    const p = Prom.reject(3);
    const g = p.catch(p);
    g.catch(arg => {
      assert(arg === 3);
      assert(inspect(g).includes(3));
      assert(inspect(g).includes(`rejected`));
      done();
    });
    assert(inspect(g).includes(`pending`));
  });

  it(`catch then-rejected self resolution`, done => {
    const p = Prom.reject(3);
    const g = p.then(p);
    g.catch(arg => {
      assert(arg === 3);
      assert(inspect(g).includes(3));
      assert(inspect(g).includes(`rejected`));
      done();
    });
    assert(inspect(g).includes(`pending`));
  });

  it(`catch pending self resolution`, done => {
    const p = getP();
    const g = p.then(p);
    g.then(arg => {
      assert(arg === 3);
      assert(inspect(g).includes(3));
      done();
    });
    p.res(3);
    assert(inspect(g).includes(`pending`));
  });

  it(`catch direct self resolution`, done => {
    const p = getP();
    p.catch(arg => {
      assert(arg instanceof TypeError);
      assert(inspect(p).includes(`rejected`));
      done();
    });
    p.res(p);
  });

  it(`catch direct reject self resolution`, done => {
    const p = getP();
    p.catch(arg => {
      assert(arg === p);
      assert(inspect(p).includes(`rejected`));
      done();
    });
    p.rej(p);
  });

  it(`use callback function for async calculating value`, done => {
    const STR = `abcdefg`;
    let value;
    let count = 0;
    const p = getP();
    const g = p.then(arg => {
      value = arg;
      assert(STR === arg);
      nextTask(done);
      count++;
      assert(count === 1);
    }, arg => {
      count++;
      throw new Error;
    });
    p.res(STR);
    p.res();
    p.rej(7);
    assert(inspect(p).includes(STR));
    assert(inspect(g).includes(`pending`));
    assert(value === undefined);
    assert(count === 0);
  });

  it(`catch rejected values`, done => {
    const STR = `abcdefg`;
    let value;
    let count = 0;
    const p = getP();
    const g = p.then(arg => {
      count++;
      throw new Error;
    }, arg => {
      count++;
      value = arg;
      assert(STR === arg);
      nextTask(() => {
        assert(inspect(g).includes(STR));
        assert(!inspect(g).includes(`rejected`));
        done();
      });
      assert(count === 1);
      return arg;
    });
    p.rej(STR);
    p.rej(STR);
    p.res();
    assert(inspect(p).includes(STR));
    assert(inspect(p).includes(`rejected`));
    assert(inspect(g).includes(`pending`));
    assert(value === undefined);
    assert(count === 0);
  });

  it(`not catch rejected values`, done => {
    const STR = `abcdefg`;
    let value;
    let count = 0;
    const p = getP();
    const g = p.then(arg => {
      count++;
      throw new Error;
    });
    p.rej(STR);
    p.rej(STR);
    p.res();
    g.catch(arg => {
      count++;
      value = arg;
      assert(arg === STR);
      assert(inspect(g).includes(`rejected`));
      assert(count === 1);
      done();
    });
    assert(inspect(p).includes(STR));
    assert(inspect(p).includes(`rejected`));
    assert(inspect(g).includes(`pending`));
    assert(value === undefined);
    assert(count === 0);
  });

  it(`not catch resolved values`, done => {
    const STR = `abcdefg`;
    let value;
    let count = 0;
    const p = getP();
    const g = p.catch(arg => {
      count++;
      throw new Error;
    });
    p.res(STR);
    p.rej(STR);
    p.res();
    g.then(arg => {
      count++;
      value = arg;
      assert(arg === STR);
      assert(!inspect(g).includes(`rejected`));
      assert(inspect(g).includes(STR));
      assert(count === 1);
      done();
    });
    assert(inspect(p).includes(STR));
    assert(!inspect(p).includes(`rejected`));
    assert(inspect(g).includes(`pending`));
    assert(value === undefined);
    assert(count === 0);
  });

};

describe(`study-promise`, tests(Prom));
describe(`Native Promise`, tests(Promise));

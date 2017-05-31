'use strict';

const Prom = require(`.`);

const assert = value => {
  if (value !== true) {
    throw new Error(`not a true: ${value}`);
  }
};

describe(`study-promise`, function() {

  it(`exists`, () => {
    assert(typeof Prom === `function`);
  });

});

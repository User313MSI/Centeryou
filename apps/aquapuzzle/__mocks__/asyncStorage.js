const store = {};
module.exports = {
  setItem: jest.fn(async (k, v) => { store[k] = v; }),
  getItem: jest.fn(async (k) => store[k] ?? null),
};

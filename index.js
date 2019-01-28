const Sdk = require('./lib/Sdk');

function Codefresh(config) {
  const sdk = new Sdk(config);
  return new Proxy({}, {
    get(target, prop) {
      return sdk.resolve(prop)
    }
  });
}

module.exports = Codefresh;



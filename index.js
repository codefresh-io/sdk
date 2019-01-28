const Sdk = require('./lib/Sdk');
const {propertyCollector} = require('./helpers');

function Codefresh(config) {
  const sdk = new Sdk(config);
  return new Proxy({}, {
    get(target, prop) {
      return sdk.resolve(prop)
    }
  });
}

module.exports = Codefresh;



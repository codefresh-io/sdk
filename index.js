const Sdk = require('./lib/Sdk');
const {propertyCollector} = require('./helpers');

function Codefresh(config) {
  const sdk = new Sdk(config);
  return propertyCollector(sdk.resolve.bind(sdk));
}

module.exports = Codefresh;



const propertyCollector = (handler) => {
  const path = [];
  return new Proxy(handler, {
    get(target, p, receiver) {
      path.push(p);
      return receiver;
    },
    apply(target, thisArg, argArray) {
      const result = target(path.join('.'), argArray);
      path.length = 0;
      return result;
    }
  });
};

module.exports = {
  propertyCollector
};

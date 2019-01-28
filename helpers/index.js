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

const resourceProxy = (clientHandler, logicHandler, resourceName) => {
  const methods = {};
  return new Proxy({}, {
    get(target, p) {
      const path = `${resourceName}.${p}`;
      const logicResource = logicHandler(path);
      if (logicResource) {
        return logicResource;
      }
      let method = methods[p];
      if (!method) {
        method = methodProxy(clientHandler, path);
        methods[p] = method;
      }
      return method;
    }
  });
};

const methodProxy = (handler, path) => {
  return new Proxy(handler, {
    apply(target, thisArg, argArray) {
      return target(path, argArray);
    }
  });
};

module.exports = {
  propertyCollector,
  resourceProxy,
  methodProxy,
};

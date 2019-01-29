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
    resourceProxy,
    methodProxy,
};

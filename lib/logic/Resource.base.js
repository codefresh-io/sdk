class ResourceBase {
    constructor(sdk) {
        this.sdk = sdk;
    }

    toString() {
        const proto = Object.getPrototypeOf(this);
        const props = Object.getOwnPropertyNames(proto)
            .filter(p => p !== 'constructor')
            .map(p => `${p}()`);
        return `${proto.constructor.name}: [ ${props.join(', ')} ]`;
    }
}

module.exports = ResourceBase;

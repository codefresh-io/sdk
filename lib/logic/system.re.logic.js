const _ = require('lodash');
const Resource = require('./base');

const TYPES = {
    plan: 'PlanRuntimeEnvironment',
    system: 'SystemRuntimeEnvironment',
    account: 'AccountRuntimeEnvironment',
};


class SystemRuntimeEnvs extends Resource {
    get(options) {
        const type = this.resolveType(options.name);

        if (type === TYPES.system) {
            return this.sdk.sysRuntimeEnvs.getSysRe(options);
        }
        return this.sdk.sysRuntimeEnvs.get(options);
    }

    getAll(options) {
        if (options.account) {
            return this.sdk.sysRuntimeEnvs.getByAccount(options);
        }
        return this.sdk.sysRuntimeEnvs.getAll(options);
    }

    update(options, body) {
        const type = this.resolveType(options.name);

        if (type === TYPES.system) {
            return this.sdk.sysRuntimeEnvs.updateSysRe(options, body);
        }
        return this.sdk.sysRuntimeEnvs.update(options, body);
    }

    delete(options) {
        const type = this.resolveType(options.name);

        if (type === TYPES.system) {
            return this.sdk.sysRuntimeEnvs.deleteSysRe(options);
        }
        return this.sdk.sysRuntimeEnvs.delete(options);
    }

    setDefault(options) {
        if (options.account) {
            return this.sdk.sysRuntimeEnvs.setDefaultForAccount(options);
        }
        return this.sdk.sysRuntimeEnvs.setDefault(options);
    }


    resolveType(name) {
        if (!name) {
            return null;
        }
        if (name.startsWith('system/plan')) {
            return TYPES.plan;
        }
        if (name.startsWith('system/')) {
            return TYPES.system;
        }
        return TYPES.account;
    }

    types() {
        return _.cloneDeep(TYPES);
    }
}

module.exports = SystemRuntimeEnvs;

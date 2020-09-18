const jsonConfig = require('../../../config.json');

const configMap = {};

const expectedConfigKeys = [
    'corsOrigin',
    'port',
    'mongodbConnectionString',
    'logLevel'
];

expectedConfigKeys.forEach(k => {
    const v = process.env[`PCB_${k}`];

    if(!!!v) {
        if (k in jsonConfig && !!jsonConfig[k]) {
            configMap[k] = jsonConfig[k];
        } else {
            throw new Error(`Missing ${k} key/value in config.json!`);
        }
    } else {
        configMap[k] = v;
    }
});

module.exports = configMap;
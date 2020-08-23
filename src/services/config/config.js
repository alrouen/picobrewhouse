const jsonConfig = require('../../../config.json');

const configMap = {};

const expectedConfigKeys = [
    'corsOrigin',
    'port',
    'mongodbConnectionString',
    'logLevel'
];

expectedConfigKeys.forEach(k => {
    if (k in jsonConfig && !!jsonConfig[k]) {
        configMap[k] = jsonConfig[k];
    } else {
        throw new Error(`Missing ${k} key/value in config.json!`);
    }
});

module.exports = configMap;
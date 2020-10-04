const jsonConfig = window.global; // global from global.js, stored in public folder, and loaded in index.html

const configuration = {};

const expectedConfigKeys = [
    'picoBrewHouseApiEndPoint',
];

expectedConfigKeys.forEach(k => {
    if (k in jsonConfig && !!jsonConfig[k]) {
        configuration[k] = jsonConfig[k];
    } else {
        throw new Error(`Missing ${k} key/value in global.js!`);
    }
});

export default configuration;
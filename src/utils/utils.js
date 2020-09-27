const moment = require('moment');

const randomString = (length = 20, chars = '0123456789abcdefghijklmnopqrstuvwxyz') => {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

 // (32 °F − 32) × 5/9 = 0 °C
const fahrenheitToCelcius = (f) => ((f-32)*0.555556).toFixed(3);

// 1 PSI = 68,9476 mBar ( or hPa)
const psiTomBar = (psi) => (psi*68.9476).toFixed(3);

// compute, in seconds, the remaing time between now and expected duration since start date
const remainingSec = (start, duration) => {

    if(!!!start || !!!duration) {
        return 31536000; // 1 year of seconds... why ? because it's a lot.
    }
    return (moment(start).add(duration, 'days').unix() - moment().unix());
}

module.exports = { randomString, fahrenheitToCelcius, psiTomBar, remainingSec };
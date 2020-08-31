
const randomString = (length = 20, chars = '0123456789abcdefghijklmnopqrstuvwxyz') => {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

 // (32 °F − 32) × 5/9 = 0 °C
const fahrenheitToCelcius = (f) => (f-32)*0.555556;

// 1 PSI = 68,9476 mBar ( or hPa)
const psiTomBar = (psi) => psi*68.9476;

module.exports = { randomString, fahrenheitToCelcius, psiTomBar };

const randomString = (length = 20, chars = '0123456789abcdefghijklmnopqrstuvwxyz') => {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

module.exports = { randomString };
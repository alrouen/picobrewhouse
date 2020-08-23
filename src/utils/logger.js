const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;
const { logLevel } = require('../services/config/config');

const formatter = printf(({ level, message, label, timestamp }) => {
    //return `${timestamp} [${label}] ${level}: ${message}`;
    return `[${label}] | [${timestamp}] | ${level}: ${message}`;
});

const level = logLevel;
const getLogger = (label) => createLogger({
    level,
    format: combine(
        format.label({ label: label }),
        timestamp(),
        formatter
    ),
    transports: [new transports.Console()]
});

module.exports = { getLogger };


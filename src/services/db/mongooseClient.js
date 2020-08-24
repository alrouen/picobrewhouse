const mongoose = require('mongoose');
const { getLogger } = require('../../utils/logger');
const config = require('../config/config');

const logger = getLogger('MONGOOSE-CLIENT');

let mongooseInstance = null;

const mongooseOptions = {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
    retryWrites: false // required by CosmoDB,
};

module.exports = async () => {
    if (!!!mongooseInstance) {
        mongooseInstance = await mongoose.connect(config.mongodbConnectionString, mongooseOptions);
        logger.info("Connected to MongoDB with Mongoose");
    } else {
        logger.error("Already connected to MongoDB with Mongoose");
    }
    return mongooseInstance.connection;
};
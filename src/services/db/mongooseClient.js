const mongoose = require('mongoose');
const config = require('../config/config');

let mongooseInstance = null;

const mongooseOptions = {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    retryWrites: false // required by CosmoDB
};

module.exports = async () => {
    if (!!!mongooseInstance) {
        mongooseInstance = await mongoose.connect(config.mongodbConnectionString, mongooseOptions);
        console.log("Connected to MongoDB with Mongoose");
    } else {
        console.log("Already connected to MongoDB with Mongoose");
    }
    return mongooseInstance.connection;
};
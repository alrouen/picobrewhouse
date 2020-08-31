const mongoose = require('mongoose');
const { BaseModel } = require('./baseModel');
const { randomString, fahrenheitToCelcius, psiTomBar } = require('../utils/utils');

const BrewingData = {
    wt: { type: Number, required: true}, // wort temperature
    tt: { type: Number, required: true }, // thermoblock temperature
    s: { type: String, required: true }, // step
    e: String, // event
    err: { type: Number, required: true }, // error
    t: { type: Number, required: true }, // timeleft
    ss: { type: Number, required: true }, // shutScale
    _ts: { type: Number, required: true } // unix timestamp
};

const FermentationData = {
    t: { type: Number, required: true }, // temperature
    p: { type: Number, required: true }, // pressure
    _ts: { type: Number, required: true } // unix timestamp
};

const TimeSeriesSchema = {
    sessionId:{ type: mongoose.ObjectId, required: true },
    t:{ type: String, required: true }, // data type
    dt:{ type: Date, required: true }, // date time group
    first: { type: Number, required: true }, // unix timestamp of first record
    last: { type: Number, required: true }, // unix timestamp of last record
};

const BrewingTimeSeriesSchema = {
    ...TimeSeriesSchema,
    samples:[BrewingData]
};

const FermentationTimeSeriesSchema = {
    ...TimeSeriesSchema,
    samples:[FermentationData]
};

class Timeseries extends BaseModel {
    constructor(schema, dataType) {
        super({modelName:'TimeSeries', schema, collectionName: 'timeseries'});
        this.dataType = dataType;
    }
}

class BrewingTimeseries extends TimeSeries {
    constructor() {
        super({schema: BrewingTimeSeriesSchema, dataType:"brewing"});
    }
}
class FermentationTimeSeries extends Timeseries {
    constructor() {
        super({schema: FermentationTimeSeriesSchema, dataType:"fermenting"});
    }
}

module.exports = { BrewingTimeseries, FermentationTimeSeries };


// Inspired by : https://www.mongodb.com/blog/post/time-series-data-and-mongodb-part-2-schema-design-best-practices
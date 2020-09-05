const mongoose = require('mongoose');
const moment = require('moment');
const { BaseModel } = require('./baseModel');
const { fahrenheitToCelcius, psiTomBar } = require('../utils/utils');

const DataPointsPerDocument = 4;

const BaseData = {
    _ts: { type: Number, required: true } // unix timestamp
};

const BrewingData = {
    wt: { type: Number, required: true}, // wort temperature
    tt: { type: Number, required: true }, // thermoblock temperature
    s: { type: String, required: true }, // step
    e: String, // event
    err: { type: Number, required: true }, // error
    t: { type: Number, required: true }, // timeleft
    ss: { type: Number, required: true }, // shutScale
    ...BaseData
};

const FermentationData = {
    t: { type: Number, required: true }, // temperature
    p: { type: Number, required: true }, // pressure
    v: { type: Number, required: true }, // voltage
    ...BaseData
};

const TimeSeriesSchema = {
    sessionId:{ type: mongoose.ObjectId, required: true },
    t:{ type: String, required: true }, // data type
    dt:{ type: Date, required: true }, // date time group
    nbs: { type: Number, required: true }, // number of samples
    first: { type: Number, required: true }, // unix timestamp of first record
    last: { type: Number, required: true }, // unix timestamp of last record
};

const BrewingTimeSeriesSchema = {
    ...TimeSeriesSchema,
    data:[BrewingData]
};

const FermentationTimeSeriesSchema = {
    ...TimeSeriesSchema,
    data:[FermentationData]
};

class Timeseries extends BaseModel {
    constructor({schema, dataType}) {
        super({modelName:dataType, schema, collectionName: 'timeseries'});
        this.dataType = dataType;
    }

    async _addRecord(sessionId, dt, payload) {
        return this._model.findOneAndUpdate(
            {sessionId, dt, t:this.dataType, nbs: {$lt: DataPointsPerDocument}},
            {
                $push: { data: payload},
                $min: { first: payload._ts },
                $max: { last: payload._ts },
                $inc: { nbs: 1}
            },
            {new: true, upsert: true}
        );
    }

    //$setOnInsert: { dt, t:this.dataType, sessionId },
}

class BrewingTimeseries extends Timeseries {
    constructor() {
        super({schema: BrewingTimeSeriesSchema, dataType:"brewing"});
    }

    buildResolver(model, modelTC) {
        this.queries = {
            brewingTSById: modelTC.getResolver('findById'),
        }
        this.mutations = {};
    }

    async addBrewingData(sessionId, {wt, tt, s, e = "", err, t, ss}) {
        const payload = {
            wt:fahrenheitToCelcius(wt),
            tt:fahrenheitToCelcius(tt),
            s, e, err, t, ss,
            _ts:moment().valueOf()
        };
        const dt = moment().startOf('minute').toDate(); // group data per minutes
        return this._addRecord(sessionId, dt, payload);
    }
}
class FermentationTimeSeries extends Timeseries {
    constructor() {
        super({schema: FermentationTimeSeriesSchema, dataType:"fermenting"});
    }

    buildResolver(model, modelTC) {
        this.queries = {
            fermentingTSById: modelTC.getResolver('findById'),
        }
        this.mutations = {};
    }

    async addFermentationData(sessionId, {t, p, v}) {
        const payload = {
            t:fahrenheitToCelcius(t),
            p:psiTomBar(p),
            v,
            _ts:moment().valueOf()
        };
        const dt = moment().startOf('day').toDate(); // group data per day
        return this._addRecord(sessionId, dt, payload);
    }
}

module.exports = { Timeseries, BrewingTimeseries, FermentationTimeSeries };


// Inspired by : https://www.mongodb.com/blog/post/time-series-data-and-mongodb-part-2-schema-design-best-practices
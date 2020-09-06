const mongoose = require('mongoose');
const moment = require('moment');
const { BaseModel } = require('./baseModel');
const { fahrenheitToCelcius, psiTomBar } = require('../utils/utils');

const DataPointsPerDocument = 100;

const BaseData = {
    _id: false, // no _id for sub document
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

    async _addRecord(sessionId, dt, data) {
        return this._model.findOneAndUpdate(
            {sessionId, dt, t:this.dataType, nbs: {$lt: DataPointsPerDocument}},
            {
                $push: { data },
                $min: { first: data._ts },
                $max: { last: data._ts },
                $inc: { nbs: 1 }
            },
            {new: true, upsert: true}
        );
    }
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

    _timeStamp() {
        return moment().unix();
    }

    async addBrewingData(sessionId, {wt, tt, s, e = "", err, t, ss}) {
        const dt = moment().startOf('minute').toDate(); // group data per minutes
        const data = {
            wt:fahrenheitToCelcius(wt),
            tt:fahrenheitToCelcius(tt),
            s, e, err, t, ss,
            _ts:this._timeStamp()
        };
        return this._addRecord(sessionId, dt, data);
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

    _timeStamp(index, rate) {
        // Data points are sent every hour, but collected every "n" minutes (rate)
        // So seconds precision is enough for the timestamps
        return moment().subtract(60-(index*rate), 'minutes').unix();
    }

    async addLastHourFermentationData(sessionId, rate, voltage, lastHourData) {
        const dt = moment().startOf('day').toDate(); // group data per day

        const lastHourDataNormalized = lastHourData.map((d, i) => ({
                t:fahrenheitToCelcius(d.s1),
                p:psiTomBar(d.s2),
                v:voltage, // Voltage measure is only done once per hour
                _ts:this._timeStamp(i, rate)
            })
        );

        return lastHourDataNormalized.map(async d => await this._addRecord(sessionId, dt, d));
    }
}

module.exports = { Timeseries, BrewingTimeseries, FermentationTimeSeries };

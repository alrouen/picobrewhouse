const mongoose = require('mongoose');
const { createAudit, AuditSchemaDef } = require('./mixins/audit');
const { PicoSessionState, PicoSessionType, findDictKeyByValue } = require('./picoDictionnary');
const { BaseModel } = require('./baseModel');
const { randomString, fahrenheitToCelcius } = require('../utils/utils');

const BrewingDataset = {
    wortTemperature: { type: Number, required: true},
    thermoblockTemperature: { type: Number, required: true },
    step: { type: String, required: true },
    event: String,
    error: { type: Number, required: true },
    timeLeft: { type: Number, required: true },
    shutScale: { type: Number, required: true },
    ts: { type: Date, required: true }
};

const FermentationDataset = {
    temperature: { type: Number, required: true },
    pressure: { type: Number, required: true },
    ts: { type: Date, required: true }
};

const BrewingParameters = {
    fermentationDuration:{ type: Number, default:6 },
    startOfFermentation:{ type: Date },
    coldCrashingDuration: { type: Number, default:1 },
    startOfColdCrashing: { type: Date },
    carbonatingDuration: { type: Number, default:14 },
    startOfCarbonating: { type: Date },
};

const PicoSessionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sessionType: { type: String, enum: Object.keys(PicoSessionType) },
    sessionId: { type: String, unique: true},
    recipeId: mongoose.ObjectId,
    brewerId: { type: mongoose.ObjectId, required: true },
    status: { type: String, enum: Object.values(PicoSessionState), default:PicoSessionState.Idle },
    brewingParameters: BrewingParameters,
    brewingLog: [BrewingDataset],
    fermentationLog: [FermentationDataset],
    ...AuditSchemaDef,
});

class PicoSession extends BaseModel {
    constructor() {
        super({modelName: 'Picosessions', schema: PicoSessionSchema, collectionName: 'picosessions'});
    }

    buildResolver(model, modelTC) {

        const renameSession = (model, id, newName) => model.findOneAndUpdate({_id: id}, {$set: { name:newName, "audit.updatedAt": new Date()}}, {new: true});
        const renameOutputTypeName = `RenameOneById${modelTC.getTypeName()}Payload`;
        const renameOutputType = modelTC.schemaComposer.getOrCreateOTC(renameOutputTypeName, (t) => {
            t.addFields({
                recordId: {
                    type: 'MongoID',
                    description: 'document ID',
                }
            });
        });

        modelTC.addResolver({
            name: 'renameOneById',
            type: renameOutputType,
            args: { _id: 'MongoID!', newName: 'String' },
            resolve: async ({ source, args, context, info }) => {
                return renameSession(model, args._id, args.newName)
                    .then(() => ({recordId: args._id}));
            }
        });

        /**
         * query { picoSessionMany {name, sessionType, sessionId, brewerId, brewingStatus, recipeId, brewingLog{wortTemperature, thermoblockTemperature, step, shutScale, ts, timeLeft, event, error} , audit{createdAt, updatedAt}}}
         */

        this.queries = {
            picoSessionById: modelTC.getResolver('findById'),
            picoSessionOne: modelTC.getResolver('findOne'),
            picoSessionMany: modelTC.getResolver('findMany')
        }
        this.mutations = {
            picoSessionRenameOne:modelTC.getResolver('renameOneById'),
            picoSessionRemoveById: modelTC.getResolver('removeById')
        };
    }

    async createSession(brewerId, sessionType) {
        let audit = createAudit();
        let doc = new this._model({
            name:sessionType,
            sessionType,
            sessionId:randomString(),
            brewerId,
            audit
        });
        return doc.save();
    }

    async getById(id) {
        return this._model.findById(id);
    }

    async endSessionOfBrewerId(brewerId) {
        return this._model.updateMany(
            { brewerId, brewingStatus: { $ne : PicoBrewingSessionState.Finished }},
            { brewingStatus: PicoBrewingSessionState.Finished }
        );
    }

    async addBrewingDataSet({brewerId, sessionType, sessionId, wortTemperature, thermoblockTemperature, step, event = null, error, timeLeft, shutScale}) {
        let dataset = {
            wortTemperature:fahrenheitToCelcius(wortTemperature),
            thermoblockTemperature:fahrenheitToCelcius(thermoblockTemperature),
            step,
            error,
            timeLeft,
            shutScale,
            ts:new Date()
        }
        if(!!event) {
            dataset.event = event;
        }

        return this._model.findOneAndUpdate(
            {brewerId, sessionType, sessionId},
            {$push: { brewingLog: dataset}, $set: { brewingStatus: PicoBrewingSessionState.Brewing, "audit.updatedAt": new Date() } },
            {new: true}
        );

    }

    /*async addFermentationDataSet({picoFermId, }) {

    }*/
}



module.exports = PicoSession
const mongoose = require('mongoose');
const moment = require('moment');
const { createAudit, AuditSchemaDef } = require('./mixins/audit');
const { PicoSessionType } = require('./picoDictionnary');
const { PicoSessionState, getNextStatus } = require('./sessionMachine');
const { BaseModel } = require('./baseModel');
const { RecordNotFound } = require('../apiException');
const { randomString } = require('../utils/utils');

const BrewingParameters = {
    fermentationDuration:{ type: Number, default:6 },
    startOfFermentation:{ type: Date },
    coldCrashingDuration: { type: Number, default:1 },
    startOfColdCrashing: { type: Date },
    carbonatingDuration: { type: Number, default:14 },
    startOfCarbonating: { type: Date },
};

const StatusHistory = {
    _id: false,
    event: { type: String, required: true },
    previousState: { type: String, required: true },
    eventDate: { type: Date, required: true },
}

const PicoSessionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sessionType: { type: String, enum: Object.keys(PicoSessionType) },
    sessionId: { type: String, unique: true},
    recipeId: mongoose.ObjectId,
    brewerId: { type: mongoose.ObjectId, required: true },
    status: { type: String, enum: Object.values(PicoSessionState), default:PicoSessionState.Idle },
    statusHistory: [StatusHistory],
    brewingParameters: BrewingParameters,
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

    async getById(id) {
        return this._model.findById(id).then(s => {
            if(!!!s) throw new RecordNotFound();
            return s;
        });
    }

    async getBySessionId(sessionId) {
        return this._model.findOne({sessionId}).then(s => {
            if(!!!s) throw new RecordNotFound();
            return s;
        });
    }

    async getBySessionIdAndBrewerId(sessionId, brewerId) {
        return this._model.findOne({sessionId, brewerId}).then(s => {
            if(!!!s) throw new RecordNotFound();
            return s;
        });
    }

    async getByBrewerAndSessionStatus(brewerId, status) {
        return this._model.findOne({brewerId, status}).then(s => {
            if(!!!s) throw new RecordNotFound();
            return s;
        });
    }

    async createSession(brewerId, sessionType) {
        let audit = createAudit();
        let doc = new this._model({
            name:`${sessionType} ${moment().format('YYYY-MM-DD HH:mm')}`,
            sessionType,
            sessionId:randomString(),
            brewerId,
            statusHistory:[],
            audit
        });
        return doc.save();
    }

    async updateSessionStatus(sessionId, brewerId, event) {
        return this.getBySessionIdAndBrewerId(sessionId, brewerId)
            .then(s => {
                const currentState = s.currentState;
                const { carbonatingDuration, coldCrashingDuration, fermentationDuration,
                    startOfCarbonating, startOfColdCrashing, startOfFermentation } = s.brewingParameters;

                // compute, in seconds, the remaing time between now and expected duration since start date
                const remainingSec = (start, duration) => {

                    if(!!!start || !!!duration) {
                        return 31536000; // 1 year of seconds... why ? because it's a lot.
                    }
                    return (moment(start).add(duration, 'days').unix() - moment().unix());
                }

                const fermentingRemainingSec = remainingSec(startOfFermentation, fermentationDuration);
                const coldCrashingRemainingSec = remainingSec(startOfColdCrashing, coldCrashingDuration);
                const carbonatingRemainingSec = remainingSec(startOfCarbonating, carbonatingDuration);

                const nextState = getNextStatus(event, { currentState, fermentingRemainingSec, coldCrashingRemainingSec, carbonatingRemainingSec });

                if(currentState === nextState) return Promise.resolve(s);

                return this._model.updateOne(
                    { _id:id },
                    {
                        status:nextState,
                        $push: { statusHistory: { event, previousState: currentState, eventDate:new Date() }},
                        "audit.updatedAt": new Date()
                    }
                );
            });
    }
}

module.exports = PicoSession

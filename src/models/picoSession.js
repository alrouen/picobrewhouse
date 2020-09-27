const mongoose = require('mongoose');
const moment = require('moment');
const { EnumTypeComposer } = require('graphql-compose');
const { ForbiddenError } = require('apollo-server-hapi')
const { createAudit, AuditSchemaDef } = require('./mixins/audit');
const { PicoSessionType } = require('./picoDictionnary');
const { PicoSessionState, PicoSessionEvent, getNextState } = require('./sessionMachine');
const { BaseModel } = require('./baseModel');
const { RecordNotFound } = require('../apiException');
const { randomString, remainingSec } = require('../utils/utils');

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
    picoSessionId: { type: String, index: { unique: true } },
    recipeId: mongoose.ObjectId,
    brewerId: { type: mongoose.ObjectId, required: true },
    status: { type: String, enum: Object.values(PicoSessionState), default:PicoSessionState.Idle },
    statusHistory: [StatusHistory],
    brewingParameters: BrewingParameters,
    ...AuditSchemaDef,
});

const getSessionNextState = (session, newEvent) => {
    const currentState = session.status;
    const { carbonatingDuration, coldCrashingDuration, fermentationDuration,
        startOfCarbonating, startOfColdCrashing, startOfFermentation } = session.brewingParameters;

    const fermentingRemainingSec = remainingSec(startOfFermentation, fermentationDuration);
    const coldCrashingRemainingSec = remainingSec(startOfColdCrashing, coldCrashingDuration);
    const carbonatingRemainingSec = remainingSec(startOfCarbonating, carbonatingDuration);

    const nextState = getNextState(newEvent, { currentState, fermentingRemainingSec, coldCrashingRemainingSec, carbonatingRemainingSec });
    return {previousState:currentState, nextState};
};

const updateSessionStatus = (model, sessionId, event, previousState, nextState) => {
    return model.updateOne(
        { _id:sessionId },
        {
            status:nextState,
            $push: { statusHistory: { event, previousState: previousState, eventDate:new Date() }},
            "audit.updatedAt": new Date()
        }
    )
}

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

        const setNewEvent = (model, id, event) => {
            return model.findById(id).then(s => {
                if(!!!s) throw new ForbiddenError("invalid session");
                const { previousState, nextState } = getSessionNextState(s, event);

                if(previousState === nextState) throw new ForbiddenError("invalid event");
                return updateSessionStatus(model, id, event, previousState, nextState).then(_ => nextState);
            })
        };

        const sendEventOutputTypeName = `SendEventById${modelTC.getTypeName()}Payload`;
        const sendEventOutputType = modelTC.schemaComposer.getOrCreateOTC(sendEventOutputTypeName, (t) => {
            t.addFields({
                recordId: {
                    type: 'MongoID',
                    description: 'document ID',
                },
                newState: {
                    type: 'String',
                    description: 'new session state'
                }
            });
        });

        modelTC.schemaComposer.getOrCreateITC(`SendEventById${modelTC.getTypeName()}Enum`, (t) => {
            t.addFields({
                event:EnumTypeComposer.create( `enum SessionEvent {
                    START_BREWING 
                    START_MANUALBREW 
                    START_DEEPCLEAN 
                    START_SOUSVIDE 
                    START_COLDBREW 
                    START_FERMENTING 
                    START_COLDCRASHING
                    END_SESSION
                    CANCEL_SESSION
                }`, modelTC.schemaComposer)
            })
        });

        modelTC.addResolver({
            name:'sendEventById',
            type: sendEventOutputType,
            args: { _id: 'MongoID!', event: 'SessionEvent!'},
            resolve: async ({ source, args, context, info }) => {
                return setNewEvent(model, args._id, args.event)
                    .then((newState) => ({recordId: args._id, newState: newState}))
            }
        });


        /**
         * query { picoSessionMany {name, sessionType, picoSessionId, brewerId, brewingStatus, recipeId, brewingLog{wortTemperature, thermoblockTemperature, step, shutScale, ts, timeLeft, event, error} , audit{createdAt, updatedAt}}}
         */

        this.queries = {
            picoSessionById: modelTC.getResolver('findById'),
            picoSessionOne: modelTC.getResolver('findOne'),
            picoSessionMany: modelTC.getResolver('findMany'),
        }
        this.mutations = {
            picoSessionRenameOne:modelTC.getResolver('renameOneById'),
            picoSessionRemoveById: modelTC.getResolver('removeById'),
            picoSessionSendEventBy: modelTC.getResolver('sendEventById')
        };
    }

    async getById(id) {
        return this._model.findById(id).then(s => {
            if(!!!s) throw new RecordNotFound();
            return s;
        });
    }

    async getByPicoSessionId(picoSessionId) {
        return this._model.findOne({picoSessionId}).then(s => {
            if(!!!s) throw new RecordNotFound();
            return s;
        });
    }

    async getByPicoSessionIdAndBrewerId(picoSessionId, brewerId) {
        return this._model.findOne({picoSessionId, brewerId}).then(s => {
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
            picoSessionId:randomString(),
            brewerId,
            statusHistory:[],
            audit
        });
        return doc.save();
    }

    async updateSessionStatusByPicoSessionAndBrewerId(picoSessionId, brewerId, event) {
        return this.getByPicoSessionIdAndBrewerId(picoSessionId, brewerId)
            .then(s => {
                const { previousState, nextState } = getSessionNextState(s, event);
                if(previousState === nextState) return Promise.resolve(previousState);
                return updateSessionStatus(this._model, s._id, event, previousState, nextState).then(_ => nextState);
            });
    }
}

module.exports = PicoSession;

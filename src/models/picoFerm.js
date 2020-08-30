const mongoose = require('mongoose');
const { createAudit, AuditSchemaDef } = require('./mixins/audit');
const { PicoFermState, findDictKeyByValue } = require('./picoDictionnary');
const { RecordNotFound } = require('../apiException');
const { BaseModel } = require('./baseModel');

const PicoFermSchema = new mongoose.Schema({
    name: { type: String, required: true },
    serialNumber: { type: String, required: true, index: { unique: true } },
    firmwareVersion: { type: String, default:'' },
    picoSessionId: mongoose.ObjectId,
    currentState: { type: String, default: PicoFermState.NothingTodo },
    ...AuditSchemaDef,
});

class PicoFerm extends BaseModel {
    constructor() {
        super({ modelName: 'PicoFerms', schema: PicoFermSchema, collectionName: 'picoferms'});
    }

    buildResolver(model, modelTC) {

        const renameDevice = (model, id, newName) => model.findOneAndUpdate(
            {_id: id},
            {$set: { name:newName, "audit.updatedAt": new Date()}},
            {new: true}
        );
        const outputTypeName = `RenameOneById${modelTC.getTypeName()}Payload`;
        const outputType = modelTC.schemaComposer.getOrCreateOTC(outputTypeName, (t) => {
            t.addFields({
                recordId: {
                    type: 'MongoID',
                    description: 'document ID',
                }
            });
        });

        modelTC.addResolver({
            name: 'renameOneById',
            type: outputType,
            args: { _id: 'MongoID!', newName: 'String' },
            resolve: async ({ source, args, context, info }) => {
                return renameDevice(model, args._id, args.newName)
                    .then(() => ({recordId: args._id}));
            }
        });

        const assignDeviceToSession = (model, id, sessionId) => model.findOneAndUpdate(
            {_id:id},
            {$set: {picoSessionId: sessionId}},
            {new: true}
        )

        const unassignDeviceToSession = (model, id) => model.findOneAndUpdate(
            {_id:id},
            {$unset: {picoSessionId: 1}},
            {new: true}
        )

        const assignOneToSessionByIdOutName = `AssignOneToSessionById${modelTC.getTypeName()}Payload`;
        const unassignOneToSessionByIdOutName = `UnAssignOneToSessionById${modelTC.getTypeName()}Payload`;
        const assignOneToSessionByIdOutType = modelTC.schemaComposer.getOrCreateOTC(assignOneToSessionByIdOutName, (t) => {
            t.addFields({
                recordId: {
                    type: 'MongoID',
                    description: 'document ID',
                },
                record: {
                    type: modelTC,
                    description: 'document',
                },
            });
        });
        const unassignOneToSessionByIdOutType = modelTC.schemaComposer.getOrCreateOTC(unassignOneToSessionByIdOutName, (t) => {
            t.addFields({
                recordId: {
                    type: 'MongoID',
                    description: 'document ID',
                },
                record: {
                    type: modelTC,
                    description: 'document',
                },
            });
        });

        modelTC.addResolver({
            name: 'AssignOneToSessionById',
            type: outputType,
            args: { _id: 'MongoID!', sessionId: 'MongoID!' },
            resolve: async ({ source, args, context, info }) => {
                return assignDeviceToSession(model, args._id, args.sessionId)
                    .then(r => ({recordId: args._id, record: r}));
            }
        });

        modelTC.addResolver({
            name: 'UnAssignOneToSessionById',
            type: outputType,
            args: { _id: 'MongoID!' },
            resolve: async ({ source, args, context, info }) => {
                return unassignDeviceToSession(model, args._id)
                    .then(r => ({recordId: args._id, record: r}));
            }
        });

        this.queries = {
            picoFermById: modelTC.getResolver('findById'),
            picoFermOne: modelTC.getResolver('findOne'),
            picoFermMany: modelTC.getResolver('findMany')
        }
        this.mutations = {
            picoFermRenameOne:modelTC.getResolver('renameOneById'),
            picoFermRemoveById: modelTC.getResolver('removeById'),
            picoFermAssignToSessionById: modelTC.getResolver('AssignOneToSessionById'),
            picoFermUnAssignToSessionById: modelTC.getResolver('UnAssignOneToSessionById')
        };
    }

    async create(serialNumber) {
        let audit = createAudit();
        let doc = new this._model({name:serialNumber, serialNumber: serialNumber, audit});
        return this._model.findOneAndUpdate({serialNumber},
            {$setOnInsert: doc},
            { new: true, upsert: true }// Make this update into an upsert
        );
    }

    async getDeviceBySerialNumber(serialNumber) {
        return this._model.findOne({serialNumber}).then(r => {
            if(!!!r) throw new RecordNotFound();
            return r;
        });
    }

    async updateStateById(id, newState) {
        return this._model.findOneAndUpdate(
            {_id:id},
            {$set: {currentState:newState, "audit.updatedAt": new Date() }},
            {new:true}
        );
    }

    async updateFirmwareVersionBySerialNumber(serialNumber, firmwareVersion) {
        return this._model.findOneAndUpdate(
            {serialNumber, firmwareVersion: { $ne: firmwareVersion}},
            {$set: {firmwareVersion:firmwareVersion, "audit.updatedAt": new Date() }},
            {new:true}
        );
    }
}

module.exports = PicoFerm;


const mongoose = require('mongoose');
const { createAudit, AuditSchemaDef } = require('./mixins/audit');
const { PicoFermState, findDictKeyByValue } = require('./picoDictionnary');
const { BaseModel } = require('./baseModel');

const PicoFermSchema = new mongoose.Schema({
    name: { type: String, required: true },
    serialNumber: { type: String, required: true, index: { unique: true } },
    firmwareVersion: { type: String, default:'' },
    currentState: { type: String, default: findDictKeyByValue(PicoFermState, PicoFermState.NothingTodo) },
    ...AuditSchemaDef,
});

class PicoFerm extends BaseModel {
    constructor() {
        super({ modelName: 'PicoFerms', schema: PicoFermSchema, collectionName: 'picoferms'});
    }

    buildResolver(model, modelTC) {

        const renameDevice = (model, id, newName) => model.findOneAndUpdate({_id: id}, {$set: { name:newName, "audit.updatedAt": new Date()}}, {new: true});
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

        this.queries = {
            picoFermById: modelTC.getResolver('findById'),
            picoFermOne: modelTC.getResolver('findOne'),
            picoFermMany: modelTC.getResolver('findMany')
        }
        this.mutations = {
            picoFermRenameOne:modelTC.getResolver('renameOneById'),
            picoFermRemoveById: modelTC.getResolver('removeById')
        };
    }

    async create(serialNumber) {
        let audit = createAudit();
        let doc = new this._model({name:serialNumber, serialNumber: serialNumber, audit});
        return this._model.findOneAndUpdate({serialNumber}, {$setOnInsert: doc}, {
            new: true,
            upsert: true // Make this update into an upsert
        });
    }

    async updateState(serialNumber, newState) {
        return this._model.findOneAndUpdate(
            {serialNumber},
            {$set: {currentState:newState, "audit.updatedAt": new Date() }},
            {new:true}
        );
    }

    async updateFirmwareVersion(serialNumber, firmwareVersion) {
        return this._model.findOneAndUpdate(
            {serialNumber, firmwareVersion: { $ne: firmwareVersion}},
            {$set: {firmwareVersion:firmwareVersion, "audit.updatedAt": new Date() }},
            {new:true}
        );
    }
}

module.exports = PicoFerm;


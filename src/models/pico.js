const mongoose = require('mongoose');
const { createAudit, AuditSchemaDef } = require('./mixins/audit');
const { PicoState } = require('./picoDictionnary');
const { BaseModel } = require('./baseModel');

const PicoSchema = new mongoose.Schema({
    name: { type: String, required: true },
    serialNumber: { type: String, required: true, index: { unique: true } },
    firmwareVersion: { type: String, default:'' },
    currentState: { type: String, default: PicoState.Ready },
    errorLog: [{ error: String, date: Date, acknowledged: { type: Boolean, default: false } }],
    ...AuditSchemaDef,
});

class Pico extends BaseModel {
    constructor() {
        super({ modelName: 'Picos', schema: PicoSchema, collectionName: 'picos'});
    }

    buildResolver(model, modelTC) {

        const renameDevice = (model, id, newName) => model.findOneAndUpdate({_id: id}, {$set: { name:newName, "audit.updatedAt": new Date()}}, {new: true});
        const outputTypeName = `RenameOneById${modelTC.getTypeName()}Payload`;
        const outputType = modelTC.schemaComposer.getOrCreateOTC(outputTypeName, (t) => {
            t.addFields({
                recordId: {
                    type: 'MongoID',
                    description: 'Removed document ID',
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
            },
        });

        /**
         * query {picoById(_id:"5f424bb2d64dba856d54dd6b"){name, serialNumber, audit{createdAt, updatedAt}, _id}}
         * query {picoOne(filter:{name:"myPico"}){name, serialNumber, audit{createdAt, updatedAt}, _id}}
         * query { picoMany {name, serialNumber, firmwareVersion, currentState, errorLog{error, date, acknowledged}, audit{createdAt, updatedAt}, _id} }
         */

        this.queries = {
            picoById: modelTC.getResolver('findById'),
            picoOne: modelTC.getResolver('findOne'),
            picoMany: modelTC.getResolver('findMany')
        }

        /**
         * mutation { picoRenameOne(_id:"5f4266db30877e949d1949ef", newName:"myPico"){recordId}}
         * mutation {picoFermRemoveById(_id:"5f42478d04be6780fe18c9e4") {recordId} }
         */

        this.mutations = {
            picoRenameOne:modelTC.getResolver('renameOneById'),
            picoRemoveById: modelTC.getResolver('removeById')
        };
    }

    async create(serialNumber) {
        let audit = createAudit();
        let doc = new this._model({name:serialNumber, serialNumber: serialNumber, audit});
        return this._model.findOneAndUpdate(
        {serialNumber},
        { $setOnInsert: doc },
        { new: true, upsert: true }
        );
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

    async addError(serialNumber, error) {
        return this._model.findOneAndUpdate(
        {serialNumber},
        {$push: {errorLog: {error, date:new Date()}}, $set: { "audit.updatedAt": new Date() }},
        {new: true}
        )
    }

}

module.exports = Pico;


const mongoose = require('mongoose');
const { createAudit, AuditSchemaDef } = require('./mixins/audit');
const { BaseModel } = require('./baseModel');

const PicoFermSchema = new mongoose.Schema({
    name: { type: String, required: true },
    serialNumber: { type: String, required: true, index: { unique: true } },
    ...AuditSchemaDef,
});

const onCreation = next => async rp => {
    rp.beforeRecordMutate = function(doc, rp) {
        doc.audit = createAudit();
        return doc;
    }
    return next(rp)
};

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
                    description: 'Removed document ID',
                }
            });
        });

        modelTC.addResolver({
            name: 'renameOneById',
            type: outputType,
            args: { _id: 'MongoID!', newName: 'String' },
            resolve: async ({ source, args, context, info }) => {
                return renameDevice(model, args._id, newName);
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
}

module.exports = PicoFerm;


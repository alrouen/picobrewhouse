const mongoose = require('mongoose');
const { createAudit, AuditSchemaDef } = require('./mixins/audit');
const { BaseModel } = require('./baseModel');

const PicoFermSchema = new mongoose.Schema({
    name: { type: String, required: true },
    serialNumber: { type: String, required: true },
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
        this.queries = {
            picoFermById: modelTC.getResolver('findById')
        }
        this.mutations = {
            picoFermCreateOne: modelTC.getResolver('createOne').wrapResolve(onCreation),
            picoFermRemoveById: modelTC.getResolver('removeById')
        };
    }
}

module.exports = PicoFerm;


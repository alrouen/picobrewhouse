const mongoose = require('mongoose');
const { createAudit, AuditSchemaDef } = require('./mixins/audit');
const { BaseModel } = require('./baseModel');

const PicoSchema = new mongoose.Schema({
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

class Pico extends BaseModel {
    constructor() {
        super({ modelName: 'Picos', schema: PicoSchema, collectionName: 'picos'});
    }

    buildResolver(model, modelTC) {
        this.queries = {
            picoById: modelTC.getResolver('findById')
        }
        this.mutations = {
            picoCreateOne: modelTC.getResolver('createOne').wrapResolve(onCreation),
            picoRemoveById: modelTC.getResolver('removeById')
        };
    }

    async test() {
        return this._model.findOne({_id:"5f424bb2d64dba856d54dd6b"});
    }
}

module.exports = Pico;


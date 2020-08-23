const mongoose = require('mongoose');
const { createAudit, AuditSchemaDef } = require('./mixins/audit');
const { PicoState } = require('./picoDictionnary');
const { BaseModel } = require('./baseModel');

const PicoSessionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brewingLog: {},
    fermentationLog: {},
    ...AuditSchemaDef,
});

class PicoSession extends BaseModel {
    constructor() {
        super({modelName: 'Picosessions', schema: PicoSessionSchema, collectionName: 'Picosessions'});
    }
}

module.exports = PicoSession
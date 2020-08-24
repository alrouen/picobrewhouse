const mongoose = require('mongoose');
const { createAudit, AuditSchemaDef } = require('./mixins/audit');
const { PicoSessionState } = require('./picoDictionnary');
const { BaseModel } = require('./baseModel');

const PicoSessionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sessionId: { type: String, unique: true},
    recipeId: mongoose.ObjectId,
    brewerId: { type: mongoose.ObjectId, required: true },
    fermentationMonitoring: mongoose.ObjectId,
    status: { type: String, enum: Object.values(PicoSessionState), default: PicoSessionState.Designing },
    brewingLog: [],
    fermentationLog: [],
    ...AuditSchemaDef,
});

const onCreation = next => async rp => {
    rp.beforeRecordMutate = function(doc, rp) {
        const userId = rp.context.user.id;
        doc.audit = createAudit(userId);
        doc.owner = userId;
        return doc;
    }
    return next(rp)
};

class PicoSession extends BaseModel {
    constructor() {
        super({modelName: 'Picosessions', schema: PicoSessionSchema, collectionName: 'Picosessions'});
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

        this.queries = {
            picoSessionById: modelTC.getResolver('findById'),
            picoSessionOne: modelTC.getResolver('findOne'),
            picoSessionMany: modelTC.getResolver('findMany')
        }
        this.mutations = {
            picoSessionCreateOne:modelTC.getResolver('createOne').wrapResolve(onCreation),
            picoSessionRenameOne:modelTC.getResolver('renameOneById'),
            picoSessionRemoveById: modelTC.getResolver('removeById')
        };
    }
}

module.exports = PicoSession
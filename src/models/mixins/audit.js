const AuditSchemaDef = {
    audit:{
        createdAt:{ type: Date },
        updatedAt:{ type: Date }
    }
}

const createAudit = () => ({
    createdAt: new Date(),
    updatedAt: new Date(),
});

const updateAudit = () => ({
    updatedAt: new Date(),
});


module.exports = { AuditSchemaDef, createAudit, updateAudit };
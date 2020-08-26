const { Machine } = require('xstate');
const moment = require('moment');

const {} = require('./picoDictionnary');

const canArchive = (context, event, condMeta) => {
    return isAdminAndNotOwner(context.role, context.isOwner);
};

const validationMachine = Machine({
    id:'sessionProcess',
    initial:'NewSession',
    context:{},
    states:{
        NewSession:{},
        Brewing:{},
        DeepClean:{},
        SousVide:{},
        ColdBrew:{},
        ManualBrew:{}
    },
    on: {}
});

const getNextStatus = (event, {currentStatus, pastEvents, isOwner, role, ai4euSsoUserId}) => {
    return validationMachine
        .withContext({currentStatus, pastEvents, isOwner, role, ai4euSsoUserId})
        .transition(currentStatus, event).value;
};

module.exports = {};

/***

 const validationMachine = Machine({
    id:'validationProcess',
    initial:'draft',
    context: {
        role:MemberRole.none,
        isOwner:false
    },
    states:{
        draft:{
            on: {
                SUBMIT: [
                    { target:PublicationStatus.submitted, cond: canSubmit },
                    { target: 'notAllowed' }
                ]
            }
        },
        submitted:{
            on: {
                FOR_REVIEW: [
                    { target:PublicationStatus.reviewing, cond: canReview },
                    { target: 'notAllowed' }
                ]
            }
        },
        reviewing:{
            on: {
                ACCEPTED: [
                    { target:PublicationStatus.published, cond: canPublishOrReject },
                    { target: 'notAllowed' }
                ],
                REJECTED: [
                    { target:PublicationStatus.draft, cond: canPublishOrReject },
                    { target: 'notAllowed' }
                ],
                FOR_REVIEW: [
                    { target:PublicationStatus.reviewing, cond: canReAssignReview },
                    { target: 'notAllowed' }
                ]
            }
        },
        published:{
            on: {
                UNPUBLISH: [
                    { target:PublicationStatus.unpublished, cond: canUnpublish },
                    { target: 'notAllowed' }
                ],
            }
        },
        unpublished:{
            on: {
                REPUBLISH: [
                    { target: PublicationStatus.published, cond: canRePublish },
                    { target: 'notAllowed' }
                ]
            }
        },
        archived:{
            on: {
                RESET: [
                    { target: PublicationStatus.draft, cond: canReset },
                    { target: 'notAllowed' }
                ]
            }
        },
        notAllowed:{
            type:'final'
        }
    },
    on: {
        ARCHIVE: [
            { target: PublicationStatus.archived, cond: canArchive },
            { target: 'notAllowed' }
        ]
    }
});

 ***/
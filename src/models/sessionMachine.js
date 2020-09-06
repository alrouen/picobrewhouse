const { Machine } = require('xstate');

const PicoSessionState = {
    Idle:"Idle",
    Brewing:"Brewing",
    Fermenting:"Fermenting",
    ColdCrashing:"ColdCrashing",
    Carbonating:"Carbonating",
    DeepCleaning:"DeepCleaning",
    ColdBrewing:"ColdBrewing",
    SousVideCooking:"SousVideCooking",
    Finished:"Finished"
};

const PicoSessionEvent = {
    START_BREWING:"START_BREWING",
    START_MANUALBREW:"START_MANUALBREW",
    START_DEEPCLEAN:"START_DEEPCLEAN",
    START_SOUSVIDE:"START_SOUSVIDE",
    START_COLDBREW:"START_COLDBREW",
    START_FERMENTING:"START_FERMENTING",
    START_COLDCRASHING:"START_COLDCRASHING",
    START_CARBONATING:"START_CARBONATING",
    END_SESSION:"END_SESSION",
    CANCEL_SESSION:"CANCEL_SESSION",
    DO_NOTHING:"DO_NOTHING"
};

const isFermentingDone = (context, event, condMeta) => {
    return context.fermentingRemainingSec <= 0;
};

const isColdCrashingDone = (context, event, condMeta) => {
    return context.coldCrashingRemainingSec <= 0;
};

const isCarbonatingDone = (context, event, condMeta) => {
    return context.carbonatingRemainingSec <= 0;
};

const sessionMachine = Machine({
    id:'sessionProcess',
    initial:'Idle',
    context:{
        fermentingRemainingSec:0,
        coldCrashingRemainingSec:0,
        carbonatingRemainingSec:0,
    },
    states:{
        Idle:{
            on:{
                START_BREWING:[{target:PicoSessionState.Brewing}],
                START_MANUALBREW:[{target:PicoSessionState.Brewing}],
                START_DEEPCLEAN:[{target:PicoSessionState.DeepCleaning}],
                START_SOUSVIDE:[{target:PicoSessionState.SousVideCooking}],
                START_COLDBREW:[{target:PicoSessionState.ColdBrewing}],
                DO_NOTHING:[{target:PicoSessionState.Idle}]
            }
        },
        Brewing:{
            on:{
                START_FERMENTING:[{target:PicoSessionState.Fermenting}]
            }
        },
        Fermenting:{
            on:{
                START_COLDCRASHING:[
                    {target:PicoSessionState.ColdCrashing, cond: isFermentingDone}
                ],
                START_CARBONATING:[
                    {target:PicoSessionState.Carbonating, cond: isFermentingDone}
                ]
            }
        },
        ColdCrashing:{
            on:{
                START_CARBONATING:[{target:PicoSessionState.Carbonating, cond: isColdCrashingDone}]
            }
        },
        Carbonating:{
            on:{
                END_SESSION:[{target:PicoSessionState.Finished, cond: isCarbonatingDone}]
            }
        },
        DeepCleaning:{
            on:{
                END_SESSION:[{target:PicoSessionState.Finished}]
            }
        },
        ColdBrewing:{
            on:{
                END_SESSION:[{target:PicoSessionState.Finished}]
            }
        },
        SousVideCooking:{
            on:{
                END_SESSION:[{target:PicoSessionState.Finished}]
            }
        },
        Finished:{
            type:'final'
        }
    },
    on: {
        CANCEL_SESSION:[{target:PicoSessionState.Finished}]
    }
});

const getNextStatus = (event, {currentState, fermentingRemainingSec, coldCrashingRemainingSec, carbonatingRemainingSec}) => {
    return sessionMachine
        .withContext({fermentingRemainingSec, coldCrashingRemainingSec, carbonatingRemainingSec})
        .transition(currentState, event).value;
};

module.exports = { PicoSessionState, PicoSessionEvent, getNextStatus };

const PicoRegistration = {
    Registered:`#T#\r\n`,
    NonRegistered:`#F#\r\n`
};

const PicoFirmware = {
    UpdateAvailable:`#T#`,
    NoUpdateAvailable:`#F#`
}

const PicoState = {
    Ready:2,
    Brewing:3,
    SousVide:4,
    RackBeer:5,
    Rinse:6,
    DeepClean:7,
    DeScale:9
};

const PicoRequiredAction = {
    None:`##`,
    DeepClean:`#7#`
};

// 0 = Brewing (never happens since session = 14 alpha-numeric RFID), 1 = Deep Clean, 2 = Sous Vide, 4 = Cold Brew, 5 = Manual Brew

const PicoSessionType = {
    Brewing:0,
    DeepClean:1,
    SousVide:2,
    ColdBrew:4,
    ManualBrew:5
};

const PicoFermRegistration = {
    Registered:`#1#`,
    NonRegistered:`#0#`
};

const PicoFermFirmware = {
    UpdateAvailable:`#1#`,
    NoUpdateAvailable:`#0#`
}

const PicoFermState = {
    NothingTodo:`#2,4#`,
    InProgressSendingData:`#10,0#`,
    InProgressError:`#10,16#`,
    Completed:`#2,16#`
}

const PicoSessionState = {
    Designing:"designing",
    Brewing:"brewing",
    Fermenting:"fermenting",
    ColdCrashing:"coldCrashing",
    Carbonating:"carbonating"
}

const findDictKeyByValue = (obj, value) => Object.keys(obj).find(k => obj[k] === value);

module.exports = {
    PicoRegistration, PicoFirmware, PicoState, PicoSessionType, PicoRequiredAction,
    PicoFermRegistration, PicoFermFirmware, PicoFermState,
    PicoSessionState,
    findDictKeyByValue
}

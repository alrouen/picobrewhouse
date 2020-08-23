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
    Nothing:`##`,
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

const findDictKeyByValue = (obj, value) => Object.keys(obj).find(k => obj[k] === value);

module.exports = { PicoRegistration, PicoFirmware, PicoState, PicoSessionType, findDictKeyByValue }
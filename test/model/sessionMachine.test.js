const chai = require('chai');
const expect = require('chai').expect;

const { getNextStatus, PicoSessionEvent, PicoSessionState } = require('../../src/models/sessionMachine');

chai.config.includeStack = true; // To display error on tests failures

const defaultContext = {
    fermentingRemainingSec:7,
    coldCrashingRemainingSec:1,
    carbonatingRemainingSec:10
};

describe('## Pico Session state machine', () => {
    it('Can start a manual brewing session', () => {
        const context = {
            currentState:PicoSessionState.Idle,
            ...defaultContext
        }
        const nextStatus = getNextStatus(PicoSessionEvent.START_MANUALBREW, context);
        expect(nextStatus).to.equal(PicoSessionState.Brewing);
    });

    it('Can start a brewing session', () => {
        const context = {
            currentState:PicoSessionState.Idle,
            ...defaultContext
        }
        const nextStatus = getNextStatus(PicoSessionEvent.START_BREWING, context);
        expect(nextStatus).to.equal(PicoSessionState.Brewing);
    });

    it('Can start a fermenting after brewing', () => {
        const context = {
            currentState:PicoSessionState.Brewing,
            ...defaultContext
        }
        const nextStatus = getNextStatus(PicoSessionEvent.START_FERMENTING, context);
        expect(nextStatus).to.equal(PicoSessionState.Fermenting);
    });

    it('Can start a cold crashing after fermenting only if fermentation time expired', () => {
        const context = {
            currentState:PicoSessionState.Fermenting,
            ...defaultContext
        }
        expect(getNextStatus(PicoSessionEvent.START_COLDCRASHING, context)).to.equal(PicoSessionState.Fermenting);

        const fermentingDoneContext = {
            ...context,
            fermentingRemainingSec:0
        }
        expect(getNextStatus(PicoSessionEvent.START_COLDCRASHING, fermentingDoneContext)).to.equal(PicoSessionState.ColdCrashing);
    });



    it('Can start a cold brewing session', () => {
        const context = {
            currentState:PicoSessionState.Idle,
            ...defaultContext
        }
        const nextStatus = getNextStatus(PicoSessionEvent.START_COLDBREW, context);
        expect(nextStatus).to.equal(PicoSessionState.ColdBrewing);
    });

    it('Can start a deep cleaning session', () => {
        const context = {
            currentState:PicoSessionState.Idle,
            ...defaultContext
        }
        const nextStatus = getNextStatus(PicoSessionEvent.START_DEEPCLEAN, context);
        expect(nextStatus).to.equal(PicoSessionState.DeepCleaning);
    });

    it('Can start a sous vide session', () => {
        const context = {
            currentState:PicoSessionState.Idle,
            ...defaultContext
        }
        const nextStatus = getNextStatus(PicoSessionEvent.START_SOUSVIDE, context);
        expect(nextStatus).to.equal(PicoSessionState.SousVideCooking);
    });

    it('Cannot start fermenting before a brewing session', () => {
        const context = {
            currentState:PicoSessionState.Idle,
            ...defaultContext
        }
        const nextStatus = getNextStatus(PicoSessionEvent.START_FERMENTING, context);
        expect(nextStatus).to.equal(PicoSessionState.Idle);
    });

    it('Cannot start carbonating before a brewing session', () => {
        const context = {
            currentState:PicoSessionState.Idle,
            ...defaultContext
        }
        const nextStatus = getNextStatus(PicoSessionEvent.START_CARBONATING, context);
        expect(nextStatus).to.equal(PicoSessionState.Idle);
    });

    it('Cannot start cold crashing before a brewing session', () => {
        const context = {
            currentState:PicoSessionState.Idle,
            ...defaultContext
        }
        const nextStatus = getNextStatus(PicoSessionEvent.START_COLDCRASHING, context);
        expect(nextStatus).to.equal(PicoSessionState.Idle);
    });

    it('Can cancel session at any state', () => {
        const context = {
            currentState:PicoSessionState.Idle,
            ...defaultContext
        }
        expect(getNextStatus(PicoSessionEvent.CANCEL_SESSION, context)).to.equal(PicoSessionState.Finished);

        context.currentState = PicoSessionState.Brewing;
        expect(getNextStatus(PicoSessionEvent.CANCEL_SESSION, context)).to.equal(PicoSessionState.Finished);

        context.currentState = PicoSessionState.Finished;
        expect(getNextStatus(PicoSessionEvent.CANCEL_SESSION, context)).to.equal(PicoSessionState.Finished);

        context.currentState = PicoSessionState.SousVideCooking;
        expect(getNextStatus(PicoSessionEvent.CANCEL_SESSION, context)).to.equal(PicoSessionState.Finished);

        context.currentState = PicoSessionState.DeepCleaning;
        expect(getNextStatus(PicoSessionEvent.CANCEL_SESSION, context)).to.equal(PicoSessionState.Finished);

        context.currentState = PicoSessionState.ColdBrewing;
        expect(getNextStatus(PicoSessionEvent.CANCEL_SESSION, context)).to.equal(PicoSessionState.Finished);

        context.currentState = PicoSessionState.ColdCrashing;
        expect(getNextStatus(PicoSessionEvent.CANCEL_SESSION, context)).to.equal(PicoSessionState.Finished);

        context.currentState = PicoSessionState.Carbonating;
        expect(getNextStatus(PicoSessionEvent.CANCEL_SESSION, context)).to.equal(PicoSessionState.Finished);

        context.currentState = PicoSessionState.Fermenting;
        expect(getNextStatus(PicoSessionEvent.CANCEL_SESSION, context)).to.equal(PicoSessionState.Finished);
    });
});
const chai = require('chai');
const expect = require('chai').expect;

const { getNextState, PicoSessionEvent, PicoSessionState } = require('../../src/models/sessionMachine');

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
        const nextStatus = getNextState(PicoSessionEvent.START_MANUALBREW, context);
        expect(nextStatus).to.equal(PicoSessionState.Brewing);
    });

    it('Can start a brewing session', () => {
        const context = {
            currentState:PicoSessionState.Idle,
            ...defaultContext
        }
        const nextStatus = getNextState(PicoSessionEvent.START_BREWING, context);
        expect(nextStatus).to.equal(PicoSessionState.Brewing);
    });

    it('Can start a fermenting after brewing', () => {
        const context = {
            currentState:PicoSessionState.Brewing,
            ...defaultContext
        }
        const nextStatus = getNextState(PicoSessionEvent.START_FERMENTING, context);
        expect(nextStatus).to.equal(PicoSessionState.Fermenting);
    });

    it('Can start a cold crashing after fermenting only if fermentation time expired', () => {
        const context = {
            currentState:PicoSessionState.Fermenting,
            ...defaultContext
        }
        expect(getNextState(PicoSessionEvent.START_COLDCRASHING, context)).to.equal(PicoSessionState.Fermenting);

        const doneContext = {
            ...context,
            fermentingRemainingSec:0
        }
        expect(getNextState(PicoSessionEvent.START_COLDCRASHING, doneContext)).to.equal(PicoSessionState.ColdCrashing);
    });

    it('Can start a carbonating after fermenting only if fermentation time expired', () => {
        const context = {
            currentState:PicoSessionState.Fermenting,
            ...defaultContext
        }
        expect(getNextState(PicoSessionEvent.START_CARBONATING, context)).to.equal(PicoSessionState.Fermenting);

        const doneContext = {
            ...context,
            fermentingRemainingSec:0
        }
        expect(getNextState(PicoSessionEvent.START_CARBONATING, doneContext)).to.equal(PicoSessionState.Carbonating);
    });

    it('Can start a carbonating after cold crashing only if cold crashing time expired', () => {
        const context = {
            currentState:PicoSessionState.ColdCrashing,
            ...defaultContext
        }
        expect(getNextState(PicoSessionEvent.START_CARBONATING, context)).to.equal(PicoSessionState.ColdCrashing);

        const doneContext = {
            ...context,
            coldCrashingRemainingSec:0
        }
        expect(getNextState(PicoSessionEvent.START_CARBONATING, doneContext)).to.equal(PicoSessionState.Carbonating);
    });

    it('Can end session after carbonating only if carbonating time expired', () => {
        const context = {
            currentState:PicoSessionState.Carbonating,
            ...defaultContext
        }
        expect(getNextState(PicoSessionEvent.END_SESSION, context)).to.equal(PicoSessionState.Carbonating);

        const doneContext = {
            ...context,
            carbonatingRemainingSec:0
        }
        expect(getNextState(PicoSessionEvent.END_SESSION, doneContext)).to.equal(PicoSessionState.Finished);
    });

    it('Can start a cold brewing session', () => {
        const context = {
            currentState:PicoSessionState.Idle,
            ...defaultContext
        }
        const nextStatus = getNextState(PicoSessionEvent.START_COLDBREW, context);
        expect(nextStatus).to.equal(PicoSessionState.ColdBrewing);
    });

    it('Can start a deep cleaning session', () => {
        const context = {
            currentState:PicoSessionState.Idle,
            ...defaultContext
        }
        const nextStatus = getNextState(PicoSessionEvent.START_DEEPCLEAN, context);
        expect(nextStatus).to.equal(PicoSessionState.DeepCleaning);
    });

    it('Can start a sous vide session', () => {
        const context = {
            currentState:PicoSessionState.Idle,
            ...defaultContext
        }
        const nextStatus = getNextState(PicoSessionEvent.START_SOUSVIDE, context);
        expect(nextStatus).to.equal(PicoSessionState.SousVideCooking);
    });

    it('Cannot start fermenting before a brewing session', () => {
        const context = {
            currentState:PicoSessionState.Idle,
            ...defaultContext
        }
        const nextStatus = getNextState(PicoSessionEvent.START_FERMENTING, context);
        expect(nextStatus).to.equal(PicoSessionState.Idle);
    });

    it('Cannot start carbonating before a brewing session', () => {
        const context = {
            currentState:PicoSessionState.Idle,
            ...defaultContext
        }
        const nextStatus = getNextState(PicoSessionEvent.START_CARBONATING, context);
        expect(nextStatus).to.equal(PicoSessionState.Idle);
    });

    it('Cannot start cold crashing before a brewing session', () => {
        const context = {
            currentState:PicoSessionState.Idle,
            ...defaultContext
        }
        const nextStatus = getNextState(PicoSessionEvent.START_COLDCRASHING, context);
        expect(nextStatus).to.equal(PicoSessionState.Idle);
    });

    it('Can end session after DeepCleaning, ColdBrewing and SousVideCooking', () => {
        expect(getNextState(PicoSessionEvent.END_SESSION, {currentState:PicoSessionState.DeepCleaning})).to.equal(PicoSessionState.Finished);
        expect(getNextState(PicoSessionEvent.END_SESSION, {currentState:PicoSessionState.ColdBrewing})).to.equal(PicoSessionState.Finished);
        expect(getNextState(PicoSessionEvent.END_SESSION, {currentState:PicoSessionState.SousVideCooking})).to.equal(PicoSessionState.Finished);
    });

    it('Can cancel session at any state', () => {
        const context = {
            currentState:PicoSessionState.Idle,
            ...defaultContext
        }
        expect(getNextState(PicoSessionEvent.CANCEL_SESSION, context)).to.equal(PicoSessionState.Finished);

        context.currentState = PicoSessionState.Brewing;
        expect(getNextState(PicoSessionEvent.CANCEL_SESSION, context)).to.equal(PicoSessionState.Finished);

        context.currentState = PicoSessionState.Finished;
        expect(getNextState(PicoSessionEvent.CANCEL_SESSION, context)).to.equal(PicoSessionState.Finished);

        context.currentState = PicoSessionState.SousVideCooking;
        expect(getNextState(PicoSessionEvent.CANCEL_SESSION, context)).to.equal(PicoSessionState.Finished);

        context.currentState = PicoSessionState.DeepCleaning;
        expect(getNextState(PicoSessionEvent.CANCEL_SESSION, context)).to.equal(PicoSessionState.Finished);

        context.currentState = PicoSessionState.ColdBrewing;
        expect(getNextState(PicoSessionEvent.CANCEL_SESSION, context)).to.equal(PicoSessionState.Finished);

        context.currentState = PicoSessionState.ColdCrashing;
        expect(getNextState(PicoSessionEvent.CANCEL_SESSION, context)).to.equal(PicoSessionState.Finished);

        context.currentState = PicoSessionState.Carbonating;
        expect(getNextState(PicoSessionEvent.CANCEL_SESSION, context)).to.equal(PicoSessionState.Finished);

        context.currentState = PicoSessionState.Fermenting;
        expect(getNextState(PicoSessionEvent.CANCEL_SESSION, context)).to.equal(PicoSessionState.Finished);
    });
});
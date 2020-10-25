import React, { Component } from 'react';

export const PicoSessionContext = React.createContext({
    setCurrentSessionId: () => {},
    getCurrentSessionId: () => {}
});

export class PicoSessionProvider extends Component {
    constructor(props) {
        super(props);
        this._currentPicoSessionId = null;
    }

    setCurrentSessionId(sessionId) {
        console.log(sessionId);
        this._currentPicoSessionId = sessionId;
    }

    getCurrentSessionId() {
        return this._currentPicoSessionId;
    }

    render() {

        console.log("render provider");

        const picoSessionService = {
            setCurrentSessionId: this.setCurrentSessionId.bind(this),
            getCurrentSessionId: this.getCurrentSessionId.bind(this)
        };

        return (
            <PicoSessionContext.Provider value={picoSessionService}>
                {this.props.children}
            </PicoSessionContext.Provider>
        )

    }
}

export const withPicoSessionService = (Component) => {

    console.log("render consumer");

    return function WrapperComponent(props) {
        return (
            <PicoSessionContext.Consumer>
                {({picoSessionService}) => <Component {...props} picoSessionService={picoSessionService} />}
            </PicoSessionContext.Consumer>
        );
    };
}


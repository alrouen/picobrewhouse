import React from 'react';
import { Provider, createClient } from "urql";
import { HashRouter as Router, Route, Switch } from "react-router-dom";
import configuration from "./config";
import './App.scss';

import Home from "./pages/home";

const client = createClient({
   url:configuration.picoBrewHouseApiEndPoint
});

function App() {
    return (
        <div className="app-container">
            <Provider value={client}>
                <Router>
                    <Switch>
                        <Route exact path="/" component={Home} />
                    </Switch>
                </Router>
            </Provider>
        </div>
    );
}

export default App;
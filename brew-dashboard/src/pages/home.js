import React, { Component } from 'react';
import { Container, Divider, Grid, Header } from "semantic-ui-react"
import Sessions from "../components/sessions";
import Fermentation from "../components/fermentation";
import Brewing from "../components/brewing";

class Test extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (<div>Test</div>)
    }
}

export default class Home extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <Container text>
                    <Header textAlign="center" as="h1">PicoBrewHouse</Header>
                </Container>
                <Divider hidden />
                <Container>
                    <Grid>
                        <Grid.Row>
                            <Grid.Column>
                                <Sessions />
                            </Grid.Column>
                        </Grid.Row>
                        <Grid.Row>
                            <Grid.Column>
                                <Brewing />
                            </Grid.Column>
                        </Grid.Row>
                        <Grid.Row>
                            <Grid.Column>
                                <Fermentation />
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </Container>
            </div>
        )
    }
}
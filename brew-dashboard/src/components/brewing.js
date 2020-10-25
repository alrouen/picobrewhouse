import React, { Component } from 'react';
import { useQuery } from "urql";
import moment from "moment";
import { VictoryChart, VictoryLine, VictoryTheme, VictoryAxis, VictoryLabel, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { withPicoSessionService } from "../context/picoSession";

const brewingData = (sessionId) => `
    query {
        brewingTSBySessionId(sessionId:"${sessionId}") {recordId, record {wt, tt, s, e, t, _ts}}
    }
`;

const toStrDate = (t) => {
    const date = moment.unix(t);
    return date.format('DD/MM/YYYY HH:mm');
}

// Each record :
// e: "Waiting Instructions"
// s: "Waiting Instructions"
// t: 0
// tt: 129.445
// wt: 87.778
// __typename: "brewingData"
//_ts:123565

const BrewingChart = (props) => {
    const [res, executeQuery] = useQuery({
        query: brewingData(this.props.currentSessionId),
    });

    if(res.fetching) {
        return <div>Loading...</div>;
    } else {
        if(res.error) {
            console.log(res.error);
            return <div>Error!</div>;
        } else {

            const samples = res.data.brewingTSBySessionId.record;
            console.log(samples);

            return <div>
                <VictoryChart theme={VictoryTheme.material} width={800} height={400} containerComponent={
                    <VictoryVoronoiContainer
                        labels={({ datum }) => `${(datum.tt).toFixed(2)}°C, ${(datum.wt).toFixed(2)} °C\n ${toStrDate(datum._ts)}`}
                    />
                }>

                    <VictoryAxis fixLabelOverlap={true} tickFormat={(t) => toStrDate(t)} label="Date" axisLabelComponent={<VictoryLabel dy={30}/>} />

                    <VictoryAxis dependentAxis label="Temperature (°C)" axisLabelComponent={<VictoryLabel dy={-30}/>}  />
                    <VictoryLine data={samples} x="_ts" y="wt"  style={{ data: { stroke: "blue" } }}/>
                    <VictoryLine data={samples} x="_ts" y="tt" style={{ data: { stroke: "red" } }} />

                </VictoryChart>
            </div>
        }
    }
}

class Brewing extends Component {
    render() {

        console.log(this.props);

        return (
            <div>Session: {this.props.picoSessionService}</div>
        );
    }
}

export default withPicoSessionService(Brewing)
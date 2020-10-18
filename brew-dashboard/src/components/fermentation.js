import React from 'react';
import { useQuery } from "urql";
import moment from "moment";
import { VictoryChart, VictoryLine, VictoryTheme, VictoryAxis, VictoryLabel, VictoryTooltip, VictoryVoronoiContainer } from 'victory';

const fermentationData = `
    query {
        fermentingTSBySessionId(sessionId:"5f789510b9793adcbb51f4f3") { recordId, record { _ts, t, p, v} }
    }
`;

// Array of :  { "_ts": 1601811104, "t": 23.656, "p": 0, "v": 2.68, "__typename": "fermentingData" },

const toStrDate = (t) => {
    const date = moment.unix(t);
    return date.format('DD/MM/YYYY HH:mm');
}

export default () => {

    const [res, executeQuery] = useQuery({
        query: fermentationData,
    });

    if(res.fetching) {
        return <div>Loading...</div>;
    } else {
        if(res.error) {
            console.log(res.error);
            return <div>Error!</div>;
        } else {

            const samples = res.data.fermentingTSBySessionId.record;
            const maxTemp = 40;//Math.max(...samples.map(d => d.t))*1.5;
            const maxPressure = 600;//Math.max(...samples.map(d => d.p))*1.5;
            const minVoltage = Math.min(...samples.map(d => d.v));

            return <div>
                <div><p>Battery voltage: {minVoltage}V</p></div>
                <VictoryChart theme={VictoryTheme.material} width={800} height={400} containerComponent={
                    <VictoryVoronoiContainer
                        labels={({ datum }) => `${(datum.t).toFixed(2)}°C, ${(datum.p).toFixed(2)} mBar\n ${toStrDate(datum._ts)}`}
                    />
                }>
                    <VictoryAxis fixLabelOverlap={true} tickFormat={(t) => toStrDate(t)} label="Date" axisLabelComponent={<VictoryLabel dy={30}/>} />

                    <VictoryAxis dependentAxis label="Temperature (°C)" axisLabelComponent={<VictoryLabel dy={-30}/>} tickValues={[0.25, 0.5, 0.75, 1]} tickFormat={(t) => (t * maxTemp).toFixed(0)} />
                    <VictoryLine data={samples} x="_ts" y={(d) => (d.t / maxTemp)}  style={{ data: { stroke: "blue" } }}/>

                    <VictoryAxis orientation="right" dependentAxis label="Pressure (mBar)" axisLabelComponent={<VictoryLabel dy={30}/>} tickValues={[0.25, 0.5, 0.75, 1]} tickFormat={(t) => (t * maxPressure).toFixed(0)} />
                    <VictoryLine data={samples} x="_ts" y={(d) => d.p / maxPressure} style={{ data: { stroke: "red" } }} />
                </VictoryChart>
            </div>
        }
    }
}

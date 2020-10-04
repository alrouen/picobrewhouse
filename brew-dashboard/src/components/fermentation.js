import React from 'react';
import { useQuery } from "urql";
import ReactDOM from 'react-dom';
import { VictoryChart, VictoryLine, VictoryTheme, VictoryAxis } from 'victory';

const fermentationData = `
    query {
        fermentingTSBySessionId(sessionId:"5f789510b9793adcbb51f4f3") { recordId, record { _ts, t, p, v} }
    }
`;

// Array of :  { "_ts": 1601811104, "t": 23.656, "p": 0, "v": 2.68, "__typename": "fermentingData" },

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

            return <div>
                <VictoryChart theme={VictoryTheme.material} >
                    <VictoryLine data={samples} x="_ts" y="p" style={{ data: { stroke: "red" } }} />
                    <VictoryLine data={samples} x="_ts" y="t" style={{ data: { stroke: "blue" } }}/>
                </VictoryChart>
            </div>
        }
    }
}

/*
{JSON.stringify(
                    res.data.fermentingTSBySessionId.record,
                    null,
                    2
                ) }
 */
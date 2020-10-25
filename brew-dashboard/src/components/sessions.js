import React, { useContext } from 'react';
import { useQuery } from "urql";
import { Dropdown } from 'semantic-ui-react';
import { PicoSessionContext } from "../context/picoSession";

const allSessions = `
    query { 
        picoSessionMany { 
            _id, 
            name, 
            status, 
            statusHistory {event, previousState, eventDate },  
            brewingParameters {startOfFermentation, fermentationDuration }  
        }
    }
`;

/*

{ "picoSessionMany": [
        {
        "_id": "5f5ca92922cdbefb5e424b37",
        "name": "ManualBrew 2020-09-12 10:55",
        "status": "Brewing",
        "statusHistory": [ { "event": "START_BREWING", "previousState": "Idle", "eventDate": "2020-09-12T10:56:35.152Z", "__typename": "PicosessionsStatusHistory" } ],
        "brewingParameters": { "startOfFermentation": null, "fermentationDuration": 6, "__typename": "PicosessionsBrewingParameters" },
        "__typename": "Picosessions"
        },
    { "_id": "5f5cf3f522cdbeac10424b39", "name": "DeepClean 2020-09-12 16:14", "status": "DeepCleaning", "statusHistory": [ { "event": "START_DEEPCLEAN", "previousState": "Idle", "eventDate": "2020-09-12T16:15:34.702Z", "__typename": "PicosessionsStatusHistory" } ], "brewingParameters": { "startOfFermentation": null, "fermentationDuration": 6, "__typename": "PicosessionsBrewingParameters" }, "__typename": "Picosessions" }, { "_id": "5f789510b9793adcbb51f4f3", "name": "ManualBrew 2020-10-03 15:13", "status": "ColdCrashing", "statusHistory": [ { "event": "START_BREWING", "previousState": "Idle", "eventDate": "2020-10-03T15:14:21.359Z", "__typename": "PicosessionsStatusHistory" }, { "event": "START_FERMENTING", "previousState": "Brewing", "eventDate": "2020-10-04T10:14:05.826Z", "__typename": "PicosessionsStatusHistory" }, { "event": "START_COLDCRASHING", "previousState": "Fermenting", "eventDate": "2020-10-13T19:43:30.342Z", "__typename": "PicosessionsStatusHistory" } ], "brewingParameters": { "startOfFermentation": "2020-10-04T10:14:05.825Z", "fermentationDuration": 6, "__typename": "PicosessionsBrewingParameters" }, "__typename": "Picosessions" }
   ]
}


 */

export default () => {
    const picoSessionService = useContext(PicoSessionContext);
    const [res, executeQuery] = useQuery({
        query: allSessions,
    });

    if(res.fetching) {
        return <div>Loading...</div>;
    } else {
        if(res.error) {
            console.log(res.error);
            return <div>Error!</div>;
        } else {

            const sessionOptions = res.data.picoSessionMany.map(s => ({
                key:s._id,
                text:s.name,
                value:s.name
            }));

            if(sessionOptions.length>0 && picoSessionService.getCurrentSessionId()) {
                picoSessionService.setCurrentSessionId(sessionOptions[0].key);
            }

            return <div>
                <Dropdown
                    placeholder='Select Session'
                    fluid
                    selection
                    options={sessionOptions}
                    onChange={(e, {value, options}) => {
                        const { key } = options.find(option => option.value === value);
                        picoSessionService.setCurrentSessionId(key);
                    }}
                />
            </div>
        }
    }
}
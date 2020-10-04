import React from 'react';
import { useQuery } from "urql";

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

export default () => {
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
            return <div>
                {JSON.stringify(
                    res.data,
                    null,
                    2
                ) /* The (_, null, 2) makes JSON.stringify pretty. */}
            </div>
        }
    }
}
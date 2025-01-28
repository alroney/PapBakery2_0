const axios = require('axios');
const urlBase = "https://cloud.seatable.io"; //SeaTable server.
const { fetchStoredToken, storeNewToken } = require('../tokenController');



const fetchNewBaseToken = async () => {
    //Prepare the request to fetch the new base token.
    const url = `${urlBase}/api/v2.1/dtable/app-access-token/`;
    const apiKey = process.env.SEATABLE_API_TOKEN;
    const options = {
        method: 'GET',
        url: url,
        headers: {
            accept: 'application/json',
            authorization: `Bearer ${apiKey}`,
        }
    };

    try {
        const response = await axios(options);
        const { access_token, dtable_uuid } = response.data;
        const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); //2 days.
        const source = "SeaTable";

        return { access_token, dtable_uuid, expiresAt, source };
    }
    catch(error) {
        console.error("(seatableController)(fetchNewBaseToken) Error fetching new base token: ", error);
    }
}



//Function: Fetch and store the base token for the SeaTable API into the Token schema in the MongoDB.
const storeNewBaseToken = async () => {
    //Prepare bulk operations for MongoDB to update the token.
    const { access_token, dtable_uuid, expiresAt, source } = await fetchNewBaseToken();
    const keyPairs = [
        { keyName: "base_token", keyValue: access_token, expiresAt },
        { keyName: "dtable_uuid", keyValue: dtable_uuid, expiresAt: null },
    ];

    //Execute the bulk write.
    try {
        await storeNewToken(keyPairs, source);
        console.log("SeaTable Tokens update successfully.");
    }
    catch(error) {
        console.error("(seatableController)(fetchAndStoreNewBaseToken) Error storing token using bulkWrite: ", error);
    }
}



//Function: Get the base token and UUID from the mongoDB.
const getBaseTokenAndUUID = async () => {
    try{
        const source = "SeaTable";
        const baseToken = await fetchStoredToken(source, "base_token");
        const baseUUID = await fetchStoredToken(source, "dtable_uuid");

        if(baseToken.needsRefresh || baseUUID.needsRefresh) {
            console.log("Refreshing base token and UUID.");
            await storeNewBaseToken();
            return getBaseTokenAndUUID();
        }
        
        return { baseToken: baseToken.keyValue, baseUUID: baseUUID.keyValue };
    }
    catch(error) {
        console.error("(seatableController)(getBaseTokenAndUUID) Error fetching base token and UUID: ", error);
    }
}

module.exports = { fetchStoredToken, getBaseTokenAndUUID };
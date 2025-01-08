const Token = require('../models/tokenSchema'); //Import the SeaTable token model.
const axios = require('axios'); //Axios is a promise-based HTTP client for the browser and Node.js.

const source = "SeaTable"; //Reference for the token.
const urlBase = "https://cloud.seatable.io"; //SeaTable server.
let tablesList = [];

//Function: Fetch Stored Token from Mongo.
const fetchStoredToken = async (keyName) => {
    try {
        const token = await Token.findOne({ source: source, keyName: keyName });
        if(token) {
            if(token.expiresAt === null || token.expiresAt === undefined) {
                console.log(`${source} ${keyName} found.`);
                return token.keyValue;
            }
            else {
                if(new Date() < token.expiresAt) {
                    console.log(`${source} ${keyName} with expiration found and not expired.`);
                    return token.keyValue;
                }
                else {
                    console.log(`${source} ${keyName} found but expired.`);
                    fetchAndStoreNewBaseToken();
                }
            }
        }

        else {
            console.log(`(seatableController)(fetchStoredToken) ${source} ${keyName} not found.`);
            fetchAndStoreNewBaseToken();
        }
    }
    catch(error) {
        console.error("(seatableController)(fetchToken) Error fetching token: ", error);
    }
}


//Function: Fetch and store the base token for the SeaTable API.
const fetchAndStoreNewBaseToken = async (req, res) => {
    const url = `${urlBase}/api/v2.1/dtable/app-access-token/`;
    const apiKey = process.env.SEATABLE_API_TOKEN;
    const options = {
        method: 'GET',
        url: url,
        headers: {
            accept: 'application/json',
            authorization: `Bearer ${apiKey}`,
        }
    }

    try {
        const response = await axios(options);
        const { access_token, dtable_uuid } = response.data;
        const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); //3 days.

        //Prepare bulk operations for MongoDB to update the token.
        const operations = [
            //Upsert the base token.
            {
                updateOne: {
                    filter: { source: source, keyName: "base_token" },
                    update: {
                        $set: {
                            keyValue: access_token,
                            expiresAt: expiresAt,
                        },
                    },
                    upsert: true, //Create if it doesn't exist.
                },
            },
            //Upsert the dtable_uuid.
            {
                updateOne: {
                    filter: { source: source, keyName: "dtable_uuid" },
                    update: {
                        $set: {
                            keyValue: dtable_uuid,
                        },
                    },
                    upsert: true,
                },
            }
        ]

        //Execute the bulk write.
        try {
            await Token.bulkWrite(operations);
            console.log("SeaTable Tokens update successfully.");
        }
        catch(error) {
            console.error("(seatableController)(fetchAndStoreNewBaseToken) Error storing token using bulkWrite: ", error);
        }
    }
    catch(error) {
        console.error("Error fetching data: ", error);
        res.status(500).json({ error: error.message });
    }
}

//Function: Get the base_token value.
const getBaseToken = async () => {
    try {
        const bt = await fetchStoredToken("base_token");
        return bt;
    }
    catch(error) {
        console.error("(seatableController)(getBaseToken) Error fetching base_token: ", error);
    }
}

//Function: Get the base_uuid (also known as dtable_uuid) value.
const getBaseUUID = async () => {
    try {
        const uuid = await fetchStoredToken("dtable_uuid");
        return uuid;
    }
    catch(error) {
        console.error("(seatableController)(getBaseInfo) Error fetching dtable_uuid: ", error);
    }
}


const getBaseInfo = async (req, res) => {
    const baseToken = await getBaseToken();
    const baseUUID = await getBaseUUID();

    console.log("Base UUID: ", baseUUID);

    try {
        const options = {
            method: 'GET',
            url: `${urlBase}/api-gateway/api/v2/dtables/${baseUUID}/`,
            headers: {
                accept: 'application/json',
                authorization: `Bearer ${baseToken}`,
            },
        };

        const response = await axios(options);
        res.status(200).json(response.data);
        return console.log("Successfully fetched base info.");
    }
    catch(error) {
        console.error("(seatableController)(getBaseInfo) Error fetching base info: ", error);
        res.status(500).json({ error: error.message });
    }
}

//Function: Get the metadata of the base. This includes the tables with their columns and views, not the data inside.
const getMetadata = async (req, res) => {
    const baseToken = await getBaseToken();
    const baseUUID = await getBaseUUID();

    try {
        const options = {
            method: 'GET',
            url: `${urlBase}/api-gateway/api/v2/dtables/${baseUUID}/metadata/`,
            headers: {
                accept: 'application/json',
                authorization: `Bearer ${baseToken}`,
            },
        };

        const response = await axios(options);
        console.log("Successfully fetched metadata.");
        tablesList = response.data.metadata.tables;
        return response.data;
    }
    catch(error) {
        console.error("(seatableController)(getMetadata) Error fetching metadata: ", error);
        res.status(500).json({ error: error.message });
    }
}

const getAvailableTables = async (req, res) => {
    let tables = [];
    try {
        if(tablesList.length === 0) {
            const data = await getMetadata();
            tables = data.metadata.tables
            console.log("Fetched tables from database.");
        }
        else {
            tables = tablesList;
            console.log("Using cached tables.");
        }
        
        console.log("Successfully fetched available tables.");
        res.status(200).json({success: true, tables });
    }
    catch(error) {
        console.error("(seatableController)(getAvailableTables) Error fetching available tables: ", error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = { getAvailableTables };
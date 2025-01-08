const Token = require('../models/tokenSchema'); //Import the SeaTable token model.
const axios = require('axios'); //Axios is a promise-based HTTP client for the browser and Node.js.

const source = "SeaTable"; //Reference for the token.
const urlBase = "https://cloud.seatable.io"; //SeaTable server.

let cachedBaseInfo = {};
let cachedTables = [];
let cachedActiveTable = {};



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



//Function: Get the base info from SeaTable. Consists of tables with row/column data.
const getBaseInfo = async (req, res) => {
    const baseToken = await getBaseToken();
    const baseUUID = await getBaseUUID();

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
        cachedBaseInfo = response.data;
        let temp = [];
        cachedBaseInfo.tables.forEach(table => {
            temp.push(table.name);
        })
        cachedTables = temp;
    }
    catch(error) {
        console.error("(seatableController)(getBaseInfo) Error fetching base info: ", error);
        res.status(500).json({ error: error.message });
    }
}


//Function: Get the names of the available tables in the SeaTable base.
const getAvailableTables = async (req, res) => {
    try {
        if(cachedTables.length === 0) {
            console.log("Fetching tables.");
            await getBaseInfo();
        }
        console.log("Using cached tables.");
        res.status(200).json({ success: true, tables: cachedTables });
    }
    catch(error) {
        console.error("(seatableController)(getAvailableTables) Error fetching tables: ", error);
        res.status(500).json({ success: false, error: error.message });
    }
}


//Function: Retrieve the current table selected and return the data in the table (rows/columns).
const getDataInTable = async (req, res) => {
    try {
        if(Object.keys(cachedBaseInfo).length === 0) {
            console.log("No data is cached, fetching BaseInfo.");
            await getBaseInfo();
        }

        const tableSelected = req.params.tableName;
        const tableData = cachedBaseInfo.tables.find(table => table.name === tableSelected);

        if(!tableData) {
            console.log("Table not found.");
            res.status(404).json({ error: `Table "${tableSelected}" not found.` });
        }

        const { columns, rows } = tableData;
    }
    catch(error) {
        console.error("(seatableController)(getDataInTable) Error fetching data in table: ", error);
        res.status(500).json({ error: error.message });
    }
}

const getTableData = async (req, res) => {
    try {
        const baseToken = await getBaseToken();
        const baseUUID = await getBaseUUID();
        const { tableName } = req.params;
        const options = {
            method: 'GET',
            url: `${urlBase}/api-gateway/api/v2/dtables/${baseUUID}/rows/?table_name=${tableName}&convert_keys=true`,
            headers: {
                accept: 'application/json',
                authorization: `Bearer ${baseToken}`,
            },
        };

        const response = await axios(options);
        res.status(200).json(response.data);
    }
    catch(error) {
        console.error("(seatableController)(getTableData) Error fetching table data: ", error);
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = { getAvailableTables, getBaseInfo, getTableData };
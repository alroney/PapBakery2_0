const Token = require('../models/tokenSchema'); //Import the SeaTable token model.
const axios = require('axios'); //Axios is a promise-based HTTP client for the browser and Node.js.

const source = "SeaTable"; //Reference for the token.
const urlBase = "https://cloud.seatable.io"; //SeaTable server.

let cachedBaseInfo = {};
let cachedTables = [];
let cachedTablesData = [{}]; //Array to store the data of the tables
let cachedActiveTable = {};
let tempDate = 0; //Temporary variable to compare another date with the current date.
let tempCount = 0; //Temporary variable to count the number of times a function is called.
let tempBT = ""; //Temporary variable to store the base token.
let tempUUID = ""; //Temporary variable to store the base UUID. 



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
                const currentTime = new Date();
                const timeDiff = Math.abs(currentTime - token.expiresAt) / 1000 / 60 / 60 / 24; //Convert to days.

                if(timeDiff < 2) { //If the token is not expired (less than 2 days).
                    console.log(`${source} ${keyName} with expiration found and not expired.`);
                    return token.keyValue;
                }
                else {
                    console.log(`${source} ${keyName} found but expired.`);
                    await fetchAndStoreNewBaseToken(); //Fetch and store a new token.
                }
            }
        }

        else {
            console.log(`(seatableController)(fetchStoredToken) ${source} ${keyName} not found.`);
            await fetchAndStoreNewBaseToken();
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
    };

    try {
        const response = await axios(options);
        const { access_token, dtable_uuid } = response.data;
        const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); //2 days.

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
        cacheAllTablesData();
        
        res.status(200).json({ success: true, tables: cachedTables });
    }
    catch(error) {
        console.error("(seatableController)(getAvailableTables) Error fetching tables: ", error);
        res.status(500).json({ success: false, error: error.message });
    }
}



//Function: Fetch the data of a table (specified by the table name) from the SeaTable base.
const fetchTableData = async (tableName, next) => {
    const currentTime = new Date();
    const timeDiff = Math.abs(currentTime - tempDate) / 1000 / 60; // Convert to minutes
    
    //If time difference is greater than 10 minutes, check the base token again. This is to prevent unnecessary token checks. Each time this is called.
    if (timeDiff > 10) {
        tempBT = await getBaseToken();
        tempUUID = await getBaseUUID();

        tempDate = currentTime;
    }

    //Prepare the options for the axios request.
    const options = {
        method: 'GET',
        url: `${urlBase}/api-gateway/api/v2/dtables/${tempUUID}/rows/?table_name=${tableName}&convert_keys=true`,
        headers: {
            accept: 'application/json',
            authorization: `Bearer ${tempBT}`,
        },
    };

    try {
        const response = await axios(options);
        return response.data;
    }
    catch(error) {
        console.error("(seatableController)(fetchTableData) Error fetching table data: ", error);
        next(error);
    }
}



//Function: Retrieve list of available tables and cache the data of each table, calling fetchTableData for each table.
const cacheAllTablesData = async () => {
    try {
        cachedTablesData.length = 0; //Clear cachedTablesData to avoid duplicates.

        //Iterate over cachedTables and fetch data for each table.
        for(const tableName of cachedTables) {
            try {
                const tableData = await fetchTableData(tableName);
                cachedTablesData.push({
                    tableName: tableName, //Store the table name.
                    data: tableData, //Store the fetched data.
                });
            }
            catch(error) {
                console.error(`(seatableController)(loadTableData) Error fetching ${tableName} table data `);
            }
            
        }

        console.log("All tables cached successfully.");
        //Clear all the temp variables.
        tempDate = 0;
        tempCount = 0;
        tempBT = "";
        tempUUID = "";
    }
    catch(error) {
        console.error("(seatableController)(loadTableData) Error loading table data: ", error);
    }
}


//Function: Get the data from a table specified by the table name in the SeaTable base, given by a select component in the frontend.
const getTableData = async (req, res) => {
    const { tableName } = req.params;
    const tableData = cachedTablesData.find(table => table.tableName === tableName);

    res.status(200).json(tableData.data);
}


const runSQL = async (req, res) => {
    try {
        const baseToken = await getBaseToken();
        const baseUUID = await getBaseUUID();
        const { sql } = req.body;
        const options = {
            method: 'POST',
            url: `${urlBase}/api-gateway/api/v2/dtables/${baseUUID}/sql`,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                authorization: `Bearer ${baseToken}`,
            },
            data: {
                sql: sql,
                convert_keys: true,
            },
        };

        const response = await axios(options);
        res.status(200).json(response.data.results);
    }
    catch(error) {
        console.error("(seatableController)(runSQL) Error running SQL: ", error);
        res.status(500).json({ success: false, error: error.message });
    }
}

//Function: Update the specified table's rows in the SeaTable base.
const updateRows = async (req, res) => {
    try {
        const baseToken = await getBaseToken();
        const baseUUID = await getBaseUUID();
        const { tableName, rows } = req.body;

        const options = {
            method: 'PUT',
            url: `${urlBase}/api-gateway/api/v2/dtables/${baseUUID}/rows/`,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                authorization: `Bearer ${baseToken}`,
            },
            data: {
                table_name: tableName,
                updates: rows, //Use the rows object to update the rows. "updates" is expected by the SeaTable API.
            },
        };

        const response = await axios(options);

        //Update the cached table data with the new data to avoid fetching the data again.
        const tableData = cachedTablesData.find(table => table.tableName === tableName); //Find the table with the matching tableName.
        tableData.data = response.data;

        res.status(200).json(response.data);
    }
    catch(error) {
        console.error("(seatableController)(updateRows) Error updating rows: ", error);
        res.status(500).json({ success: false, error: error.message });
    }
}


module.exports = { getAvailableTables, getBaseInfo, getTableData, fetchAndStoreNewBaseToken, runSQL, updateRows };
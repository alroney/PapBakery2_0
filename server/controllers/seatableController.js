const Token = require('../models/tokenSchema'); //Import the SeaTable token model.
const axios = require('axios'); //Axios is a promise-based HTTP client for the browser and Node.js.
const convertUnits = require('../utils/unitConversion'); //Converts units of measurement.

const source = "SeaTable"; //Reference for the token.
const urlBase = "https://cloud.seatable.io"; //SeaTable server.

let cachedBaseInfo = {};
let cachedTables = [];
let cachedTablesData = [{}]; //Array to store the data of the tables
let tempDate = 0; //Temporary variable to compare another date with the current date.
let tempBT = ""; //Temporary variable to store the base token.
let tempUUID = ""; //Temporary variable to store the base UUID.



//Function: Fetch Stored Token from Mongo.
const fetchStoredToken = async (keyName) => {
    try {
        const token = await Token.findOne({ source: source, keyName: keyName });
        let needsRefresh = false;

        if(token) {
            if(token.expiresAt === null || token.expiresAt === undefined) {
                console.log(`${source} ${keyName} found.`);
            }
            else {
                const currentTime = new Date();

                if(currentTime > token.expiresAt) { //If the token is  expired (current time is greater than the expiration time of 2 days).
                    console.log(`${source} ${keyName} found but expired.`);
                    await fetchAndStoreNewBaseToken(); //Fetch and store a new token.
                    needsRefresh = true; //Set the flag to true to indicate that the token needs to be refreshed to get the new token value.
                }
                else {
                    console.log(`${source} ${keyName} with expiration found and not expired.`);
                }
            }
        }
        else {
            console.log(`(seatableController)(fetchStoredToken) ${source} ${keyName} not found.`);
            await fetchAndStoreNewBaseToken();
            needsRefresh = true;
        }

        //If the token needs to be refreshed, fetch the new token.
        if(needsRefresh) {
            const newToken = await Token.findOne({ source: source, keyName: keyName });
            return newToken.keyValue;
        }
        else {
            return token.keyValue;
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

//Function: Get the base token and UUID from the mongoDB.
const getBaseTokenAndUUID = async () => {
    try {
        tempDate = new Date(); //Set the tempDate to the current date.
        const baseToken = await fetchStoredToken("base_token");
        const baseUUID = await fetchStoredToken("dtable_uuid");

        tempBT = baseToken; //Set the tempBT to the baseToken.
        tempUUID = baseUUID; //Set the tempUUID to the baseUUID.

        return { baseToken, baseUUID };
    }
    catch(error) {
        console.error("(seatableController)(getBaseTokenAndUUID) Error fetching base token and UUID: ", error);
    }
}



//Function: Get the base info from SeaTable. Consists of tables with row/column data.
const getBaseInfo = async (req, res) => {
    const { baseToken, baseUUID } = await getBaseTokenAndUUID();

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
        await cacheAllTablesData();
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
        const { baseToken, baseUUID } = await getBaseTokenAndUUID();
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
    let ctd;
    let ct = cachedTables;
    try {
        cachedTablesData.length = 0; //Clear cachedTablesData to avoid duplicates.

        //Iterate over cachedTables and fetch data for each table.
        for(const tableName of ct) {
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
        ctd = cachedTablesData;
        //Clear all the temp variables.
        tempDate = 0;
        tempCount = 0;
        tempBT = "";
        tempUUID = "";
        return ctd;
    }
    catch(error) {
        console.error("(seatableController)(loadTableData) Error loading table data: ", error);
    }
}


//Function: Get the data from a table specified by the table name in the SeaTable base, given by a select component in the frontend.
const getTableData = async (req, res) => {
    try {
        const { tableName } = req.params;
        if(cachedTablesData.length === 0) {
            await getAvailableTables();
        }
        const tableData = cachedTablesData.find(table => table.tableName === tableName);
        res.status(200).json(tableData.data);
    }
    catch(error) {
        console.error("(seatableController)(getTableData) Error getting table data: ", error);
        res.status(500).json({ success: false, error: error.message });
    }
}


const runSQL = async (req, res) => {
    try {
        const { baseToken, baseUUID } = await getBaseTokenAndUUID();
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
        const { baseToken, baseUUID } = await getBaseTokenAndUUID();
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

        //If the update is successful, update the cached data.
        if(response.data.success) {
            const tableData = await fetchTableData(tableName);
            cachedTablesData.find(table => table.tableName === tableName).data = tableData;
        }

        res.status(200).json(response.data);
    }
    catch(error) {
        console.error("(seatableController)(updateRows) Error updating rows: ", error);
        res.status(500).json({ success: false, error: error.message });
    }
}



//Function: Calculate the cost of each ingredient based on type (Flavor, Category). cT = Chosen Table.
const calculateTypeIngredientCost = async (cT) => {
    /**
     * This function is a temporary solution to calculate the cost of each category ingredient.
     * Eventually this will be replaced by a more efficient solution to recalculate any table.
     * 
     * 
     * TODO: use table name as the identifier for primary and foreign keys. This will allow for more dynamic calculations.
     */

    try{
        const ingD = cachedTablesData.find(table => table.tableName === "Ingredient");
        const cTD = cachedTablesData.find(table => table.tableName === cT);
        const ingredients = ingD.data.rows; //Get the ingredients data
        const chosenTable = cTD.data.rows;
        return chosenTable.map((row) => {
            const ingredient = ingredients.find((ingredient) => ingredient.ShortName === row.IngredientName);

            if(!ingredient) {
                console.error(`(seatableController)(calculateCategoryIngredientCost) Ingredient ${row.IngredientName} not found.`);
                return {...row, Cost: 0};
            }

            const { UnitType, UnitSize, PurchaseCost } = ingredient;
            const convertedValue = convertUnits(UnitSize, UnitType, "grams");
            const costPerUnit = PurchaseCost / convertedValue;
            const cost = (costPerUnit * row.Quantity) || 0;

            return {...row, Cost: cost};

        });
    }
    catch(error) {
        console.error(`(seatableController)(calculateCategoryIngredientCost) Error calculating ${cT} cost: `, error);
    }
}



const calculate = async (req, res) => {
    try {
        cT = req.body.tableName;
        const result = await calculateTypeIngredientCost(cT);
        res.status(200).json(result);
    }
    catch (error) {
        console.error("Error calculating: ", error);
        res.status(500).json({ success: false, error: error.message });    
    }

}


const getCachedTablesData = () => {
    const ctd = cachedTablesData;
    return ctd;
}

module.exports = { getAvailableTables, getBaseInfo, getTableData, fetchAndStoreNewBaseToken, runSQL, updateRows, calculate, getCachedTablesData };
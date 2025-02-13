const axios = require('axios'); //Axios is a promise-based HTTP client for the browser and Node.js.
const urlBase = "https://cloud.seatable.io"; //SeaTable server.
const { getBaseTokenAndUUID } = require('./stTokenController'); //Import the getBaseInfo function from the stBaseController.js file.
const fs = require('fs');
const path = require('path');

let cachedBaseInfo = {};
let cachedTables = [];



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

        return cachedBaseInfo;
    }
    catch(error) {
        console.error("(stcTokener)(getBaseInfo) Error fetching base info: ", error);
        res.status(500).json({ error: error.message });
    }
}



//Test function to get the available tables for the Maps.
const getCachedTablesData = () => {
    const ctd = require('../../cache/cachedTables.json');
    return ctd;
}



//Function: Get the names of the available tables in the SeaTable base.
const getAvailableTables = async (req, res) => {
    let temp = [];
    cachedTables.length = 0; //Clear the cached tables to avoid duplicates.
    try {
        
        const baseInfo = await getBaseInfo();
        const baseInfoTables = baseInfo.tables;

        if(cachedTables.length === 0) {
            console.log("Fetching tables.");
            baseInfo.tables.forEach(table => {
                temp.push(table.name);
            });
        }

        cachedTables = temp;
        await cacheAllTablesData(baseInfoTables); //Cache the data of all tables available.
        res.status(200).json({ success: true, tables: cachedTables });
    }
    catch(error) {
        console.error("(stDataController)(getAvailableTables) Error fetching tables: ", error);
        res.status(500).json({ success: false, error: error.message });
    }
}



//Function: Assign the data of a table from the baseInfoTables object according to the table name.
const assignTableData = async (tableName, bIT) => {
    try {
        const table = bIT.find(table => table.name === tableName); //Find the table info by the table name.
        if (!table || !table.columns || !table.rows) {
            throw new Error(`Table ${tableName} not found or invalid structure`);
        }

        let data = {rows: table.rows};

        const processedRows = table.rows.map(row => {
            const newRow = {};
            Object.entries(row).forEach(([key, value]) => {
                    const column = table.columns.find(col => col.key === key);
                    if (column) {
                        newRow[column.name] = value;
                    }
                    else{
                        newRow[key] = value;
                    }
                
            });
            return newRow;
        });

        data.rows = processedRows;

        return data;
    }
    catch(error) {
        console.error("(seatableController)(assignTableData) Error assigning table data: ", error);
    }
}



//Function: Retrieve list of available tables and cache the data of each table, calling fetchTableData for each table.
const cacheAllTablesData = async (baseInfoTables) => {
    let cachedTablesData = []; //Cached tables data.
    let ct = cachedTables;
    const bIT = baseInfoTables;
    const lastUpdated = new Date(); //Get the current date and time.
    try {
        cachedTablesData.length = 0; //Clear cachedTablesData to avoid duplicates.
        cachedTablesData.push({ lastUpdated: lastUpdated }); //Store the last updated date.
        //Iterate over cachedTables and fetch data for each table.
        for(const tableName of ct) {
            try {
                const tableData = await assignTableData(tableName, bIT);
                cachedTablesData.push({
                    tableName: tableName, //Store the table name.
                    data: tableData, //Store the fetched data.
                });
            }
            catch(error) {
                console.error(`(seatableController)(loadTableData) Error fetching ${tableName} table data: `, error);
            }
            
        }


        const filePath = path.join(__dirname, '../../cache/cachedTables.json');
        fs.writeFileSync(filePath, JSON.stringify(cachedTablesData, null, 2)); //Write the cached tables data to a file. (The data to be converted to JSON string, no replacer function used, 2 spaces used for indentation).

        console.log("All tables cached successfully.");
        //Clear all the temp variables.
        tempDate = 0;
        tempCount = 0;
        tempBT = "";
        tempUUID = "";
        return cachedTablesData;
    }
    catch(error) {
        console.error("(seatableController)(loadTableData) Error loading table data: ", error);
    }
}



//Function: Get the data from a table specified by the table name in the SeaTable base, given by a select component in the frontend.
const getTableData = async (req, res) => {
    try {
        let cachedTablesData = getCachedTablesData();
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

module.exports = { getAvailableTables, getTableData, getCachedTablesData };
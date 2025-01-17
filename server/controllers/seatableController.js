const axios = require('axios'); //Axios is a promise-based HTTP client for the browser and Node.js.
const convertUnits = require('../utils/unitConversion'); //Converts units of measurement.
const { fetchStoredToken, getBaseTokenAndUUID, getBaseInfo } = require('./seatableControllers/stTokenController'); //Import functions from tokenController.js.
const urlBase = "https://cloud.seatable.io"; //SeaTable server.

let cachedBaseInfo = {};
let cachedTables = [];
let cachedTablesData = [{}]; //Array to store the data of the tables
let tempDate = 0; //Temporary variable to compare another date with the current date.
let tempBT = ""; //Temporary variable to store the base token.
let tempUUID = ""; //Temporary variable to store the base UUID.




//Function: Get the names of the available tables in the SeaTable base.
const getAvailableTables = async (req, res) => {
    let temp = [];
    cachedTables.length = 0; //Clear the cached tables to avoid duplicates.
    try {
        
        const baseInfo = await getBaseInfo();
        const baseInfoTables = baseInfo.tables;

        console.log("Base Info: ", cachedBaseInfo);

        if(cachedTables.length === 0) {
            console.log("Fetching tables.");
            baseInfo.tables.forEach(table => {
                temp.push(table.name);
            });
        }
        
        
        cachedTables = temp;
        await cacheAllTablesData(baseInfoTables);
        res.status(200).json({ success: true, tables: cachedTables });
    }
    catch(error) {
        console.error("(seatableController)(getAvailableTables) Error fetching tables: ", error);
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
    let ctd;
    let ct = cachedTables;
    const bIT = baseInfoTables;
    try {
        cachedTablesData.length = 0; //Clear cachedTablesData to avoid duplicates.

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
            const tableToUpdate = cachedTablesData.find(table => table.tableName === tableName);
            if(tableToUpdate) { //If the table is found, update the rows.
                rows.forEach(update => { //Iterate over the rows to update.
                    const rowIndex = tableToUpdate.data.rows.findIndex(row => row._id === update.row_id); //Find the row by the row_id. The 'data' in this line is the data of the table and not from the API above.
                    if (rowIndex !== -1) { //If the row is found, update the row.
                        tableToUpdate.data.rows[rowIndex] = { ...tableToUpdate.data.rows[rowIndex], ...update.row };
                    }
                });
            }
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

module.exports = { getAvailableTables, getTableData, runSQL, updateRows, calculate, getCachedTablesData };
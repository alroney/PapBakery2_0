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

//Function: Run SQL queries on the SeaTable base.
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
        cT = req.body.tableName; //Chosen Table
        const result = await calculateTypeIngredientCost(cT);
        res.status(200).json(result);
    }
    catch (error) {
        console.error("Error calculating: ", error);
        res.status(500).json({ success: false, error: error.message });    
    }

}





//Test function to get the available tables for the Maps.
const getCachedTablesData = () => {
    const ctd = cachedTablesData;
    return ctd;
}

module.exports = { runSQL, updateRows, calculate, getCachedTablesData };
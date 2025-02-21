const axios = require('axios'); //Axios is a promise-based HTTP client for the browser and Node.js.
const urlBase = "https://cloud.seatable.io"; //SeaTable server.
const { getBaseTokenAndUUID } = require('./stTokenController'); //Import the getBaseInfo function from the stBaseController.js file.
const fs = require('fs');
const path = require('path');

let count = 0;



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
        const data = response.data;

        return data;
    }
    catch(error) {
        console.error("(stcTokener)(getBaseInfo) Error fetching base info: ", error);
        res.status(500).json({ error: error.message });
    }
}





const getTables = async (req, res) => {
    try {
        const filePath = path.join(__dirname, '../../cache/cachedTables.json');
        if(!fs.existsSync(filePath) && count < 3) {
            count++;
            console.log("(getTables) File: ", filePath," not found! Attempting to sync data. Attempt: ", count);
            await syncSeaTableData();
            return getTables(req, res);
        }
        else {
            count = 0;
            const ct = require(filePath).tableList;
            res.status(200).json({ success: true, message: "Data synced successfully.", tables: ct });
            return ct;
        }
    }
    catch(error) {
        console.error("(stDataController)(getTables) Error getting tables: ", error);
        res.status(500).json({ success: false, error: error.message });
    }
}



const getTablesData = async () => {
    try {
        const filePath = path.join(__dirname, '../../cache/cachedTables.json');

        if(!fs.existsSync(filePath) && count < 3) {
            count++;
            console.log("(getTablesData) File: ", filePath," not found! Attempting to sync data. Attempt: ", count);
            await syncSeaTableData();
            return getTablesData();
        }
        else {
            count = 0;
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const ctd = JSON.parse(fileContent).tablesData;
            return ctd;
        }
    }
    catch(error) {
        console.error("(stDataController)(getTablesData) Error getting tables data: ", error);
    }
}




const syncSeaTableData = async () => {
    try {
        const baseInfo = await getBaseInfo();
        const baseInfoTables = baseInfo.tables;
        const cachedTables = [];
        const tablesData = [];

        baseInfoTables.forEach(table => {
            cachedTables.push(table.name);
        });

        for(const tableName of cachedTables) {
            try {
                const tableData = await syncTableData(tableName, baseInfoTables);
                tablesData.push({
                    tableName: tableName,
                    data: tableData,
                });
            }
            catch(error) {
                console.error(`(stDataController)(syncSeaTableData) Error fetching ${tableName} table data: `, error);
            }
        }

        const filePath = path.join(__dirname, '../../cache/cachedTables.json');
        let storedData = {
            lastUpdated: new Date(),
            tableList: cachedTables,
            tablesData: tablesData,
        };

        if (!fs.existsSync(filePath)) {
            console.log("Creating new cache file.");
            const dirPath = path.dirname(filePath);
            fs.mkdirSync(dirPath, { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(storedData, null, 2));
            return;
        }

        const existing = JSON.parse(fs.readFileSync(filePath));
        existing.tablesData = storedData.tablesData;
        existing.lastUpdated = storedData.lastUpdated;
        storedData = existing;

        fs.writeFileSync(filePath, JSON.stringify(storedData, null, 2));

        console.log("All tables cached successfully.");
        return;
    }
    catch(error) {
        console.error("(stDataController)(syncSeaTableData) Error loading table data: ", error);
    }
}



//Function: Synchronize the data of a table from the baseInfoTables object according to the table name.
const syncTableData = async (tableName, bIT) => {
    try {
        const table = bIT.find(table => table.name === tableName); //Find the table info by the table name.
        if (!table || !table.columns || !table.rows) {
            throw new Error(`Table ${tableName} not found or invalid structure`);
        }

        let data = {rows: table.rows};

        const processedRows = table.rows.map(row => {
            const newRow = {};
            Object.entries(row).forEach(([key, value]) => {
            if (key === '_id' || !key.startsWith('_')) { //Filter out unwanted keys (columns). This would reduce the size of the data by half.
                const column = table.columns.find(col => col.key === key);
                if (column) {
                    newRow[column.name] = value;
                }
                else {
                    newRow[key] = value;
                }
            }
            });
            return newRow;
        });

        data.rows = processedRows;

        return data;
    }
    catch(error) {
        console.error("(stDataController)(syncTableData) Error assigning table data: ", error);
    }
}

const getTableDataDirectly = async (tableName) => {
    // Create mock req and res objects
    const req = {
        params: {
            tableName: tableName
        }
    };
    
    const res = {
        status: (statusCode) => ({
            json: (data) => {
                if (statusCode === 200) {
                    return data;
                } else {
                    throw new Error(data.error);
                }
            }
        })
    };

    try {
        let responseData;
        await getTableData(req, {
            status: () => ({
                json: (data) => {
                    responseData = data;
                }
            })
        });
        return responseData;
    } catch (error) {
        console.error("Error getting table data directly: ", error);
        throw error;
    }
}

//Function: Get the data from a table specified by the table name in the SeaTable base, given by a select component in the frontend.
const getTableData = async (req, res) => {
    try {
        const cachedTablesData = await getTablesData(); //Get the cached tables data. Using 'await' to ensure all data is received and does not return a promise.
        let { tableName } = req.params;
        if(!cachedTablesData || cachedTablesData.length === 0) {
            await syncSeaTableData();
        }
        const tableData = cachedTablesData.find(table => table.tableName === tableName);
        res.status(200).json(tableData.data);
    }
    catch(error) {
        console.error("(stDataController)(getTableData) Error getting table data: ", error);
        res.status(500).json({ success: false, error: error.message });
    }
}


//Function: Update the specified table's rows in the cached tables data.
const updateTableData = async (tableName, newRows, columns) => {
    console.log(`(stDataController)(updateTableData) Updating table "${tableName}"...`);
    try {
        const filePath = path.join(__dirname, '../../cache/cachedTables.json');
        if(!fs.existsSync(filePath)) {
            throw new Error("Cached tables data not found.");
        }

        const cachedTablesData = require(filePath).tablesData;
        const tableToUpdate = cachedTablesData.find(table => table.tableName === tableName);

        if(tableToUpdate) {
            let currentRows = tableToUpdate.data.rows;
            let originalOrder = Object.keys(currentRows[0]); //Get the original order of the columns.

            if(columns) {
                currentRows = currentRows.map(row => {
                    const updatedRow = {};
                    Object.keys(row).forEach(col => {
                        const newColumnName = columns[col]?.newColumnName; //Get the new column name from the columns object. The '?' is used to prevent an error if the columns object is undefined.
                        updatedRow[newColumnName || col] = row[col]; //Update the column name if it exists in the columns object.
                    });
                    return updatedRow;
                });

                originalOrder = Object.keys(currentRows[0]); //Update the order of the columns after the column renaming.
            }

            const updatedRows = currentRows.map(existingRow => {
                const newRowData = newRows.find(newRow => 
                    (newRow._id === existingRow._id) || (newRow.row_id === existingRow._id)
                );
                if(!newRowData) return existingRow;

                // Handle both formats: direct object or {row, row_id} format
                const newRow = newRowData.row || newRowData;

                return originalOrder.reduce((updatedRow, key) => {
                    updatedRow[key] = newRow[key] ?? existingRow[key];
                    return updatedRow;
                }, {});
            });
            tableToUpdate.data.rows = updatedRows;
        }
        else {
            throw new Error(`Table ${tableName} not found in cached tables data.`);
        }

        let storedData = {
            lastUpdated: new Date(),
            tableList: require(filePath).tableList,
            tablesData: cachedTablesData,
        };

        fs.writeFileSync(filePath, JSON.stringify(storedData, null, 2));
        console.log(`(stDataController)(updateTableData) Table "${tableName}" updated successfully.`);
        return { success: true, message: "Table data updated successfully." };
    }
    catch(error) {
        console.error("(stDataController)(updateTableData) Error updating table data: ", error);
        return { success: false, error: error.message };
    }
}

module.exports = { getTables, getTableData, getTablesData, updateTableData, getTableDataDirectly, syncSeaTableData };
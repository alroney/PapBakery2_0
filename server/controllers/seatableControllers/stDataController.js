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
        }
        else {
            console.log("File found! ");
            count = 0;
            const ctd = require(filePath).tablesData;
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
        console.error("(stDataController)(syncTableData) Error assigning table data: ", error);
    }
}



//Function: Get the data from a table specified by the table name in the SeaTable base, given by a select component in the frontend.
const getTableData = async (req, res) => {
    try {
        const cachedTablesData = await getTablesData(); //Get the cached tables data. Using 'await' to ensure all data is received and does not return a promise.
        const { tableName } = req.params;
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

module.exports = { getTables, getTableData, getTablesData };
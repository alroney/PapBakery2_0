const axios = require('axios');
const { getBaseTokenAndUUID } = require('./stTokenController');
const urlBase = "https://cloud.seatable.io/api-gateway/api/v2/dtables"; //SeaTable server.


const createTable = async (tableData) => {
    const { baseToken, baseUUID } = await getBaseTokenAndUUID();
    const url = `${urlBase}/${baseUUID}/tables/`;
    const options = {
        method: 'POST',
        url: url,
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: `Token ${baseToken}`,
        },
        data: tableData,
            //columns:    tableData.columns, //Array of column objects with column_name. e.g., [{ "column_name": "Name" }, { "column_name": "Age" }].
            //table_name: tableData.tableName, //Name of the table to be created.
            
    };

    try {
        console.log("Table Data: ", tableData);
        const response = await axios(options);
        console.log("Table created: ", response.data);
        return { success: true, message: "Table created successfully." };
    }
    catch(error) {
        console.error("(seatableController)(createTable) Error creating table: ", error);
        return { success: false, error: error.message };
    }
}



const deleteTable = async (table_name) => {
    const { baseToken, baseUUID } = await getBaseTokenAndUUID();
    const url = `${urlBase}/${baseUUID}/tables/`;
    const options = {
        method: 'DELETE',
        url: url,
        headers: {
            accept: 'application/json',
            authorization: `Token ${baseToken}`,
        },
        data: {table_name},
    };

    try {
        const response = await axios(options);
        console.log("Table deleted: ", response.data);
        return { success: true, message: "Table deleted successfully." };
    }
    catch(error) {
        console.error("(stTableController)(deleteTable) Error deleting table: ", error);
        return { success: false, error: error.message };
    }
}



const renameTable = async (oldTableName, newTableName, req, res) => {
    const { baseToken, baseUUID } = await getBaseTokenAndUUID();
    const url = `${urlBase}/${baseUUID}/tables/${oldTableName}/`;
    const options = {
        method: 'PUT',
        url: url,
        headers: {
            accept: 'application/json',
            authorization: `Token ${baseToken}`,
            'content-type': 'application/json',
        },
        data: {
            new_table_name: newTableName,
        }
    };

    try {
        const response = await axios(options);
        console.log("Table renamed: ", response.data);
        res.status(200).json({ success: true, message: "Table renamed successfully." });
    }
    catch(error) {
        console.error("(seatableController)(renameTable) Error renaming table: ", error);
        res.status(500).json({ success: false, error: error.message });
    }
}


module.exports = { createTable, deleteTable, renameTable };
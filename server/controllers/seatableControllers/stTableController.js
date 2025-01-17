const axios = require('axios');
const urlBase = "https://cloud.seatable.io/api-gateway/api/v2/dtables"; //SeaTable server.


const createTable = async (newTableName, columns, req, res) => {
    const { base_token, dtable_uuid } = req.body;
    const url = `${urlBase}/${dtable_uuid}/tables/`;
    const options = {
        method: 'POST',
        url: url,
        headers: {
            accept: 'application/json',
            authorization: `Token ${base_token}`,
            'content-type': 'application/json',
        },
        data: {
            table_name: newTableName,
            columns: columns, //Array of column objects with column_name. e.g., [{ "column_name": "Name" }, { "column_name": "Age" }]
        }
    };

    try {
        const response = await axios(options);
        console.log("Table created: ", response.data);
        res.status(200).json({ success: true, message: "Table created successfully." });
    }
    catch(error) {
        console.error("(seatableController)(createTable) Error creating table: ", error);
        res.status(500).json({ success: false, error: error.message });
    }
}



const deleteTable = async (tableName, req, res) => {
    const { base_token, dtable_uuid } = req.body;
    const url = `${urlBase}/${dtable_uuid}/tables/${tableName}/`;
    const options = {
        method: 'DELETE',
        url: url,
        headers: {
            accept: 'application/json',
            authorization: `Token ${base_token}`,
        }
    };

    try {
        const response = await axios(options);
        console.log("Table deleted: ", response.data);
        res.status(200).json({ success: true, message: "Table deleted successfully." });
    }
    catch(error) {
        console.error("(seatableController)(deleteTable) Error deleting table: ", error);
        res.status(500).json({ success: false, error: error.message });
    }
}



const renameTable = async (oldTableName, newTableName, req, res) => {
    const { base_token, dtable_uuid } = req.body;
    const url = `${urlBase}/${dtable_uuid}/tables/${oldTableName}/`;
    const options = {
        method: 'PUT',
        url: url,
        headers: {
            accept: 'application/json',
            authorization: `Token ${base_token}`,
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
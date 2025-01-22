const axios = require('axios');
const urlBase = "https://cloud.seatable.io/api-gateway/api/v2/dtables"; //SeaTable server.

//Function: Execute the column operation on the SeaTable base.
const updateColumn = async (data) => {
    const { base_token, dtable_uuid } = data;
    const url = `${urlBase}/${dtable_uuid}/columns/`;
    const options = {
        method: 'PUT',
        url: url,
        headers: {
            accept: 'application/json',
            authorization: `Token ${base_token}`,
            'content-type': 'application/json',
        },
        data: data
    };

    try {
        const response = await axios(options);
        console.log("Column created: ", response.data);
        return { success: true, message: "Column created successfully." };
    }
    catch(error) {
        console.error("(seatableController)(createColumn) Error creating column: ", error);
        return { success: false, error: error.message };
    }
}

// Helper function to create column operation data
const createColumnOperation = (op_type, table_name, column, additionalData = {}) => ({
    op_type,
    table_name,
    column,
    ...additionalData
});

// Column operations
const columnOperations = {
    updateColumnType: (table_name, column, new_column_type, column_data) => {
        const data = createColumnOperation('modify_column_type', table_name, column, { new_column_type });
        if (column_data?.length > 0) {
            data.column_data = column_data;
        }
        return updateColumn(data);
    },

    renameColumn: (table_name, column, new_column_name) => 
        updateColumn(createColumnOperation('rename_column', table_name, column, { new_column_name })),

    resizeColumn: (table_name, column, new_column_width) => 
        updateColumn(createColumnOperation('resize_column', table_name, column, { new_column_width })),

    moveColumn: (table_name, column, target_column) => 
        updateColumn(createColumnOperation('move_column', table_name, column, { target_column })),

    setFrozenStatus: (table_name, column, frozen) => 
        updateColumn(createColumnOperation('freeze_column', table_name, column, { frozen }))
};



//Function: Create a single new column.
const insertColumn = async (security, data) => {
    const { base_token, dtable_uuid } = security;
    const url = `${urlBase}/${dtable_uuid}/columns/`;
    const options = {
        method: 'POST',
        url: url,
        headers: {
            accept: 'application/json',
            authorization: `Token ${base_token}`,
            'content-type': 'application/json',
        },
        data: data
    };

    try {
        const response = await axios(options);
        console.log("Column created: ", response.data);
        return { success: true, message: "Column created successfully." };
    }
    catch(error) {
        console.error("(seatableController)(createColumn) Error creating column: ", error);
        return { success: false, error: error.message };
    }
}




//Function: Delete a column.
const deleteColumn = async (security, table_name, column) => {
    const { base_token, dtable_uuid } = security;
    const url = `${urlBase}/${dtable_uuid}/columns/`;
    const options = {
        method: 'DELETE',
        url: url,
        headers: {
            accept: 'application/json',
            authorization: `Token ${base_token}`,
            'content-type': 'application/json',
        },
        data: {
            table_name: table_name,
            column: column,
        }
    };

    try {
        const response = await axios(options);
        console.log("Column deleted: ", response.data);
        return { success: true, message: "Column deleted successfully." };
    }
    catch(error) {
        console.error("(seatableController)(deleteColumn) Error deleting column: ", error);
        return { success: false, error: error.message };
    }
}


module.exports = columnOperations;




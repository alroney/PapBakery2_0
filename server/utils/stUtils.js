const { getMaps } = require('./stDataMapperService');
const columnOperations = require('../controllers/seatableControllers/stColumnController');
const { updateRow } = require('../controllers/seatableControllers/stRowController');
const { createTable, deleteTable } = require('../controllers/seatableControllers/stTableController');
const { updateTableData } = require('../controllers/seatableControllers/stDataController');





//Function: Delete a table by table name.
const deleteOldTable = async (table_name) => {
    try {
        const isDeleted = await deleteTable(table_name);
        return isDeleted.success;
    }
    catch(error) {
        console.error("(stTableUtilsController)(deleteOldTable) Error deleting old table: ", error);
        return false;
    }
}



//Function: Create a new table with the given table name and columns.
const createNewTable = async (table_name, columns) => {
    try {
        console.log("Creating new table...");
        const tableData = {
            table_name,
            columns,
        };
        await createTable(tableData);
    }
    catch(error) {
        console.error("(stTableUtilsController)(createNewTable) Error creating new table: ", error);
    }
}



//Function: Rename and update column type.
const renameAndUpdateColumnType = async (table_name, column, new_column_name, new_column_type, column_data) => {
    try {
        console.log("column_data: ", column_data);
        if(column === new_column_name){};
        // Rename the column
        const renamed = await columnOperations.renameColumn(table_name, column, new_column_name);

        // Update the column type
        const retyped = await columnOperations.updateColumnType(table_name, new_column_name, new_column_type, column_data);
        renamed;
        retyped;

        return { success: true, message: "Column renamed and updated successfully." };
    }
    catch(error) {
        // console.error("(stTableUtilsController)(renameAndUpdateColumnType) Error renaming and updating column type: ", error);
        return { success: false, message: "Internal server error." };
    }
};



//Function: Rearrange the data into proper formation for updating the rows.
const updateRowData = async (table_name, data) => {
    try {
        const updData = { //Object to store the updated row data.
            updates: [], //Array to store the objects used for updating each row.
            table_name, //The table name.
        };

        const upd = []; //Array to store all updates.
        
        //Function: Cleans the row by removing the _id from the row data and returns the cleaned row data. (Used to avoid overwriting the _id in the row data).
        const cleanRowData = (rowData) => {
            const { _id, ...rest } = rowData; //Destructure the _id from the row data (`rest` or rest of rowData).
            return { row: rest, row_id: _id };
        };

        //Iterate over each row in the data.
        Object.keys(data).forEach(rowKey => {
            const { row, row_id } = cleanRowData(data[rowKey]);
            upd.push({ row, row_id }); //`row` contains { column_name: value } pairs and `row_id` contains the _id of the row.
        });

        updData.updates = upd; //Assign the collected updates to the updates property in updData.

        const result = await updateRow(updData); //Update the rows in SeaTable.

        if (!result.success) {
            console.log(`Failed to update rows.`);
        }
        return result.success;
    }
    catch(error) {
        console.error("(stTableUtilsController)(updateRowData) Error updating row data: ", error);
    }
}



//Function: Convert the foreign keys in the given map.
const convertForeignKeys = async (map, idToName, cachedMaps = {}) => {
    try {
        const [mapName] = Object.keys(map);
        const table_name = mapName.replace('Map', '');
        const rows = map[mapName];
        
        // Find columns needing conversion
        const columnsToConvert = Object.keys(rows[0])
            .filter(column => !column.startsWith(table_name) && 
                (idToName ? column.endsWith('ID') : column.endsWith('Name')));

        if (!columnsToConvert.length) {
            return { success: true, message: "No columns need converting." };
        }

        // Process all columns in parallel
        const columnsProcessed = await Promise.all(columnsToConvert.map(async column => {
            const value = rows[0][column];
            if (!value) return null;

            const { newColumnName, newValue } = await processForeignKeyConversion(table_name, column, value, cachedMaps);
            if (newColumnName === column) return null;

            const newColumnType = idToName ? 'text' : 'number';
            
            // Process all rows for this column
            const updates = (await Promise.all(rows.map(async row => {
                const result = await processForeignKeyConversion(table_name, column, row[column], cachedMaps);
                return result.newValue && result.newValue !== 'undefined' ? {
                    row_id: row._id,
                    column: newColumnName,
                    value: result.newValue
                } : null;
            }))).filter(Boolean);

            return {
                oldColumn: column,
                newColumnName,
                newColumnType,
                updates
            };
        })).then(results => results.filter(Boolean));

        if (!columnsProcessed.length) {
            return { success: true, message: "No valid columns need converting." };
        }

        // Update column names and types
        await Promise.all(columnsProcessed.map(column =>
            renameAndUpdateColumnType(
                table_name,
                column.oldColumn,
                column.newColumnName,
                column.newColumnType,
                { format: column.newColumnType }
            )
        ));

        // Prepare row updates
        const rowUpdates = columnsProcessed.reduce((acc, column) => {
            column.updates.forEach(update => {
                acc[update.row_id] = {
                    ...acc[update.row_id],
                    _id: update.row_id,
                    [update.column]: update.value
                };
            });
            return acc;
        }, {});

        // Update rows if needed
        if (Object.keys(rowUpdates).length) {
            await updateRowData(table_name, rowUpdates);
        }

        // Update table data
        const updatedRows = rows.map(row => {
            const newRow = { ...row };
            columnsProcessed.forEach(column => {
                const update = column.updates.find(u => u.row_id === row._id);
                if (update) {
                    newRow[update.column] = update.value;
                    delete newRow[column.oldColumn];
                }
            });
            return newRow;
        });

        await updateTableData(table_name, updatedRows, columnsProcessed.reduce((acc, col) => ({
            ...acc,
            [col.oldColumn]: {
                newColumnName: col.newColumnName,
                newColumnType: col.newColumnType,
            }
        }), {}));

        return { success: true, message: "Foreign keys converted successfully." };
    } catch (error) {
        console.error("(stTableUtilsController)(convertForeignKeys) Error converting foreign keys:", error);
        throw error;
    }
};



//Function: Process the foreign key conversion based on the column name and input value. 
const processForeignKeyConversion = async (tableName, columnName, input, cachedMaps = {}) => {
    try {
        //Skip conversion if table ends with '-A' and column starts with table name (without '-A').
        if (tableName.endsWith('-A') && columnName.startsWith(tableName.replace('-A', ''))) {
            return { columnName, input };
        }
        
        const isToName = columnName.endsWith('ID'); //Check if the original column name ends with 'ID'.
        const mapName = columnName.replace(/ID|Name/g, '') + 'Map'; //Get the map of the foreign column by removing 'ID' or 'Name' from the end and replace with 'Map'.
        const map = await getMaps([mapName]);

        const matchingRow = map[mapName].find(row => {
            const rowValue = isToName ? Number(row[columnName]) : String(row[columnName]);
            const inputValue = isToName ? Number(input) : String(input);
            return rowValue === inputValue;
        });
        
        if(matchingRow) {
            const newColumnName = isToName ? columnName.replace('ID', 'Name') : columnName.replace('Name', 'ID'); //Get the new column name.
            
            if(!(newColumnName in matchingRow)) {
                console.log(`Target column ${newColumnName} does not exist in table ${mapName.replace('Map', '')}. Skipping conversion for ${columnName}.`);
                return { newColumnName: columnName, newValue: input };
            }

            let newValue = isToName ? String(matchingRow[newColumnName]) : Number(matchingRow[newColumnName]); //Get the new value from the matching row. Convert typeOf to match the new value.
            return { newColumnName, newValue }; //Return the new column name and new value.
        }

        console.log(`No matching row found for column ${columnName} and input ${input}.`);
        return { columnName, input }; //Return the original column name and input if no matching row is found.
    }
    catch(error) {
        console.error("(stTableUtilsController)(processForeignKeyConversion) Error processing foreign key conversion: ");
        return { newColumnName: columnName, newValue: input };
    }
}

module.exports = {
    deleteOldTable,
    createNewTable,
    renameAndUpdateColumnType,
    updateRowData,
    convertForeignKeys,
    processForeignKeyConversion
};
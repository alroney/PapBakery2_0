const { getMaps } = require('./stcMaps');
const columnOperations  = require('./stColumnController');
const { updateRow } = require('./stRowController');
const { createTable } = require('./stTableController');


const testSTCMaps = async (req, res) => {
    try {
        const map = getMaps(['categoryShapeMap']);
        const updatedMap = convertForeignKeys(map, false);
        updatedMap;
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error("(stcTestMap)(testSTCMaps) Error testing STC Maps: ", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}


const createNewTable = async () => {
    try {
        const tableData = {
            table_name: 'ProductTest-A',
            columns: [
                    {
                        column_name: 'C1',
                        column_type: 'number',
                    }
                ]

        };

        console.log("tableData: ", tableData);
        await createTable(tableData);
    }
    catch(error) {
        console.error("(stcTestMap)(createNewTable) Error creating new table: ", error);
    }
}


const buildRecipes = () => {
    try {
        const {
            categoryIngredientMap,
            subCategoryIngredientMap,
        } = getMaps('categoryIngredientMap', 'subCategoryIngredientMap');
        const recipes = {};



    }
    catch(error) {
        console.error("Error building recipes: ", error);
    }
}



const buildProducts = async () => {
    try {
        const { categoryMap,
                subCategoryMap, 
                flavorMap, 
                shapeMap, 
                sizeMap, 
                ingredientMap, 
                categoryShapeMap, 
                categoryShapeSizeMap 
            } = getMaps(['categoryMap', 'subCategoryMap', 'flavorMap', 'shapeMap', 'sizeMap', 'ingredientMap', 'categoryShapeMap', 'categoryShapeSizeMap']);
        const products = [];

        const columns = [
            {
                column_name: 'SKU',
                column_type: 'text',
            },
            {
                column_name: 'Name',
                column_type: 'text',
            },
            {
                column_name: 'RecipeCost',
                column_type: 'number',
            },
            {
                column_name: 'Description',
                column_type: 'text',
            },
            {
                column_name: 'Ingredients',
                column_type: 'text',
            }
        ]

        //Build the products array.
        Object.keys(categoryShapeSizeMap).forEach(key => {
            const { categoryShapeID, sizeID, batchSize } = categoryShapeSizeMap[key];
            const { categoryID, shapeID } = categoryShapeMap[categoryShapeID];
            
            //Assign the data values by the maps where the IDs are matched from the categoryShapeSizeMap.
            const categoryData = categoryMap[categoryID];
            const shapeData = shapeMap[shapeID];
            const sizeData = sizeMap[sizeID];

            //Assign the name values.
            const categoryName = categoryData ? categoryData.name : "Unknown Category";
            const shapeName = shapeData ? shapeData.name : "Unknown Shape";
            const sizeName = sizeData ? sizeData.name : "Unknown Size";

            //Check if the row values are valid.
            if(!categoryName || categoryName === "CategoryName" || !shapeName || !sizeName || batchSize === 0) {
                return; //Skip the iteration if the values are invalid.
            }

            //Run through each flavor.
            Object.keys(flavorMap).forEach(flavorID => {
                console.log("FlavorID: ", flavorID);
                const flavorData = flavorMap[flavorID];
                const { name, description } = flavorData;

                if(!name || name === "FlavorName") {
                    return; //Skip the iteration if the values are invalid.
                }
            });
        })
    }
    catch (error) {
        console.error("Error building products: ", error);
    }
}



//Helper function to rename and update column type.
const renameAndUpdateColumnType = async (table_name, column, new_column_name, new_column_type, column_data) => {
    try {
        // Rename the column
        const renamed = await columnOperations.renameColumn(table_name, column, new_column_name);
        

        // Update the column type
        console.log("(stcTestMap.js)(renameAndUpdateColumnType) new_column_type: ", new_column_type);
        const retyped = await columnOperations.updateColumnType(table_name, new_column_name, new_column_type, column_data);
        renamed;
        console.log("Retyped: ", retyped);

        

        return { success: true, message: "Column renamed and updated successfully." };
    }
    catch(error) {
        console.error("(stcTestMap.js)(renameAndUpdateColumnType) Error renaming and updating column type: ", error);
        return { success: false, message: "Internal server error." };
    }
};



//Helper function to rearrange the data into proper formation for updating the rows.
const updateRowData = async (table_name, data) => {
    try {
        const obj = { //Object to store the updated row data.
            updates: [], //Array to store the objects used for updating each row.
            table_name, //The table name.
        };

        const upd = []; //Array to store all updates.
        
        //Function to clean the row data. This function removes the _id from the row data and returns the cleaned row data.
        const cleanRowData = (rowData) => {
            const { _id, ...rest } = rowData;
            return { row: rest, row_id: _id };
        };


        //First collect all updates.
        Object.keys(data).forEach(rowKey => {
            
            const { row, row_id } = cleanRowData(data[rowKey]);
            upd.push({ row, row_id });
        });

        //Assign the collected updates to the updates property in obj.
        obj.updates = upd;

        //Update the rows.
        console.log("Updating rows with data: ", obj);
        // const result = await updateRow(obj);
        // if (!result.success) {
        //     console.log(`Failed to update rows.`);
        // }
    }
    catch(error) {
        console.error("(stcTestMap.js)(updateRowData) Error updating row data: ", error);
    }
}



//Function: Convert the foreign keys in the given map.
const convertForeignKeys = async (map, idToName) => {
    try {
        const mapName = Object.keys(map)[0]; //Get the map name.
        const tableName = mapName.replace('Map', '').charAt(0).toUpperCase() + mapName.replace('Map', '').slice(1);
        const rows = map[Object.keys(map)]; //Get the rows from the map.

        console.log("mapName: ", mapName);
        console.log("tableName: ", tableName);
        console.log("rows: ", rows);

        
        
        const columnStructure = Object.keys(rows[0]) //Get the column structure from the first row.
            .filter(column => !column.toLowerCase().startsWith(tableName.toLowerCase()))
            .filter(column => idToName ? column.endsWith('ID') : column.endsWith('Name'));

        
        //Rename and update column type for each identified column.
        columnStructure.forEach( async column => {
            console.log(`Processing column ${column}.`);
            let newColumnName = '';
            let newColumnType = '';
            const column_data = {};
            if(column.toLowerCase().includes('id')) {
                newColumnName = column.replace('ID', 'Name');
                newColumnType = 'text';
                column_data['format'] = 'text';
            }
            else if(column.toLowerCase().includes('name')) {
                newColumnName = column.replace('Name', 'ID');
                newColumnType = 'number';
                column_data['format'] = 'number';
            }
            // const newColumnName = column.replace(idToName ? 'ID' : 'Name', idToName ? 'Name' : 'ID');
            // const newColumnType = idToName ? 'text' : 'number';
            console.log(`newColumnName: ${newColumnName}, newColumnType: ${newColumnType}`);
            // await renameAndUpdateColumnType(tableName, column, newColumnName, newColumnType, column_data)
            //     .catch(error => console.error(`Error processing column ${column}: `, error));
        });

        // First, collect all changes to avoid modifying during iteration
        const changes = {};
        Object.keys(rows).forEach(row => {
            const columns = rows[row]; //Get the columns inside of the current row in rows.
            changes[row] = {_id: columns._id}; //Initialize the changes object with the current row. Not using `...columns` to prevent unchanged columns from being included.
            
            columnStructure.forEach(column => {
                const value = columns[column];
                const result = processForeignKeyConversion(column, value);
                if (result) {
                    const { newColumnName, newValue } = result;
                    delete changes[row][column];
                    changes[row][newColumnName] = newValue;
                }
            });
        });

        // Then apply all changes at once
        Object.keys(changes).forEach(row => {
            rows[row] = changes[row];
        });

        console.log("Rows after conversion: ", rows);

        
        await new Promise(resolve => setTimeout(resolve, 1000)); //Wait for 1 seconds before updating the rows. This is to ensure that the column changes are completed before updating the rows.
        await updateRowData(tableName, rows);
    }
    catch(error) {
        console.error("(stcTestMap.js)(convertForeignKeys) Error converting foreign keys: ", error);
    }
}



//Function: Process the foreign key conversion based on the column name and input value. 
const processForeignKeyConversion = (columnName, input) => {
    const camelColumnName = columnName.charAt(0).toLowerCase() + columnName.slice(1); //Convert columnName to camel case.
    const mapName = camelColumnName.replace(/ID|Name/g, '') + 'Map'; //Remove 'ID' or 'Name' from the end and replace with 'Map'.
    const map = getMaps([mapName])[mapName];

    //Begin the iteration over the map values.
    for(const entry of Object.values(map)) {
        if(entry[columnName] === input) {
            if(columnName.endsWith('ID')) {
                return {newColumnName: columnName.replace('ID', 'Name'), newValue: entry[columnName.replace('ID', 'Name')]};
            }
            else if(columnName.endsWith('Name')){
                return {newColumnName: columnName.replace('Name', 'ID'), newValue: entry[columnName.replace('Name', 'ID')]};
            }
            else {
                console.log(`Column name ${columnName} does not end with 'ID' or 'Name'.`);
            }
        }
    }
}


module.exports = { testSTCMaps };
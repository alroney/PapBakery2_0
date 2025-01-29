const { getMaps } = require('./stcMaps');
const columnOperations  = require('./stColumnController');
const { updateRow } = require('./stRowController');


const testSTCMaps = async (req, res) => {
    try {
        const unchangedMap = getMaps(['categoryShapeMap']);
        const updatedMap = convertForeignKeys(unchangedMap, true);
        updatedMap;
        res.status(200).json({ success: true, updatedMap });
    }
    catch (error) {
        console.error("(stcTestMap)(testSTCMaps) Error testing STC Maps: ", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}



const buildRecipes = (req, res) => {
    try {
        const {
            categoryIngredientMap,
            subCategoryIngredientMap,
        } = getMaps('categoryIngredientMap', 'subCategoryIngredientMap');
        const recipes = {};



    }
    catch(error) {
        console.error("Error building recipes: ", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}



const buildProducts = async (req, res) => {
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
        res.status(500).json({ success: false, message: "Internal server error." });
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
        
        //First collect all updates.
        Object.keys(data).forEach(rowKey => {
            const row_id = rowKey;
            const row = data[rowKey];
            upd.push({ row, row_id });
        });

        //Assign the collected updates to the updates property in obj.
        obj.updates = upd;

        //Update the rows.
        console.log("Updating rows with data: ", obj);
        const result = await updateRow(obj);
        if (!result.success) {
            console.log(`Failed to update rows.`);
        }
    }
    catch(error) {
        console.error("(stcTestMap.js)(updateRowData) Error updating row data: ", error);
    }
}



//Function: Convert the foreign keys in the given map.
const convertForeignKeys = async (maps, idToName) => {
    try {
        let count = 0; //Count for row iteration.
        console.log("Converting foreign keys...");
        Object.keys(maps).forEach(async map => {
            const tableName = map.replace('Map', '').charAt(0).toUpperCase() + map.replace('Map', '').slice(1);
            const rows = maps[map];

            //Get first row to determine columns. Since all rows have the same columns, we only need to check one row.
            const firstRowKey = Object.keys(rows)[0];
            if (!firstRowKey) return; //Skip if map is empty.
            
            const columnStructure = Object.keys(rows[firstRowKey])
                .filter(column => !column.toLowerCase().startsWith(tableName.toLowerCase()))
                .filter(column => idToName ? column.endsWith('ID') : column.endsWith('Name'));

            
            //Rename and update column type for each identified column.
            columnStructure.forEach( async column => {
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
                await renameAndUpdateColumnType(tableName, column, newColumnName, newColumnType, column_data)
                    .catch(error => console.error(`Error processing column ${column}: `, error));
            });

            console.log("Exited columnStructure loop.");

            // First, collect all changes to avoid modifying during iteration
            const changes = {};
            Object.keys(rows).forEach(rowKey => {
                const columns = rows[rowKey];
                changes[rowKey] = {}; //Initialize the changes object with the rowKey. Not using `...columns` to prevent unchanged columns from being included.
                
                columnStructure.forEach(column => {
                    const value = columns[column];
                    const result = processForeignKeyConversion(column, value);
                    if (result) {
                        const { newColumnName, newValue } = result;
                        delete changes[rowKey][column];
                        changes[rowKey][newColumnName] = newValue;
                    }
                });
            });

            // Then apply all changes at once
            Object.keys(changes).forEach(rowKey => {
                rows[rowKey] = changes[rowKey];
            });


            await new Promise(resolve => setTimeout(resolve, 5000)); //Wait for 5 seconds before updating the rows. This is to ensure that the column changes are completed before updating the rows.
            await updateRowData(tableName, rows);
            console.log(`Foreign keys converted for ${tableName}.`);
        });

        console.log("Foreign keys conversion complete.");
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
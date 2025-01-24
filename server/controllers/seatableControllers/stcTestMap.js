const { getMaps } = require('./stcMaps');
const { columnOperations } = require('./stColumnController');

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




// Helper function to rename and update column type
const renameAndUpdateColumnType = async (table_name, column, new_column_name, new_column_type, column_data) => {
    // Rename the column
    const renameResult = await columnOperations.renameColumn(table_name, column, new_column_name);
    if (!renameResult.success) {
        throw new Error(`Failed to rename column: ${renameResult.error}`);
    }

    // Update the column type
    const updateResult = await columnOperations.updateColumnType(table_name, new_column_name, new_column_type, column_data);
    if (!updateResult.success) {
        throw new Error(`Failed to update column type: ${updateResult.error}`);
    }

    return { success: true, message: "Column renamed and updated successfully." };
};


//Function: Convert the foreign keys in the given map.
const convertForeignKeys = async (maps, idToName) => {
    try {
        console.log("Maps: ", maps);

        
        Object.keys(maps).forEach(map => {
            const tableName = map.replace('Map', '');
            const updatedColumnsData = {};
            const conversions = []; //Collect all conversions.
            console.log("Current Map: ", map);
            const rows = maps[map];
            console.log("Rows: ", rows);
            Object.keys(rows).forEach(rowKey => {
                console.log("Row Key: ", rowKey);
                const columns = rows[rowKey];
                Object.keys(columns).forEach(column => {
                    console.log("Column: ", column);
                    if(column.toLowerCase().startsWith(tableName.toLowerCase())) return;
                    const value = columns[column];
                    const shouldConvert = idToName ? column.endsWith('ID') : column.endsWith('Name'); //If idToName is true, convert the ID to Name. If false, convert the Name to ID.
                    
                    if(shouldConvert) {
                        const result = processForeignKeyConversion(column, value);
                        if (result) {
                            console.log("Result: ", result);
                            conversions.push({rowKey, column, result});
                        }
                    }
                    else {
                        console.log(`Column ${column} does not end with 'ID' or 'Name'.`);
                    }
                });
            });

            // Apply all conversions
            for (const { rowKey, column, result } of conversions) {
                const { newColumnName, newValue } = result;
                const columns = maps[map][rowKey];
                console.log("columns: ", columns);

                if(!updatedColumnsData[newColumnName]) {
                    updatedColumnsData[newColumnName] = {};
                }
                updatedColumnsData[newColumnName][rowKey] = newValue;

                const keys = Object.keys(columns);
                console.log("Keys: ", keys);
                const newColumns = {};

                keys.forEach(key => {
                    if (key === column) {
                        newColumns[newColumnName] = newValue;
                    } else {
                        newColumns[key] = columns[key];
                    }
                });

                // Replace the row contents
                Object.keys(columns).forEach(key => delete columns[key]);
                Object.assign(columns, newColumns);

                // Rename and update column type
                const newColumnType = idToName ? 'Text' : 'Number';
                const columnData = Object.keys(updatedColumnsData[newColumnName]).map(key => ({ key, value: updatedColumnsData[newColumnName][key] }));
                console.log(`Renaming and updating column ${column} to ${newColumnName} with type ${newColumnType} and data: `, columnData);
                //await renameAndUpdateColumnType(tableName, column, newColumnName, newColumnType, columnData);
            }
        });

        

        console.log("Updated Map: ", maps);


        //Nested Function: Process the column data.
        // const processColumn = (rowKey, column, columns, idToName) => {
        //     if(column.toLowerCase().startsWith(tableName.toLowerCase())) return;
        //     const value = columns[column];
        //     const shouldConvert = idToName ? column.endsWith('ID') : column.endsWith('Name'); //If idToName is true, convert the ID to Name. If false, convert the Name to ID.
            
        //     if(shouldConvert) {
        //         const result = processForeignKeyConversion(column, value);
        //         //columnOperations.renameColumn(tableName, column, result.newColumnName);

        //         if (result) {
        //             //Store the new value with rowKey and column value.
        //             if(!updatedColumnsData[result.newColumnName]) {//If the new column name does not exist in updatedColumnsData, create it.
        //                 updatedColumnsData[result.newColumnName] = {};
        //             }
        //             updatedColumnsData[result.newColumnName][rowKey] = result.newValue;
                    
        //             const keys = Object.keys(columns);
        //             const newColumns = {};
                    
        //             keys.forEach(key => {
        //                 if (key === column) {
        //                     newColumns[result.newColumnName] = result.newValue;
        //                 } else {
        //                     newColumns[key] = columns[key];
        //                 }
                        
        //             });
        //             // Replace the row contents
        //             Object.keys(columns).forEach(key => delete columns[key]);
        //             Object.assign(columns, newColumns);
        //         }
        //     }
        //     else {
        //         console.log(`Column ${column} does not end with 'ID' or 'Name'.`);
        //     }
        // };

        // // Iterate over the map values
        // Object.values(map).forEach(row => {
        //     Object.keys(row).forEach(rowKey => {
        //         const columns = row[rowKey];
        //         Object.keys(columns).forEach(column => {
        //             processColumn(rowKey, column, columns, idToName);
        //         });
        //     });
        // });

        // console.log("updatedColumnsData: ", updatedColumnsData);
        // return map;
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
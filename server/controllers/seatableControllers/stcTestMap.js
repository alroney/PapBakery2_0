const { capitalize } = require('../../utils/helpers');
const { getMaps } = require('./stcMaps');
const columnOperations  = require('./stColumnController');
const { updateRow } = require('./stRowController');
const { createTable } = require('./stTableController');


const testSTCMaps = async (req, res) => {
    try {
        // const map = getMaps(['subCategoryIngredientMap']);
        // const updatedMap = convertForeignKeys(map, false);
        // updatedMap;
        await buildProducts();
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
                subCategoryIngredientMap, 
                flavorMap,
                flourMap,
                shapeMap, 
                sizeMap, 
                ingredientMap,
                categoryIngredientMap,
                categoryShapeMap, 
                categoryShapeSizeMap 
            } = getMaps(['categoryMap', 'subCategoryMap', 'subCategoryIngredientMap', 'flavorMap', 'flourMap', 'shapeMap', 'sizeMap', 'ingredientMap', 'categoryIngredientMap', 'categoryShapeMap', 'categoryShapeSizeMap']);
        const products = [];

        //Function (helper): Transform the map into a usable format. 
        const transformMap = (map, tableName) => {
            return map.reduce((acc, item) => {
                const tableIdKey = `${tableName}ID`;
                const tableIdValue = item[tableIdKey];
                const { _id, [tableIdKey]: idToRemove, ...rest } = item; //Destructure the _id and tableIdKey from the item.
                acc[tableIdValue] = rest;
                return acc;
            }, {});
        };

        const categoryMapT = transformMap(categoryMap, 'category');
        const subCategoryMapT = transformMap(subCategoryMap, 'subCategory');
        const subCategoryIngredientMapT = transformMap(subCategoryIngredientMap, 'subCategoryIngredient');
        const flavorMapT = transformMap(flavorMap, 'flavor');
        const flourMapT = transformMap(flourMap, 'flour');
        const shapeMapT = transformMap(shapeMap, 'shape');
        const sizeMapT = transformMap(sizeMap, 'size');
        const ingredientMapT = transformMap(ingredientMap, 'ingredient');
        const categoryIngredientMapT = transformMap(categoryIngredientMap, 'categoryIngredient');
        const categoryShapeMapT = transformMap(categoryShapeMap, 'categoryShape');
        const categoryShapeSizeMapT = transformMap(categoryShapeSizeMap, 'categoryShapeSize');
        

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

        // const tableData = {
        //     table_name: 'Products',
        //     columns
        // };

        // // Create the table
        // await createTable(tableData);
        let cssmtCount = 0;
        Object.keys(categoryShapeSizeMapT).forEach(key => {
            if(cssmtCount > 0) {
                return;
            }
            cssmtCount++;
            let tempIngredients = {};
            const { categoryShapeID, sizeID, batchSize } = categoryShapeSizeMapT[key];
            const { categoryID, shapeID } = categoryShapeMapT[categoryShapeID];


            console.log(`Category: ${categoryID}, Shape: ${shapeID}, Size: ${sizeID}`);
            
            
            // Function to generate all combinations of ingredients
            function generateCombinations(categories, index, currentCombination, allCombinations) {
                if (index === categories.length) {
                    allCombinations.push({ ...currentCombination });
                    return;
                }

                const category = categories[index];
                category.forEach(ingredient => {
                    currentCombination[ingredient.name] = ingredient;
                    generateCombinations(categories, index + 1, currentCombination, allCombinations);
                    delete currentCombination[ingredient.name];
                });
            }

            // Collect ingredients by category
            let ingredientsByCategory = {};
            Object.keys(categoryIngredientMapT).forEach(categoryIngredientKey => {
                const categoryIngredientData = categoryIngredientMapT[categoryIngredientKey];
                const { ingredientCategory, quantity } = categoryIngredientData;
                const catID = categoryIngredientData.categoryID;
                if ( catID !== categoryID) {
                    return;
                }
                else {
                    if (!ingredientsByCategory[ingredientCategory]) {
                        ingredientsByCategory[ingredientCategory] = [];
                    }

                    // Collect ingredients for the category and quantity used in the recipe.
                    Object.keys(ingredientMapT).forEach(ingredientKey => {
                        const ingredientData = ingredientMapT[ingredientKey];
                        if (ingredientData.ingredientCategory === ingredientCategory) {
                            let specialID = 0;
                            const { ingredientName, costPerUnit } = ingredientData;
                            switch(ingredientCategory.toLowerCase()) {
                                case 'flavor agent': {
                                    Object.keys(flavorMapT).forEach(flavorKey => {
                                        const flavor = flavorMapT[flavorKey];
                                        if (flavor.flavorName === ingredientName) {
                                            specialID = flavorKey;
                                            return;
                                        }
                                    });

                                    break;
                                };
                                case 'flour': {
                                    Object.keys(flourMapT).forEach(flourKey => {
                                        const flour = flourMapT[flourKey];
                                        if ((flour.type + ' Flour') === ingredientName) {
                                            specialID = flourKey;
                                            return;
                                        }
                                    });

                                    break;
                                };
                                default: {
                                    console.log("No special ID found for ingredient category: ", ingredientCategory);
                                    specialID = 0;
                                    break;
                                };
                            }
                            ingredientsByCategory[ingredientCategory].push({ 
                                name: ingredientName, 
                                quantity, 
                                costPerUnit,
                                ...(specialID !== 0 && { specialID }) // Add special ID if it exists
                            });
                        }
                    });
                }
            });
            

            //Each category can have multiple subcategories.
            Object.keys(subCategoryMapT).forEach(subCategoryKey => {
                const subCategoryData = subCategoryMapT[subCategoryKey];
                const { subCategoryName } = subCategoryData;
                const scd_categoryID = subCategoryData.categoryID;
                const scd_description = subCategoryData.description;
                
                if(scd_categoryID !== categoryID) { //If the foreign key does not match, skip the current iteration.
                    return;
                }

                else { //If the categoryID foreign key matches the categoryID, then look in the subCategoryIngredientMap for the ingredients used in the subcategory.
                    Object.keys(subCategoryIngredientMapT).forEach(subCategoryIngredientKey => {
                        const subCategoryIngredientData = subCategoryIngredientMapT[subCategoryIngredientKey];
                        const { subCategoryID, ingredientID, quantity } = subCategoryIngredientData;
                        if(subCategoryID !== Number(subCategoryKey)) {
                            return;
                        }
                        else {
                            
                            Object.keys(ingredientMapT).forEach(ingredientKey => { //Iterate over the ingredientMapT to get the ingredient data.
                                const ingredientData = ingredientMapT[ingredientKey];
                                if(ingredientID === Number(ingredientKey)) {
                                    const { ingredientName, costPerUnit } = ingredientData;
                                    tempIngredients[ingredientName] = { quantity, costPerUnit };
                                    return true;
                                }
                            });
                            
                        }
                    });
                }
            }); //End of subCategoryMapT iteration.

            // Generate all combinations
            let allCombinations = [];
            generateCombinations(Object.values(ingredientsByCategory), 0, {}, allCombinations);

            allCombinations.forEach(combination => {
                // Add ingredients from the combination to tempIngredients
                Object.keys(combination).forEach(ingredientName => {
                    tempIngredients[ingredientName] = {
                        quantity: combination[ingredientName].quantity,
                        costPerUnit: combination[ingredientName].costPerUnit,
                        ...(combination[ingredientName].specialID && { specialID: combination[ingredientName].specialID })
                    };
                });
                
                console.log("Current ingredient combination:", tempIngredients);
                
                // Clear the added ingredients to prepare for next combination
                Object.keys(combination).forEach(ingredientName => {
                    delete tempIngredients[ingredientName];
                });
            });
            
            console.log("Count: ", cssmtCount);
        });
        
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
        retyped;

        

        return { success: true, message: "Column renamed and updated successfully." };
    }
    catch(error) {
        // console.error("(stcTestMap.js)(renameAndUpdateColumnType) Error renaming and updating column type: ", error);
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
            console.log("row: ", row);
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
const convertForeignKeys = async (map, idToName) => {
    try {
        const mapName = Object.keys(map)[0]; //Get the map name.
        const table_name = mapName.replace('Map', '').charAt(0).toUpperCase() + mapName.replace('Map', '').slice(1);
        const rows = map[Object.keys(map)]; //Get the rows from the map.

        console.log("mapName: ", mapName);
        console.log("table_name: ", table_name);

        
        
        const columnStructure = Object.keys(rows[0]) //Get the column structure from the first row.
            .filter(column => !column.toLowerCase().startsWith(table_name.toLowerCase()))
            .filter(column => idToName ? column.endsWith('ID') : column.endsWith('Name'));

        console.log("columnStructure: ", columnStructure);

        
        //Rename and update column type for each identified column.
        columnStructure.forEach( async column => {
            column = capitalize(column); //Capitalize the first letter of the column name.
            console.log(`Processing column ${column}.`);
            let newColumnName = '';
            let newColumnType = '';
            const column_data = {};
            if(column.endsWith('ID')) {
                newColumnName = column.replace('ID', 'Name');
                newColumnType = 'text';
                column_data['format'] = 'text';
            }
            else if(column.endsWith('Name')) {
                newColumnName = column.replace('Name', 'ID');
                newColumnType = 'number';
                column_data['format'] = 'number';
            }

            console.log("column: ", column);
            console.log(`newColumnName: ${newColumnName}, newColumnType: ${newColumnType}`);
            await renameAndUpdateColumnType(table_name, column, newColumnName, newColumnType, column_data)
                .catch(error => console.error(`Error processing column ${column}: `, error));
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
                    changes[row][capitalize(newColumnName)] = newValue; //Assign the new value to the new column name. Capitalize the first letter of the new column name.
                }
            });
        });

        // Then apply all changes at once
        Object.keys(changes).forEach(row => {
            rows[row] = changes[row];
        });

        console.log("Rows after conversion: ", rows);

        
        await new Promise(resolve => setTimeout(resolve, 1000)); //Wait for 1 seconds before updating the rows. This is to ensure that the column changes are completed before updating the rows.
        await updateRowData(table_name, rows); //Update the rows with the converted foreign keys.
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
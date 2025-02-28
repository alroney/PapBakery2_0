const { capitalize, decapitalize } = require('../../utils/helpers');
const { getMaps } = require('./stcMaps');
const columnOperations  = require('./stColumnController');
const { updateRow, appendRow } = require('./stRowController');
const { createTable, deleteTable } = require('./stTableController');
const { convertUnit, convertPricePerUnit } = require('../../utils/unitConversion');
const { getTableDataDirectly, updateTableData, syncSeaTableData } = require('./stDataController');
const fs = require('fs');
const path = require('path');


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


const convertFKeys = async (req, res) => {
    try {
        const map = await getMaps([(req.body.tableName)+'Map']);
        const updatedMap = await convertForeignKeys(map, req.body.isToName);
        res.status(200).json({ success: true, result: updatedMap });
    }
    catch(error) {
        console.error("(stcTestMap)(convertFKeys) Error converting foreign keys: ", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}



//Function: Update the products table using a combination of the maps.
const updateProductsTable = async (req, res) => {
    try {
        const table_name = 'Products-A';
        let clearedToContinue = true;
        const existingMaps = await getMaps(['products-AMap']);

        if (existingMaps['Products-AMap']) {
            console.log("Deleting old table...");
            clearedToContinue = await deleteOldTable(table_name);
        }

        if(clearedToContinue) {
            const products = await buildProducts();
            const columns = [
                {
                    column_name: 'ProductID',
                    column_type: 'auto-number',
                    column_data: { format: "0" }
                },
                {
                    column_name: 'ProductSKU',
                    column_type: 'text',
                },
                {
                    column_name: 'ProductAvailable',
                    column_type: 'checkbox',
                },
                {
                    column_name: 'ProductName',
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
                },
            ]
            
            await createNewTable(table_name, columns);
            await appendRow({ table_name, rows: products });
            res.status(200).json({ success: true, message: "Products-A table created successfully." });
        }
        else { 
            console.log("Failed to update products table.");
            res.status(500).json({ success: false, message: "Failed to update products table." });
        }

    }
    catch(error) {
        console.error("(stcTestMap)(updateProductData) Error updating product data: ", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}



//Function: Delete a table by table name.
const deleteOldTable = async (table_name) => {
    try {
        const isDeleted = await deleteTable(table_name);
        return isDeleted.success;
    }
    catch(error) {
        console.error("(stcTestMap)(deleteOldTable) Error deleting old table: ", error);
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
        console.error("(stcTestMap)(createNewTable) Error creating new table: ", error);
    }
}



//Function: Find all possible combinations of ingredients for a given category and subcategory, then build the recipe for each combination.
const buildRecipes = (categoryIngredientMapT, ingredientMapT, categoryID) => {
    try {
        const ingredientsByCategory = Object.keys(categoryIngredientMapT).reduce((acc, categoryIngredientKey) => { //Reduce the categoryIngredientMapT to an object.
            const { IngredientCategory: ingredientCategory, Quantity: quantity, CategoryID: catID } = categoryIngredientMapT[categoryIngredientKey];
            

            if (catID !== categoryID) return acc; //Skip the current iteration if the categoryID does not match the categoryID.

            if (!acc[ingredientCategory]) acc[ingredientCategory] = []; //Initialize the array for the ingredient category.
            for (const ingredientKey in ingredientMapT) { //Iterate over the ingredientMapT to get the ingredient data.
                const ingredientData = ingredientMapT[ingredientKey];
                if (ingredientData.IngredientCategory === ingredientCategory) {
                    const { IngredientName: ingredientName, CostPerUnit: costPerUnit, UnitType: unitType, IngredientAvailable: ingAvail} = ingredientData;
                    const cost = quantity * convertPricePerUnit(costPerUnit, unitType, 'g'); //Calculate the cost of the ingredient.
                    acc[ingredientCategory].push({ name: ingredientName, quantity, cost, ingID: ingredientKey, ingCat: ingredientCategory, ingAvail });
                }
            }
            return acc;
        }, {});

        const allCombinations = [];
        //Function: Generate all possible combinations of ingredients for a given category. Time complexity is O(n^m) where n is the number of categories and m is the number of ingredients in each category.
        const generateCombinations = (categories, index, currentCombination) => {
            if (index === categories.length) {
                allCombinations.push({ ...currentCombination });
                return;
            }
            categories[index].forEach(ingredient => {
                currentCombination[ingredient.name] = ingredient;
                generateCombinations(categories, index + 1, currentCombination); //Recursively call the function to generate the next combination.
                delete currentCombination[ingredient.name]; //Remove the ingredient from the current combination to prevent mutation.
            });
        };
        generateCombinations(Object.values(ingredientsByCategory), 0, {}); //Generate all combinations of ingredients using the category.

        return allCombinations;
    }
    catch (error) {
        console.error("Error building recipes: ", error);
        console.log("Check for an conversions that may be causing the error.");
    }
};



//Function: Transform the map into a more usable format.
const transformMap = (map, tableName, cache) => {
    if (cache[tableName]) return cache[tableName]; //Check if the transformed map is already in the cache.
    const transformed = map.reduce((acc, item) => { //Reduce the map to an object.
        const tableIdKey = `${tableName}ID`; //Set the key to the value of the tableNames' primary key value.
        const tableIdValue = item[tableIdKey];
        const { _id, [tableIdKey]: idToRemove, ...rest } = item;
        acc[tableIdValue] = rest;
        return acc;
    }, {});
    cache[tableName] = transformed;
    return transformed;
};



//Function: Build the products from the maps.
const buildProducts = async () => {
    console.log("Building products...");
    try {
        const maps = await getMaps([
            'categoryMap', 'subCategoryMap', 'subCategoryIngredientMap', 'flavorMap', 'flourMap', 
            'shapeMap', 'sizeMap', 'ingredientMap', 'categoryIngredientMap', 'categoryShapeMap', 'categoryShapeSizeMap'
        ]);

        const cache = {};
        const transformedMaps = Object.keys(maps).reduce((acc, key) => {
            const tableName = key.replace('Map', '');
            acc[decapitalize(key) +'T'] = transformMap(maps[key], tableName, cache); //Transform the map and store it in transformedMaps.
            return acc;
        }, {});

        let { 
            categoryMapT, subCategoryMapT, subCategoryIngredientMapT, flavorMapT, flourMapT, 
            shapeMapT, sizeMapT, ingredientMapT, categoryIngredientMapT, categoryShapeMapT, categoryShapeSizeMapT 
        } = transformedMaps;

        let restartLoop = false;
        let restartCount = 0;

        //Function: Generate the products from the maps.
        const generateProducts = async () => {
            const products = [];
            for (const key in categoryShapeSizeMapT) { //Iterate over the categoryShapeSizeMapT to get the categoryShapeSize data.
                let productAvailable = true;
                const { CategoryShapeID: categoryShapeID, SizeID: sizeID, BatchSize: batchSize } = categoryShapeSizeMapT[key];
                const { CategoryID: categoryID, ShapeID: shapeID } = categoryShapeMapT[categoryShapeID];
                
                const categoryDesc = categoryMapT[categoryID].Description;
                const sizeDesc = sizeMapT[sizeID].Description;
                const shapeDesc = shapeMapT[shapeID].Description;

                const allCombinations = buildRecipes(categoryIngredientMapT, ingredientMapT, categoryID); //Build all possible combinations of ingredients for the category.

                for (const combination of allCombinations) {
                    productAvailable = true; //Reset availability status for each combination iteration.
                    // console.log("In Combination Loop");
                    for (const subCategoryKey in subCategoryMapT) { //Iterate over the subCategoryMapT to get the subCategory data.
                        const tempIngredients = { ...combination }; //Copy the combination to prevent mutation. This will be used to store the ingredients for the current product.
                        const { SubCategoryName: subCategoryName, CategoryID: scd_categoryID, Description: scd_description } = subCategoryMapT[subCategoryKey];
                        if (scd_categoryID !== categoryID) continue;

                        for (const subCategoryIngredientKey in subCategoryIngredientMapT) { //Iterate over the subCategoryIngredientMapT to get the subCategoryIngredient data.
                            // console.log("In SubCategoryIngredient Loop");
                            // console.log("SubCategoryIngredientKey: ", subCategoryIngredientKey);
                            // console.log("The SCIMT map: ", subCategoryIngredientMapT[subCategoryIngredientKey]);

                            const { SubCategoryID: subCategoryID, IngredientID: ingredientID, Quantity: quantity } = subCategoryIngredientMapT[subCategoryIngredientKey];
                            
                            //Fix the columns of the map if it is not in ID format.
                            if((subCategoryID === undefined || ingredientID === undefined) && restartCount < 1) {
                                console.log("A table may be in the wrong conversion state. Converting foreign keys... ");
                                await convertForeignKeys({SubCategoryIngredientMap: maps.SubCategoryIngredientMap}, false);
                                subCategoryMapT = await transformMap( getMaps(['subCategoryIngredientMap']), 'SubCategoryIngredient', cache);
                                restartLoop = true;
                                restartCount++;
                                return;
                            }

                            if (subCategoryID !== Number(subCategoryKey)) continue;

                            for (const ingredientKey in ingredientMapT) { //Iterate over the ingredientMapT to get the ingredient data.
                                const { IngredientName: ingredientName, CostPerUnit: costPerUnit, UnitType: unitType, IngredientAvailable: ingAvail, IngredientCategory: ingCat } = ingredientMapT[ingredientKey];
                                
                                if (ingredientID === Number(ingredientKey)) {
                                    const cost = quantity * convertPricePerUnit(costPerUnit, unitType, 'g');
                                    tempIngredients[ingredientName] = { quantity, cost, ingCat, ingID: ingredientKey };
                                }

                                
                            }
                        }
                        const recipeIngredients = Object.entries(tempIngredients).reduce((acc, [name, data]) => {
                            
                            if (data.ingCat && data.ingID) {
                                let firstWord = data.ingCat.split(' ')[0]; // Get the first word of the ingredient category.
                                firstWord = capitalize(firstWord.toLowerCase()); // Capitalize the first word.
                                const mapKey = `${decapitalize(firstWord)}MapT`; //Get the map that is associated with the ingredient category.
                                if (transformedMaps[mapKey]) { //Check if the map exists in transformedMaps.
                                    if(!data.ingAvail) productAvailable = false; //Set the product availability to false if the ingredient is not available.
                                    
                                    const specialID = Object.keys(transformedMaps[mapKey]).find(key => {
                                        
                                        if (transformedMaps[mapKey][key][`${firstWord}Name`] === ingredientMapT[data.ingID].IngredientName) {
                                            return key;
                                        }
                                        
                                    });
                                    acc[decapitalize(firstWord)] = { id: specialID, name: specialID ? transformedMaps[mapKey][specialID][`${firstWord}Name`] : '' };
                                } else { //The map does not exist therefore no specialID is necessary for the ingredient.
                                    acc[decapitalize(firstWord)] = { id: '0', name: '' };
                                }
                            } else {
                                acc[name] = { id: '0', name };
                            }
                            return acc;
                        }, {}); //Initialize the recipeIngredients object.

                        const flavorDesc = recipeIngredients.flavor ? flavorMapT[recipeIngredients.flavor.id].Description : 'No Description for Flavor';
                        const sku = `${subCategoryKey}${recipeIngredients.flavor.id}${shapeID}-${sizeID}${recipeIngredients.flour.id}`;
                        const sortedIngredients = Object.entries(tempIngredients).map(([name, data]) => ({ // Sort the ingredients by amount used in the recipe.
                            name,
                            quantity: name === 'Egg' ? data.quantity * 48 : data.quantity,
                            cost: data.cost,
                            ...(data.specialID && { specialID: data.specialID })
                        })).sort((a, b) => b.quantity - a.quantity);

                        const ingredientList = sortedIngredients.map(item => item.name).join(', '); //Setup the ingredient list for the product formatted to be divided by commas.
                        const recipeCost = sortedIngredients.reduce((total, item) => total + item.cost, 0); //Calculate the total cost of the recipe.
                        const productDesc = `${categoryDesc} ${flavorDesc} ${scd_description} ${shapeDesc} ${sizeDesc}`;
                        const productName = `${sizeMapT[sizeID].SizeName} ${subCategoryName} ${recipeIngredients.flavor.name} ${categoryMapT[categoryID].CategoryName}`;
                        
                        products.push({ //Push the product data to the products array.
                            ProductSKU: String(sku),
                            ProductAvailable: productAvailable,
                            ProductName: productName,
                            RecipeCost: Number(recipeCost.toFixed(4)),
                            Description: productDesc,
                            Ingredients: ingredientList,
                        });
                    } //End of iteration over subCategoryMapT.
                } //End of iteration over allCombinations.
            } //End of iteration over categoryShapeSizeMapT.
            return products;
        }
        let allProducts = [];
        do {
            allProducts = generateProducts();
        } while (restartLoop && restartCount < 1);

        return allProducts;
    } 
    catch(error) {
        console.error("Error building products: ", error);
    }
};



//Function: Rename and update column type.
const renameAndUpdateColumnType = async (table_name, column, new_column_name, new_column_type, column_data) => {
    try {
        // Rename the column
        const renamed = await columnOperations.renameColumn(table_name, column, new_column_name);

        // Update the column type
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
        console.error("(stcTestMap.js)(updateRowData) Error updating row data: ", error);
    }
}



//Function: Convert the foreign keys in the given map.
const convertForeignKeys = async (map, idToName) => {
    console.log("(stcTestMap.js)(convertForeignKeys) Converting foreign keys...");
    try {
        let isCacheFound = false;
        const filePath = path.join(__dirname, '../../cache/cachedTables.json');
        if(fs.existsSync(filePath)) {
            isCacheFound = true;
            console.log("(stcTestMap.js)(convertForeignKeys) Cache found!");
        }

        console.log("Map: ", map);
        const mapName = Object.keys(map)[0]; //Get the map name.
        const table_name = mapName.replace('Map', ''); //Get the table name from the map name.
        const rows = map[Object.keys(map)]; //Get the rows from the map.
        const columnsRenamed = {}; //Object to store the columns that will be renamed.

        const columnStructure = Object.keys(rows[0]) //Get the column structure from the first row.
            .filter(column => !column.startsWith(table_name)) //Filter out columns that start with the table name.
            .filter(column => idToName ? column.endsWith('ID') : column.endsWith('Name'));

        //Create a list of columns that may need to be renamed and updated.
        columnStructure.map(column => {
            const isIdColumn = column.endsWith('ID');
            const newColumnName = isIdColumn ? column.replace('ID', 'Name') : column.replace('Name', 'ID');
            const newColumnType = isIdColumn ? 'text' : 'number';
            
            columnsRenamed[column] = { newColumnName, newColumnType }; //Store the newColumnName (value) with the column being replaced (key) in columnsRenamed.
        });

        //Proceed if the cache is found.
        if(isCacheFound) {
            const tableData = await getTableDataDirectly(table_name);
            if (!tableData?.rows?.length) {
                console.error('Failed to get table data for:', table_name);
                return;
            }

            const columnRenameMap = new Map(Object.entries(columnsRenamed)); //Create a map of the columns to rename.
            const originalOrder = Object.keys(tableData.rows[0]); //Get the original order of the columns.

            //Update rows without altering position.
            tableData.rows = tableData.rows.map(row => 
                Object.fromEntries(
                    originalOrder.map(key => [
                        columnRenameMap.get(key) || key, //Get the new column name or the original column name.
                        row[key]
                    ])
                )
            );
            
            const changes = {}; //Temporary Object to store the changes made to the rows.
            //Process the foreign key conversion for each row. Using `Promise.all` with map processes all operations in parallel (faster but more memory intensive).
            await Promise.all(Object.keys(rows).map(async row => {
                const columns = rows[row];
                changes[row] = {_id: columns._id}; //Store the _id in the changes object. 
                
                //Proccess the foreign key conversion for each column in the column structure.
                await Promise.all(columnStructure.map(async column => {
                    const value = columns[column];
                    const result = await processForeignKeyConversion(table_name, column, value);
                    if(result.newValue === undefined) { //Skip columns that have no valid new value.
                        return;
                    }
                    else {
                        const { newColumnName, newValue } = result;
                        delete changes[row][column];
                        changes[row][newColumnName] = newValue;
                    }
                }));
            }));

            //Apply changes to rows. This removes the row count keys created by the temporary changes object.
            Object.keys(changes).forEach(row => {
                rows[row] = changes[row];
            });
            
            let columnUpdated = {}; //Object to store the column update result.
            const columnsUpdating = Object.entries(columnsRenamed)
                .filter(([_, {newColumnName}]) => newColumnName !== '_id' && Object.keys(rows[0]).includes(newColumnName))
                .reduce((acc, [oldColumn, {newColumnName, newColumnType}]) => {
                    acc[oldColumn] = {newColumnName, newColumnType};
                    return acc;
                }, {});

            await Promise.all(
                Object.entries(columnsUpdating)
                    .map(async ([oldColumn, {newColumnName, newColumnType}]) => {
                        try {
                            columnUpdated = await renameAndUpdateColumnType(
                                table_name,
                                oldColumn,
                                newColumnName,
                                newColumnType,
                                { format: newColumnType }
                            );
                        } catch (err) {
                            return console.error(`Failed to process column ${oldColumn}:`, err);
                        }
                    })
            );

            if(!columnUpdated.success) return { success: false, message: "(stcTestMaps.js)(convertForeignKeys) Failed to complete foreign key conversion: seatable column did not update." };

            console.log(columnUpdated.message);
            await new Promise(resolve => setTimeout(resolve, 1000)); //Wait for 1 seconds before updating the rows. This is to ensure that the column changes are completed before updating the rows.
            const rowUpdated = await updateRowData(table_name, rows); //Update the rows with the converted foreign keys.

            if(!rowUpdated) return { success: false, message: "(stcTestMaps.js)(convertForeignKeys) Failed to complete foreign key conversion: seatable row did not update." };

            //Once both the columns and rows are updated in SeaTable, we can update them in the cache.
            await updateTableData(table_name, rows, columnsUpdating);
        }

        

        
        
    }
    catch(error) {
        console.error("(stcTestMap.js)(convertForeignKeys) Error converting foreign keys: ", error);
    }
}



//Function: Process the foreign key conversion based on the column name and input value. 
const processForeignKeyConversion = async (tableName, columnName, input) => {
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
            let newValue = isToName ? String(matchingRow[newColumnName]) : Number(matchingRow[newColumnName]); //Get the new value from the matching row. Convert typeOf to match the new value.
            return { newColumnName, newValue }; //Return the new column name and new value.
        }

        console.log(`No matching row found for column ${columnName} and input ${input}.`);
        return { columnName, input }; //Return the original column name and input if no matching row is found.
    }
    catch(error) {
        console.error("(stcTestMap.js)(processForeignKeyConversion) Error processing foreign key conversion: ", error);
    }
}



module.exports = { testSTCMaps, updateProductsTable, convertFKeys};
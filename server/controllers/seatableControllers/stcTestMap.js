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


const getNutritionFact = async (req, res) => {
    try {
        const result = await generateRecipeNutritionFact();
        res.status(200).json({ success: true, result });
    }
    catch(error) {
        console.error("(stcTestMap)(getNutritionFact) Error getting nutrition fact: ", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}



const generateRecipeNutritionFact = async () => {
    try {
        const maps = await getMaps([
            'categoryMap', 'ingredientMap', 'categoryIngredientMap', 'subCategoryMap', 'subCategoryIngredientMap'
        ]);

        console.log("Map: ", maps.CategoryMap);

        const transformedMaps = Object.keys(maps).reduce((acc, key) => {
            const tableName = key.replace('Map', '');

            acc[decapitalize(key) +'T'] = transformMap(maps[key], tableName, {}); //Transform the map and store it in transformedMaps.
            return acc;
        }, {});

        let { 
            categoryMapT, ingredientMapT, categoryIngredientMapT, subCategoryMapT, subCategoryIngredientMapT
        } = transformedMaps;

        let allCombinations = [];

        // for(categoryID in categoryMapT) {
        //     const combination = buildRecipes(categoryIngredientMapT, ingredientMapT, Number(categoryID));
        //     allCombinations.push(combination);
        // }

        // return allCombinations;

        return buildRecipes2(categoryMapT, categoryIngredientMapT, subCategoryMapT, subCategoryIngredientMapT, ingredientMapT);
    }
    catch(error) {
        console.error("(stcTestMap)(getNutritionFact) Error getting nutrition fact: ", error);
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




const buildRecipes2 = (categoryMapT, categoryIngredientMapT, subCategoryMapT, subCategoryIngredientMapT, ingredientMapT) => {
    try {
        console.log("MapT: ", categoryMapT);
        let hasSubCatIng = false;
        //Check if subCategoryIngredientMapT has ingredients for any subcategories
        hasSubCatIng = Object.values(subCategoryIngredientMapT).some(({ SubCategoryID }) => 
            Object.keys(subCategoryMapT).includes(SubCategoryID.toString())
        );

        if (!hasSubCatIng) {
            return 'No SubCategories have ingredients';
        }

        const recipesBySubCategory = {};

        // Group ingredients by subcategory
        for (const subCatKey in subCategoryMapT) {
            const subCategory = subCategoryMapT[subCatKey];
            const subCatID = parseInt(subCatKey);
            const categoryID = subCategory.CategoryID;
            
            // Get base ingredients for this subcategory's category
            const baseIngredients = Object.entries(subCategoryIngredientMapT)
            .filter(([_, ingData]) => ingData.SubCategoryID === subCatID)
            .map(([_, ingData]) => ({
                ingredientID: ingData.IngredientID,
                quantity: ingData.Quantity
            }));

            // Get category ingredients
            const categoryIngredients = Object.entries(categoryIngredientMapT)
            .filter(([_, ingData]) => ingData.CategoryID === categoryID)
            .map(([_, ingData]) => ({
                ingredientID: ingData.IngredientID,
                quantity: ingData.Quantity
            }));

            // Combine both ingredient lists
            if (baseIngredients.length > 0 || categoryIngredients.length > 0) {
            recipesBySubCategory[subCatKey] = {
                baseIngredients: [...baseIngredients, ...categoryIngredients],
                name: subCategory.SubCategoryName,
                categoryID: categoryID
            };
            }
        }

        // Calculate final recipes with costs
        const finalRecipes = {};
        for (const [subCatKey, recipe] of Object.entries(recipesBySubCategory)) {
            const ingredients = recipe.baseIngredients.map(ing => {
            const ingredientData = ingredientMapT[ing.ingredientID];
            return {
                name: ingredientData.IngredientName,
                quantity: ing.quantity,
                cost: ing.quantity * convertPricePerUnit(ingredientData.CostPerUnit, ingredientData.UnitType, 'g'),
                category: ingredientData.IngredientCategory
            };
            });

            finalRecipes[subCatKey] = {
            name: recipe.name,
            ingredients,
            totalCost: ingredients.reduce((sum, ing) => sum + ing.cost, 0)
            };
        }

        return finalRecipes;
        
    }
    catch(error) {
        console.error("Error building recipes2: ", error);
    }
}



//Function: Find all possible combinations of ingredients for a given category and subcategory, then build the recipe for each combination.
const buildRecipes = async (req, res) => {
    try {
        console.log("Building recipes...");

        //Fetch all necessary maps
        const { CategoryIngredientMap: categoryIngredientMap, IngredientMap: ingredientMap, ...maps } = await getMaps([
            'categoryMap', 'categoryIngredientMap', 'ingredientMap', 'subCategoryMap', 'subCategoryIngredientMap', 'flourMap', 'flavorMap'
        ]);

        let allCombinations = [];

        //Process each category one at a time.
        for (const { CategoryID: categoryID, CategoryName: categoryName } of maps.CategoryMap) {
            console.log("\nProcessing Category:", categoryID);

            //#region - Step 1: Get base category ingredients.
            const categoryIngredients = Object.entries(categoryIngredientMap)
                .filter(([_, { CategoryID: catID }]) => catID === categoryID)
                .reduce((acc, [_, { IngredientCategory: category, Quantity: quantity }]) => {
                    if (!acc[category]) acc[category] = [];

                    const matchingIngredients = Object.entries(ingredientMap)
                        .filter(([_, ing]) => ing.IngredientCategory === category)
                        .map(([id, ing]) => ({
                            name: ing.IngredientName,
                            quantity,
                            cost: Number((quantity * convertPricePerUnit(ing.CostPerUnit, ing.UnitType, 'g')).toFixed(4)),
                            ingID: parseInt(id) + 1,
                            ingCat: category,
                            ingAvail: ing.IngredientAvailable
                        }));

                    acc[category].push(...matchingIngredients);
                    return acc;
                }, {});
            //#endregion - End of Step 1.

            //#region - Step 2: Generate base combinations for category.
            const baseCombinations = [];
            const generateBaseCombinations = (categories, index = 0, combo = {}) => {
                if (index === Object.keys(categories).length) {
                    baseCombinations.push({
                        RecipeMeta: { categoryID, ingCatIDs: {} },
                        ...combo
                    });
                    return;
                }

                const currentCategory = Object.values(categories)[index];
                for (const ingredient of currentCategory) {
                    generateBaseCombinations(
                        categories,
                        index + 1,
                        { ...combo, [ingredient.name]: { ...ingredient } }
                    );
                }
            };

            generateBaseCombinations(categoryIngredients);
            //#endregion - End of Step 2.

            //#region - Step 3: For each base combination, create variations with subcategories.
            const subcategories = maps.SubCategoryMap.filter(sc => sc.CategoryID === categoryID);

            for (const {SubCategoryID: subCatID, SubCategoryName: subCatName, Description: subCatDesc} of subcategories) {
                //Get subcategory ingredients.
                const subCatIngredients = maps.SubCategoryIngredientMap
                .filter(sci => parseInt(sci.SubCategoryID) === parseInt(subCatID))
                .map(({ IngredientID, Quantity }) => {
                    const ingredient = ingredientMap.find(ing => parseInt(ing.IngredientID) === parseInt(IngredientID));
                    return [
                        ingredient.IngredientName,
                        {
                            quantity: Quantity,
                            cost: Number((Quantity * convertPricePerUnit(ingredient.CostPerUnit, ingredient.UnitType, 'g')).toFixed(4)),
                            ingCat: ingredient.IngredientCategory,
                            ingID: IngredientID,
                            ingAvail: ingredient.IngredientAvailable
                        }
                    ];
                });
                
                

                //Create new combinations for each subcategory.
                for (const baseCombination of baseCombinations) {
                    //Get ingredient category IDs for ingredients that have their own table.
                    const specialIngredients = Object.entries(baseCombination)
                    .filter(([key, value]) => key !== 'RecipeMeta' && value.ingCat)
                    .reduce((acc, [ingredient, { ingCat }]) => {
                        const firstWord = capitalize(ingCat.split(' ')[0].toLowerCase());
                        const mapKey = `${firstWord}Map`;

                        if (maps[mapKey]) {
                            const specialID = maps[mapKey].find(
                                item => item[`${firstWord}Name`] === ingredient
                            )?.[`${firstWord}ID`];

                            if (specialID) {
                                acc[`${decapitalize(firstWord)}ID`] = parseInt(specialID);
                            }
                        }
                        return acc;
                    }, {});

                    baseCombination.RecipeMeta.ingCatIDs = specialIngredients;

                    
                    //Create new combination with base + subcategory ingredients.
                    const newCombination = {
                        ...baseCombination,
                        RecipeMeta: {
                            categoryID: baseCombination.RecipeMeta.categoryID,
                            subCategoryID: subCatID,
                            ingCatIDs: baseCombination.RecipeMeta.ingCatIDs
                        }
                    };

                    //Add subcategory ingredients.
                    Object.assign(newCombination, Object.fromEntries(subCatIngredients));
                    const ingredientCatIDs = baseCombination.RecipeMeta.ingCatIDs;
                    const flvName = ingredientCatIDs.flavorID ? maps.FlavorMap.find(fl => fl.FlavorID === ingredientCatIDs.flavorID).FlavorName : 'No Flavor Name';
                    const flvDesc = ingredientCatIDs.flavorID ? maps.FlavorMap.find(fl => fl.FlavorID === ingredientCatIDs.flavorID).Description : 'No Description for Flavor';
                    // flrName = ingredientCatIDs.flourID ? maps.FlourMap.find(fl => fl.FlourID === ingredientCatIDs.flourID).FlourName : 'No Flour Name';
                    // flrDesc = ingredientCatIDs.flourID ? maps.FlourMap.find(fl => fl.FlourID === ingredientCatIDs.flourID).Description : 'No Description for Flour';

                    const recipeName = `${flvName} ${subCatName} ${categoryName}`
                    console.log("Recipe Name: ", recipeName);
                    //Calculate total recipe cost.
                    const totalCost = Object.entries(newCombination)
                        .filter(([key]) => key !== 'RecipeMeta')
                        .reduce((sum, [_, data]) => sum + (data.cost || 0), 0);

                    //Sort ingredients by quantity.
                    const sortedIngredients = Object.entries(newCombination)
                        .filter(([key]) => key !== 'RecipeMeta')
                        .map(([name, data]) => ({
                            name,
                            quantity: name === 'Egg' ? data.quantity * 48 : data.quantity, //1 Egg = 48g
                            ingAvail: data.ingAvail
                        }))
                        .sort((a, b) => b.quantity - a.quantity);

                    //Calculate total recipe weight.
                    const totalWeight = sortedIngredients.reduce((sum, item) => sum + item.quantity, 0);

                    //Update recipe metadata.
                    newCombination.RecipeMeta = {
                        ...newCombination.RecipeMeta,
                        recipeCost: Number(totalCost.toFixed(4)),
                        ingredientList: sortedIngredients.map(item => item.name).join(', '),
                        recipeWeight: totalWeight,
                        recipeName,
                        recipeAvail: sortedIngredients.every(item => item.ingAvail)
                    };

                    allCombinations.push(newCombination);
                }
            }
            //#endregion - End of Step 3.
        }

        res.status(200).json({ success: true, result: allCombinations });
        console.log("Recipes built successfully.");
        return allCombinations;
    } catch (error) {
        console.error("Error building recipes: ", error);
        res.status(500).json({ success: false, message: "Internal server error." });
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

        // Function: Generate the products from the maps.
        const generateProducts = async () => {
            const products = [];
            const allCombinations = buildRecipes(); // Build all possible combinations of ingredients for the category.
            //Product object keys in order: ProductID, ProductSKU, ProductAvailable, ProductName, RecipeCost, Description, Ingredients.
            return products;
        }

        let allProducts = await generateProducts();
        return allProducts;
    } catch (error) {
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



module.exports = { testSTCMaps, updateProductsTable, convertFKeys, getNutritionFact, buildRecipes};
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
        const { CategoryIngredientMap: categoryIngredientMap, IngredientMap: ingredientMap, ...maps } = await getMaps(['categoryMap', 'categoryIngredientMap', 'ingredientMap', 'subCategoryMap', 'subCategoryIngredientMap', 'flourMap', 'flavorMap']);
        let allCombinations = [];

        // Process each category
        Object.values(maps.CategoryMap).forEach(({CategoryID: categoryID}) => {
            // Group ingredients by category more efficiently
            const ingredientsByCategory = Object.entries(categoryIngredientMap)
                .filter(([_, {CategoryID: catID}]) => catID === categoryID)
                .reduce((acc, [_, {IngredientCategory: category, Quantity: quantity}]) => {
                    if (!acc[category]) acc[category] = [];
                    
                    // Find matching ingredients and calculate costs in one pass
                    acc[category].push(...Object.entries(ingredientMap)
                        .filter(([_, ing]) => ing.IngredientCategory === category)
                        .map(([id, ing]) => ({
                            name: ing.IngredientName,
                            quantity,
                            cost: quantity * convertPricePerUnit(ing.CostPerUnit, ing.UnitType, 'g'),
                            ingID: parseInt(id) + 1,
                            ingCat: category,
                            ingAvail: ing.IngredientAvailable
                        }))
                    );
                    return acc;
                }, {});

            // More efficient recursive combination generator
            const generateCombinations = (categories, index = 0, combo = {}) => {
                if (index === categories.length) {
                    allCombinations.push({...combo});
                    return;
                }

                for (const ingredient of categories[index]) {
                    combo[ingredient.name] = {
                        quantity: ingredient.quantity,
                        cost: ingredient.cost,
                        ingID: ingredient.ingID,
                        ingCat: ingredient.ingCat,
                        ingAvail: ingredient.ingAvail
                    };
                    generateCombinations(categories, index + 1, combo);
                    delete combo[ingredient.name];
                }
            };

            // Generate combinations
            generateCombinations(Object.values(ingredientsByCategory));

            let tempIngredients = {};
            const categorySubcategories = [];
            for(const combination of allCombinations) {
                const subcategoriesForCategory = maps.SubCategoryMap.filter(sc => sc.CategoryID === categoryID);
                
                for (const { SubCategoryID, SubCategoryName, Description: sc_description } of subcategoriesForCategory) {
                    tempIngredients = { ...combination };

                    // Get all ingredients for this subcategory in one filter pass
                    const subCatIngredients = maps.SubCategoryIngredientMap
                        .filter(sci => parseInt(sci.SubCategoryID) === parseInt(SubCategoryID))
                        .map(({ IngredientID, Quantity }) => {
                            const ingredient = ingredientMap.find(ing => parseInt(ing.IngredientID) === parseInt(IngredientID));
                            const cost = Quantity * convertPricePerUnit(
                                ingredient.CostPerUnit, 
                                ingredient.UnitType, 
                                'g'
                            );

                            return [
                                ingredient.IngredientName,
                                {
                                    quantity: Quantity,
                                    cost,
                                    ingCat: ingredient.IngredientCategory,
                                    ingID: IngredientID,
                                    ingAvail: ingredient.IngredientAvailable
                                }
                            ];
                        });

                    // Merge subcategory ingredients with base combination
                    Object.assign(tempIngredients, Object.fromEntries(subCatIngredients));
                    
                    categorySubcategories.push(tempIngredients);
                }

                // Replace allCombinations with the new expanded set
                allCombinations = categorySubcategories;
            }
        });
        
        

        res.status(200).json({ success: true, result: allCombinations });
        console.log("Recipes built successfully.");
        return allCombinations;
    } catch (error) {
        console.error("Error building recipes: ", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};



const extractSpecialIngredients = (allCombinations) => {
    Object.entries(allCombinations).reduce((acc, [name, data]) => {
        if (!data.ingCat || !data.ingID) {
            acc[name] = { id: 0, name };
            return acc;
        }

        const firstWord = capitalize(data.ingCat.split(' ')[0].toLowerCase());
        const mapKey = `${firstWord}Map`;

        if (!maps[mapKey]) {
            // acc[decapitalize(firstWord)] = { id: 0, name: '' };
            return acc;
        }

        if (!data.ingAvail) {
            productAvailable = false;
        }

        const specialMap = maps[mapKey];
        const specialItem = specialMap.find(item => item[`${firstWord}Name`] === name);
        const specialID = specialItem?.[`${firstWord}ID`];

        acc[decapitalize(firstWord)] = {
            id: parseInt(specialID) || 0,
            name: specialID ? specialItem[`${firstWord}Name`] : ''
        };

        return acc;
    }, {});

    console.log("Extracted Special Ingredients: ", extractSpecialIngredients);
}


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
            for (const categoryShapeSize of maps.CategoryShapeSizeMap) { // Iterate over the CategoryShapeSizeMap to get the categoryShapeSize data.
                let productAvailable = true;
                const { CategoryShapeID: categoryShapeID, SizeID: sizeID, BatchSize: batchSize } = categoryShapeSize;
                const categoryShape = maps.CategoryShapeMap.find(cs => cs.CategoryShapeID === categoryShapeID);
                const { CategoryID: categoryID, ShapeID: shapeID } = categoryShape;

                const category = maps.CategoryMap.find(cat => cat.CategoryID === categoryID);
                const size = maps.SizeMap.find(sz => sz.SizeID === sizeID);
                const shape = maps.ShapeMap.find(sh => sh.ShapeID === shapeID);

                const categoryDesc = category.Description;
                const sizeDesc = size.Description;
                const shapeDesc = shape.Description;
                
                const allCombinations = buildRecipes(maps.CategoryIngredientMap, maps.IngredientMap, categoryID); // Build all possible combinations of ingredients for the category.

                for (const combination of allCombinations) {
                    productAvailable = true; // Reset availability status for each combination iteration.

                    for (const subCategory of maps.SubCategoryMap) { // Iterate over the SubCategoryMap to get the subCategory data.
                        const tempIngredients = { ...combination }; // Copy the combination to prevent mutation. This will be used to store the ingredients for the current product.
                        const { SubCategoryName: subCategoryName, CategoryID: scd_categoryID, Description: scd_description } = subCategory;
                        if (scd_categoryID !== categoryID) continue;

                        for (const subCategoryIngredient of maps.SubCategoryIngredientMap) { // Iterate over the SubCategoryIngredientMap to get the subCategoryIngredient data.
                            const { SubCategoryID: subCategoryID, IngredientID: ingredientID, Quantity: quantity } = subCategoryIngredient;

                            if (subCategoryID !== subCategory.SubCategoryID) continue;

                            const ingredient = maps.IngredientMap.find(ing => ing.IngredientID === ingredientID);
                            const { IngredientName: ingredientName, CostPerUnit: costPerUnit, UnitType: unitType, IngredientAvailable: ingAvail, IngredientCategory: ingCat } = ingredient;

                            const cost = quantity * convertPricePerUnit(costPerUnit, unitType, 'g');
                            tempIngredients[ingredientName] = { quantity, cost, ingCat, ingID: ingredientID, ingAvail };
                        }

                        const recipeIngredients = Object.entries(tempIngredients).reduce((acc, [name, data]) => {
                            if (data.ingCat && data.ingID) {
                                let firstWord = data.ingCat.split(' ')[0]; // Get the first word of the ingredient category.
                                firstWord = capitalize(firstWord.toLowerCase()); // Capitalize the first word.
                                const mapKey = `${decapitalize(firstWord)}Map`; // Get the map that is associated with the ingredient category.
                                if (maps[mapKey]) { // Check if the map exists in maps.
                                    if (!data.ingAvail) productAvailable = false; // Set the product availability to false if the ingredient is not available.

                                    const specialID = maps[mapKey].find(item => item[`${firstWord}Name`] === ingredient.IngredientName)?.[`${firstWord}ID`];
                                    acc[decapitalize(firstWord)] = { id: specialID, name: specialID ? maps[mapKey].find(item => item[`${firstWord}ID`] === specialID)[`${firstWord}Name`] : '' };
                                } else { // The map does not exist therefore no specialID is necessary for the ingredient.
                                    acc[decapitalize(firstWord)] = { id: '0', name: '' };
                                }
                            } else {
                                acc[name] = { id: '0', name };
                            }
                            return acc;
                        }, {}); // Initialize the recipeIngredients object.

                        const flavorDesc = recipeIngredients.flavor ? maps.FlavorMap.find(fl => fl.FlavorID === recipeIngredients.flavor.id).Description : 'No Description for Flavor';
                        const sku = `${subCategory.SubCategoryID}${recipeIngredients.flavor.id}${shapeID}-${sizeID}${recipeIngredients.flour.id}`;
                        const sortedIngredients = Object.entries(tempIngredients).map(([name, data]) => ({ // Sort the ingredients by amount used in the recipe.
                            name,
                            quantity: name === 'Egg' ? data.quantity * 48 : data.quantity,
                            cost: data.cost,
                            ...(data.specialID && { specialID: data.specialID })
                        })).sort((a, b) => b.quantity - a.quantity);

                        const ingredientList = sortedIngredients.map(item => item.name).join(', '); // Setup the ingredient list for the product formatted to be divided by commas.
                        const recipeCost = sortedIngredients.reduce((total, item) => total + item.cost, 0); // Calculate the total cost of the recipe.
                        const productDesc = `${categoryDesc} ${flavorDesc} ${scd_description} ${shapeDesc} ${sizeDesc}`;
                        const productName = `${size.SizeName} ${subCategoryName} ${recipeIngredients.flavor.name} ${category.CategoryName}`;
                        const productID = 0; // This is used to ensure ProductID is in the correct location in the table.

                        products.push({ // Push the product data to the products array.
                            ProductID: productID, // ProductID should be the first column in the table.
                            ProductSKU: String(sku),
                            ProductAvailable: productAvailable,
                            ProductName: productName,
                            RecipeCost: Number(recipeCost.toFixed(4)),
                            Description: productDesc,
                            Ingredients: ingredientList,
                        });
                    } // End of iteration over SubCategoryMap.
                } // End of iteration over allCombinations.
            } // End of iteration over CategoryShapeSizeMap.
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
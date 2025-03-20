const { capitalize, decapitalize } = require('../../utils/helpers');
const { getMaps } = require('../../utils/stDataMapperService');
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
        console.error("(stProdBuildController)(testSTCMaps) Error testing STC Maps: ", error);
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
        console.error("(stProdBuildController)(convertFKeys) Error converting foreign keys: ", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}


const getRecipeNutritionFacts = async () => {
    try {
        const filePath = path.join(__dirname, '../../cache/recipeNutrtionFacts.json');
        
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } 
        catch {
            const result = await generateRecipeNutritionFacts();
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
            return result;
        }
    }
    catch(error) {
        console.error("(stProdBuildController)(getNutritionFact) Error getting nutrition fact: ", error);
        return { success: false, message: "Internal server error" };
    }
}


const convertAllToID = async (allTables) => {
    try {
        const tablesToConvert = [];
        //Check which tables need to be converted from Name to ID
        for(const table of allTables) {
            const tableName = table.tableName;
            const tableData = table.data;
            if(!tableData?.rows?.length) continue;

            const firstRow = tableData.rows[0];
            const hasNameColumn = Object.keys(firstRow).some(column => {
                if(!column.startsWith(tableName) && column.endsWith('Name')) { //Check if the column is a Name column that is not for its own table.
                    return true;
                }
            });

            if(hasNameColumn) {
                tablesToConvert.push(tableName);
            }
        }

        if(tablesToConvert.length === 0) {
            console.log("No tables need to be converted.");
            return { success: true, message: "No tables need to be converted." };
        }

        //Convert each table from Name to ID.
        const convertResults = [];
        for(const tableName of tablesToConvert) {
            const tableData = await getTableDataDirectly(tableName);
            if(!tableData?.rows?.length) {
                console.error(`Failed to get table data for ${tableName}`);
                convertResults.push({
                    table: tableName,
                    success: false,
                    message: `Failed to get table data for ${tableName}`
                });
                continue;
            }

            console.log(`Converting ${tableName} from Name to ID...`);
            const result = await convertForeignKeys({ [`${tableName}Map`]: tableData.rows }, false); //Convert Name to ID.
            convertResults.push({
                table: tableName,
                success: result.success,
                message: result.message
            });
        }
        const allSuccessful = convertResults.every(result => result.success);

        return {
            success: allSuccessful,
            message: allSuccessful ? 
                "All tables successfully converted from Name to ID" : 
                "Failed to convert some tables from Name to ID",
            details: convertResults
        }
    }
    catch(error) {
        console.error("(stProdBuildController)(convertAllToID) Error converting all tables to ID: ", error);
        return { success: false, message: "Internal server error." };
    }
}


const fullUpdate = async (req, res) => {
    try {
        const filePath = path.join(__dirname, '../../cache/cachedTables.json');
        if (!fs.existsSync(filePath)) {
            return { success: false, message: "Cache not found, cannot determine table dependencies" };
        }
        const cachedTablesData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const allTables = Object.values(cachedTablesData.tablesData);

        //Convert any and all foreign keus from Name to ID.
        const convertResult = await convertAllToID(allTables);
        if(!convertResult.success) {
            console.error("Failed to convert all tables to ID:", convertResult.message);
            res.status(500).json({ success: false, message: "Failed to convert all tables to ID" });
            return;
        }


        res.status(200).json({ success: true, message: "Full update successful." });
        
    }
    catch(error) {
        console.error("(stProdBuildController)(fullUpdate) Error updating all tables: ", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}




/**
 * Updates all tables that depend on a modified source table.
 * @param {string} sourceTable - The name of the table that was updated.
 * @param {Array<Object>} updatedRows - The updated rows from the source table.
 * @returns {Object} - Result of the update operation.
 */
const updateDependentTables = async (sourceTable, updatedRows) => {
    try {
        console.log(`Checking for tables dependent on ${sourceTable}...`);
        
        //Get all tables from cache.
        const filePath = path.join(__dirname, '../../cache/cachedTables.json');
        if (!fs.existsSync(filePath)) {
            return { success: false, message: "Cache not found, cannot determine table dependencies" };
        }
        
        const cachedTablesData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const allTables = Object.values(cachedTablesData.tablesData);
        
        //Find tables that might depend on the source table.
        const dependentTables = [];
        for (const table of allTables) {
            const tableName = table.tableName;
            if (tableName === sourceTable) continue; //Skip the source table itself.
            
            const tableData = table.data;
            if (!tableData?.rows?.length) continue;
            
            //Check if any columns reference the source table (either as ID or Name).
            const firstRow = tableData.rows[0];
            console.log(`Checking ${tableName} for references to ${sourceTable}...`);
            const hasReference = Object.keys(firstRow).some(column => 
                column === `${sourceTable}ID` || 
                column === `${sourceTable}Name`
            );
            
            if (hasReference) {
                dependentTables.push(tableName);
            }
        }
        
        if (dependentTables.length === 0) {
            console.log(`No dependent tables found for ${sourceTable}`);
            return { success: true, message: "No dependent tables to update" };
        }
        
        console.log(`Found ${dependentTables.length} dependent tables for ${sourceTable}: ${dependentTables.join(', ')}`);
        
        //Update each dependent table.
        const updateResults = [];
        for (const dependentTable of dependentTables) {
            console.log(`Updating ${dependentTable} based on changes in ${sourceTable}...`);
            
            //Get the dependent table data.
            const tableData = await getTableDataDirectly(dependentTable);
            if (!tableData?.rows?.length) {
                console.error(`Failed to get table data for ${dependentTable}`);
                updateResults.push({
                    table: dependentTable,
                    success: false,
                    message: `Failed to get table data for ${dependentTable}`
                });
                continue;
            }
            
            //Create map for the dependent table.
            const dependentMap = { [`${dependentTable}Map`]: tableData.rows };
            
            //Check if we need to convert IDs to Names or Names to IDs.
            const hasIdColumn = tableData.rows[0][`${sourceTable}ID`] !== undefined;
            const hasNameColumn = tableData.rows[0][`${sourceTable}Name`] !== undefined;
            
            //Only proceed if the table has relevant columns to update.
            if (!hasIdColumn && !hasNameColumn) {
                updateResults.push({
                    table: dependentTable,
                    success: true,
                    message: `No relevant columns to update in ${dependentTable}`
                });
                continue;
            }
            
            //Convert foreign keys using existing function
            const idToName = false; //If we have Name but no ID, convert Name to ID.
            const result = await convertForeignKeys(dependentMap, idToName);
            
            updateResults.push({
                table: dependentTable,
                success: result.success,
                message: result.message
            });
        }
        
        const allSuccessful = updateResults.every(result => result.success);
        return {
            success: allSuccessful,
            message: allSuccessful ? 
                `Successfully updated all dependent tables for ${sourceTable}` : 
                `Failed to update some dependent tables for ${sourceTable}`,
            details: updateResults
        };
    } catch (error) {
        console.error(`Error updating dependent tables for ${sourceTable}:`, error);
        return {
            success: false,
            message: `Error updating dependent tables: ${error.message}`
        };
    }
};




/**
 * Triggers dependent table updates after a source table is modified
 * @param {string} tableName - The name of the table that was modified
 * @param {Array<Object>} updatedRows - The updated rows
 * @returns {Promise<Object>} - Result of the operation
 */
const propagateTableUpdates = async (tableName, updatedRows) => {
    try {
        console.log(`Propagating updates from ${tableName} to dependent tables...`);
        const result = await updateDependentTables(tableName, updatedRows);
        console.log(`Finished propagating updates from ${tableName}:`, result);
        return result;
    } catch (error) {
        console.error(`Failed to propagate updates from ${tableName}:`, error);
        return { 
            success: false, 
            message: `Failed to propagate updates: ${error.message}` 
        };
    }
};








//Function: Generate the nutrition facts for each recipe.
const generateRecipeNutritionFacts = async () => {
    try {
        //Fetch the NutritionFactMap and build the recipes.
        const { NutritionFactMap } = await getMaps(['nutritionFactMap']);
        const recipes = await buildRecipes();

        //Generate the nutrition facts for each recipe.
        const allRecipeNutritionFact = recipes.reduce((acc, recipe) => { //acc = accumulator (or nutritionFactsByRecipe).
            const recipeSKU = recipe.RecipeMeta.recipeSKU;
            let recipeNutritionFact = {};

            //Calculate nutrition facts for each ingredient in the recipe.
            Object.entries(recipe).forEach(([ingredient, data]) => {
                if(ingredient === 'RecipeMeta') return;

                const {ingID, quantity} = data;
                const fact = NutritionFactMap.find(fact => fact.IngredientID === ingID);
                if(!fact) return;

                const ratio = (ingredient === 'Egg' ? quantity * 48 : quantity) / fact.ServingSize;
                //Combine the nutrition facts for each ingredient to get the nf for the whole recipe.
                Object.keys(fact).forEach(key => {
                    if(['NutritionFactID', 'IngredientID', '_id'].includes(key)) return;
                    if(!recipeNutritionFact[key]) recipeNutritionFact[key] = 0;

                    recipeNutritionFact[key] += Number(fact[key]) * ratio;
                });
            });

            acc.push({ [recipeSKU]: recipeNutritionFact });
            return acc;
        }, []); //Initial value of the accumulator is an empty array. End of reduce.
        
        const lastUpdated = new Date().toISOString();
        const nutritionFactData = { lastUpdated, facts: allRecipeNutritionFact };
        
        return nutritionFactData;
    }
    catch(error) {
        console.error("(stProdBuildController)(generateRecipeNutritionFact) Error generating recipe nutrition fact: ", error);
        return { success: false, message: "Internal server error." };
    }
}


//Function: Update the products table using a combination of the maps.
const updateProductsTable = async (req, res) => {
    try {
        const table_name = 'ProductMap';
        let clearedToContinue = true;
        const existingMaps = await getMaps(['productMap']);

        if (existingMaps['ProductMap']) {
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
            res.status(200).json({ success: true, message: "Product table created successfully." });
        }
        else { 
            console.log("Failed to update products table.");
            res.status(500).json({ success: false, message: "Failed to update products table." });
        }

    }
    catch(error) {
        console.error("(stProdBuildController)(updateProductData) Error updating product data: ", error);
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
        console.error("(stProdBuildController)(deleteOldTable) Error deleting old table: ", error);
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
        console.error("(stProdBuildController)(createNewTable) Error creating new table: ", error);
    }
}



//Function: Find all possible combinations of ingredients for a given category and subcategory, then build the recipe for each combination.
const buildRecipes = async () => {
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
            const { Description: catDesc } = maps.CategoryMap.find(cat => cat.CategoryID === categoryID);

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
                            recipeSKU: '',
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

                    newCombination.RecipeMeta.recipeSKU = `${subCatID}${ingredientCatIDs.flourID}${ingredientCatIDs.flavorID}`;
                    const recipeName = `${flvName} ${subCatName} ${categoryName}`;

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
                        recipeDesc: `${catDesc} ${flvDesc} ${subCatDesc}`,
                        recipeAvail: sortedIngredients.every(item => item.ingAvail)
                    };

                    allCombinations.push(newCombination);
                }
            }
            //#endregion - End of Step 3.
        }

        console.log("Recipes built successfully.");
        return allCombinations;
    } catch (error) {
        console.error("Error building recipes: ", error);
    }
};



//Function: Build the products using the recipes then from shapes and sizes.
const buildProducts = async () => {
    console.log("Building products...");
    try {
        const maps = await getMaps([
            'categoryMap', 'subCategoryMap', 'subCategoryIngredientMap', 'flavorMap', 'flourMap', 
            'shapeMap', 'sizeMap', 'ingredientMap', 'categoryIngredientMap', 'categoryShapeMap', 'categoryShapeSizeMap'
        ]);

        const allRecipes = await buildRecipes(); //Build the recipes.

        //Function: Generate the products from the maps.
        const generateProducts = async () => {
            const products = [];

            for (const categoryShapeSize of maps.CategoryShapeSizeMap) { //Iterate over the CategoryShapeSizeMap to get the categoryShapeSize data.
                let productAvailable = true;
                const { CategoryShapeID: categoryShapeID, SizeID: sizeID, BatchSize: batchSize } = categoryShapeSize;
                const categoryShape = maps.CategoryShapeMap.find(cs => cs.CategoryShapeID === categoryShapeID);
                const { CategoryID: cs_categoryID, ShapeID: shapeID } = categoryShape;

                const category = maps.CategoryMap.find(cat => cat.CategoryID === cs_categoryID);
                const size = maps.SizeMap.find(sz => sz.SizeID === sizeID);
                const shape = maps.ShapeMap.find(sh => sh.ShapeID === shapeID);

                allRecipes.forEach(recipe => {
                    productAvailable = true;
                    //Destructure all the way to RecipeMeta.
                    const { RecipeMeta, ...ingredients } = recipe;
                    const { recipeSKU, categoryID: rMeta_catID, subCategoryID, ingCatIDs, recipeCost, ingredientList, recipeName, recipeDesc, recipeAvail } = RecipeMeta;
                    

                    if(cs_categoryID !== rMeta_catID) return;
                    if(!recipeAvail) productAvailable = false;

                    const productID = 0;
                    const sku = `${recipeSKU}-${shapeID}${sizeID}`; //SKU = Stock Keeping Unit. (###-##)
                    const productName = `${size.SizeName} ${shape.ShapeName} ${recipeName}`;
                    const productDesc = `${recipeDesc} ${shape.Description} ${size.Description}`

                    products.push({
                        ProductID: productID,
                        ProductSKU: String(sku),
                        ProductAvailable: productAvailable,
                        ProductName: productName,
                        RecipeCost: Number(recipeCost),
                        Description: productDesc,
                        Ingredients: ingredientList
                    })
                });
            }

            //Product object keys in order: ProductID, ProductSKU, ProductAvailable, ProductName, RecipeCost, Description, Ingredients.
            return products;
        }

        let allProducts = await generateProducts();

        console.log("Product Count: ", allProducts.length);
        // res.status(200).json({ success: true, message: "Products built successfully." });
        return allProducts;
    } 
    catch(error) {
        console.error("Error building products: ", error);
    }
};


//Function: Generate the nutrition facts for each individual products.
const perProductFacts = async (req, res) => {
    try {
        //Fetch the nutrition fact and necessary maps.
        const recipeNutritionFacts = await getRecipeNutritionFacts();
        const maps = await getMaps(['products-AMap', 'categoryShapeMap', 'categoryShapeSizeMap', 'subCategoryAvgWeightMap']);
        //Initialize objects to store product facts.
        const perProductFact = {};

        //#region - Lookup Maps.
        //Create a map of subcategory average weight for quick lookup. scaw = SubCategoryAvgWeight.
        const subCategoryAvgWeightMap = maps['SubCategoryAvgWeightMap'].reduce((acc, scaw) => {
            const { CategoryShapeSizeID: cssID, SubCategoryID, AvgWeight, Baked } = scaw;
            const catShapeSize = maps['CategoryShapeSizeMap'].find(css => css.CategoryShapeSizeID === cssID);
            const shapeID = maps['CategoryShapeMap'].find(cs => cs.CategoryShapeID === catShapeSize.CategoryShapeID).ShapeID;
            acc[`${SubCategoryID}-${shapeID}-${catShapeSize.SizeID}`] = { AvgWeight, Baked };
            return acc;
        }, {});

        //Create a map of recipe nutrition facts for quick lookup.
        const recipeFactMap = recipeNutritionFacts.facts.reduce((acc, fact) => {
            const recipeSKU = Object.keys(fact)[0];
            acc[recipeSKU] = fact[recipeSKU];
            return acc;
        }, {});
        //#endregion - End of Lookup Maps.

        //Iterate over each product to calculate its nutrition facts.
        maps['ProductMap'].forEach(product => {
            const { ProductSKU } = product;
            const [recipeSKU, shapeSizeSKU] = ProductSKU.split('-');
            const [subCatID, shapeID, sizeID] = [recipeSKU.charAt(0), shapeSizeSKU.charAt(0), shapeSizeSKU.charAt(1)];

            //Retrieve the recipe facts for the current product.
            const recipeFact = recipeFactMap[recipeSKU];
            if (!recipeFact) {
                return;
            }

            //Retrieve the subcategory average weight for the current product.
            const scaw = subCategoryAvgWeightMap[`${subCatID}-${shapeID}-${sizeID}`];
            if (scaw && scaw.Baked) {
                const { AvgWeight: avgWeight } = scaw;
                const productFact = {};
                const { ServingSize: recipeServingSize } = recipeFact;
                const servingSizeRatio = avgWeight / recipeServingSize; //Calculate the serving size ratio by dividing actual weight by recipe serving size (which is currently set as the weight of the entire recipe).

                //Calculate the nutrition facts for the current product based on the serving size ratio.
                Object.keys(recipeFact).forEach(key => {
                    productFact[key] = key === 'ServingSize' ? avgWeight : Number((recipeFact[key] * servingSizeRatio).toFixed(4));
                });

                perProductFact[ProductSKU] = productFact;
            }
        });

        //#region - File Handling.
        //Define the file path to save the product nutrition facts.
        const filePath = path.join(__dirname, '../../cache/productNutritionFacts.json');
        const productFactData = {
            lastUpdated: new Date().toISOString(),
            count: Object.keys(perProductFact).length,
            facts: perProductFact
        };

        //Ensure directory exists.
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        //Save data to file in JSON format.
        fs.writeFileSync(filePath, JSON.stringify(productFactData, null, 2));
        //#endregion - End of File Handling.

        res.status(200).json({ success: true, result: perProductFact });
        console.log(`${Object.keys(perProductFact).length} product nutrition facts generated successfully for ${Object.keys('Product-AMap').length} products.`);
    } catch (error) {
        console.error("(stProdBuildController)(perProductFact) Error getting nutrition fact per product: ", error);
        res.status(500).json({ success: false, message: "Internal server error." });
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
        // console.error("(stProdBuildController.js)(renameAndUpdateColumnType) Error renaming and updating column type: ", error);
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
        console.error("(stProdBuildController.js)(updateRowData) Error updating row data: ", error);
    }
}



//Function: Convert the foreign keys in the given map.
const convertForeignKeys = async (map, idToName) => {
    console.log("map: ", map);
    try {
        let isCacheFound = false;
        const filePath = path.join(__dirname, '../../cache/cachedTables.json');

        if(fs.existsSync(filePath)) {
            isCacheFound = true;
            console.log("(stProdBuildController.js)(convertForeignKeys) Cache found!");
        }

        const mapName = Object.keys(map)[0]; //Get the map name.
        const table_name = mapName.replace('Map', ''); //Get the table name from the map name.
        const rows = map[Object.keys(map)]; //Get the rows from the map.
        const columnsRenamed = {}; //Object to store the columns that will be renamed.

        console.log("idToName: ", idToName);
        const columnStructure = Object.keys(rows[0]) //Get the column structure from the first row.
            .filter(column => !column.startsWith(table_name)) //Filter out columns that start with the table name.
            .filter(column => idToName ? column.endsWith('ID') : column.endsWith('Name'));

        console.log("columnStructure: ", columnStructure);

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
            //Process one column at a time
            for (const column of columnStructure) {
                //Process all rows for current column
                await Promise.all(Object.keys(rows).map(async row => {
                    const value = rows[row][column];
                    if (!changes[row]) {
                        changes[row] = { _id: rows[row]._id };
                    }
                    
                    const result = await processForeignKeyConversion(table_name, column, value);
                    if (!result.newValue || result.newValue === 'undefined') {
                        return;
                    }
                    
                    const { newColumnName, newValue } = result;
                    delete changes[row][column];
                    changes[row][newColumnName] = newValue;
                }));
            }

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
                        } 
                        catch (error) {
                            console.error(`Failed to process column ${oldColumn}:`, error)
                            return {success: false, message: `Failed to process column ${oldColumn}: ${error}`};
                        }
                    })
            );

            if(!columnUpdated.success && changes.length > 0) return { success: false, message: "(stProdBuildControllers.js)(convertForeignKeys) Failed to complete foreign key conversion: seatable column did not update." };

            await new Promise(resolve => setTimeout(resolve, 1000)); //Wait for 1 seconds before updating the rows. This is to ensure that the column changes are completed before updating the rows.
            const rowUpdated = await updateRowData(table_name, rows); //Update the rows with the converted foreign keys.

            if(!rowUpdated) return { success: false, message: "(stProdBuildControllers.js)(convertForeignKeys) Failed to complete foreign key conversion: seatable row did not update." };

            //Once both the columns and rows are updated in SeaTable, we can update them in the cache.
            await updateTableData(table_name, rows, columnsUpdating);
            console.log(`Foreign keys converted successfully for ${table_name}.`);
            return { success: true, message: "Foreign keys converted successfully." };
        }

        

        
        
    }
    catch(error) {
        console.error("(stProdBuildController.js)(convertForeignKeys) Error converting foreign keys: ", error);
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
        console.error("(stProdBuildController.js)(processForeignKeyConversion) Error processing foreign key conversion: ");
    }
}



module.exports = { testSTCMaps, updateProductsTable, convertFKeys, getRecipeNutritionFacts, perProductFacts, buildRecipes, generateRecipeNutritionFacts, propagateTableUpdates, fullUpdate };
const { capitalize, decapitalize, destructureSKU } = require('../../utils/helpers');
const { convertUnit, convertPricePerUnit } = require('../../utils/unitConversion');
const { convertForeignKeys, deleteOldTable, createNewTable } = require('../../utils/stUtils');
const { getMaps } = require('../../utils/stDataMapperService');
const columnOperations  = require('./stColumnController');
const { updateRow, appendRow } = require('./stRowController');
const { createTable, deleteTable } = require('./stTableController');
const { getTableDataDirectly, updateTableData, syncSeaTableData } = require('./stDataController');
const fs = require('fs');
const path = require('path');



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


//Function: Update all tables to match any changes made to a single table.
const fullUpdate = async (req, res) => {
    const startTime = Date.now();
    let log = [];
    let cachedMaps = {}; //Cache for maps to avoid redundant fetches.
    
    try {
        //Log request info without storing unused variables.
        log.push(`Updating data for request with table: ${req.body.tableName || 'all tables'}`);
        const filePath = path.join(__dirname, '../../cache/cachedTables.json');

        try {
            //Check if cache exists.
            await fs.promises.access(filePath);
            let cachedTablesData = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
            const allTables = Object.values(cachedTablesData.tablesData);

            const tablesToConvert = [];
            const cacheUpdates = {};

            for(const table of allTables) {
                const tableName = table.tableName;
                const tableData = table.data;
                if(!tableData?.rows?.length) continue;

                const firstRow = tableData.rows[0];
                const hasNameColumn = Object.keys(firstRow).some(column => {
                    if(!column.startsWith(tableName) && column.endsWith('Name')) {
                        return true;
                    }
                });

                if(hasNameColumn) {
                    tablesToConvert.push({ tableName, tableData });
                }
            }

            if(tablesToConvert.length === 0) {
                log.push("No tables need to be converted.");
            }
            else {
                log.push(`Converting ${tablesToConvert.length} tables from Name to ID...`);
                const mapNames = new Set(); //Create a Set of unique map names to fetch.
                for(const { tableName, tableData } of tablesToConvert) {
                    // const result = await convertForeignKeys({ [`${tableName}Map`]: tableData.rows }, false);
                    // cacheUpdates[`${tableName}Map`] = result.success ? tableData.rows : [];

                    const columnNames = Object.keys(tableData.rows[0] || {})
                        .filter(column => !column.startsWith(tableName) && column.endsWith('Name'));

                    columnNames.forEach(column => mapNames.add(column.replace(/Name$/g, '')+'Map'));
                }

                //Fetch all maps at once.
                if(mapNames.size > 0) {
                    cachedMaps = await getMaps([...mapNames]);
                    log.push(`Prefetched ${mapNames.size} maps for conversion.`)
                }

                const convertPromises = tablesToConvert.map(async ({ tableName, tableData }) => {
                    const result = await convertForeignKeys({ [`${tableName}Map`]: tableData.rows }, false, cachedMaps);
                    return { tableName, success: result.success, message: result.message };
                });

                const convertResults = await Promise.all(convertPromises);
                const allSuccessful = convertResults.every(result => result.success);

                if(!allSuccessful) {
                    throw new Error("Failed to convert some tables from Name to ID.");
                }

                log.push("All tables successfully converted from Name to ID.");
            }


            if(req.body.tableName === "NutritionFact") {
                log.push("Recalculating recipe and nutrition facts");
                ppf = await perProductFacts();
                if(!ppf.success) {
                    throw new Error("Failed to recalculate nutrition facts.");
                }
            }


            //Update Product table with current data.
            log.push('Updating product table...');
            const productUpdate = await updateProductTable();
            if(!productUpdate.success) {
                throw new Error(`Product table update failed: ${productUpdate.message}`);
            }
            log.push('Product table updated successfully.');


            const executionTime = Date.now() - startTime;
            log.push(`Full update completed in ${executionTime}ms.`);
            console.log(log.join('\n'));
            res.status(200).json({ success: true, message: "Full update successful.", executionTime });
        }
        catch(fileError) {
            console.error("(stProdBuildController)(fullUpdate) Error reading cached tables: ", fileError);
            res.status(500).json({ success: false, message: "Cache not found or invalid, cannot determine table dependencies." });
        }
    }
    catch(error) {
        const errorTime = Date.now() - startTime;
        console.error(`(stProdBuildController)(fullUpdate) Error after ${errorTime}ms: `, error);
        console.error(log.join('\n'));
        res.status(500).json({ success: false, message: error.message || "Internal server error." });
    }
}



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
const updateProductTable = async () => {
    try {
        const table_name = 'Product';
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
                // {
                //     column_name: 'ProductName',
                //     column_type: 'text',
                // },
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
                {
                    column_name: 'ProductImage',
                    column_type: 'text',
                },
                {
                    column_name: 'ProductFlour',
                    column_type: 'text',
                },
                {
                    column_name: 'ProductFlavor',
                    column_type: 'text',
                },
                {
                    column_name: 'ProductShape',
                    column_type: 'text',
                },
                {
                    column_name: 'ProductSize',
                    column_type: 'text',
                },
            ]
            
            await createNewTable(table_name, columns);
            await appendRow({ table_name, rows: products });
            return { success: true, message: "Product table created successfully." };
        }
        else { 
            console.log("Failed to update products table.");
            return { success: false, message: "Failed to update products table." };
        }

    }
    catch(error) {
        console.error("(stProdBuildController)(updateProductTable) Error updating product data: ", error);
        return { success: false, message: "Internal server error." };
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
                    const flvName = ingredientCatIDs.flavorID !== undefined ? maps.FlavorMap.find(fl => Number(fl.FlavorID) === Number(ingredientCatIDs.flavorID)).FlavorName : 'No Flavor Name';
                    const flvDesc = ingredientCatIDs.flavorID !== undefined ? maps.FlavorMap.find(fl => Number(fl.FlavorID) === Number(ingredientCatIDs.flavorID)).Description : 'No Description for Flavor';

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
                    // const productName = `${size.SizeName} ${shape.ShapeName} ${recipeName}`;
                    const productDesc = `${recipeDesc} ${shape.Description} ${size.Description}`
                    const productImage = `${cs_categoryID}-${shapeID}${sizeID}_000.jpg`; //First image in the list.


                    products.push({
                        ProductID: productID,
                        ProductSKU: String(sku),
                        ProductAvailable: productAvailable,
                        // ProductName: productName,
                        RecipeCost: Number(recipeCost),
                        Description: productDesc,
                        Ingredients: ingredientList,
                        ProductImage: productImage,
                        ProductFlour: maps.FlourMap.find(fl => Number(fl.FlourID) === Number(ingCatIDs.flourID))?.FlourName || 'No Flour Name',
                        ProductFlavor: maps.FlavorMap.find(fl => Number(fl.FlavorID) === Number(ingCatIDs.flavorID))?.FlavorName.replace(/\s\([A-Za-z]+\)/, '') || 'No Flavor Name',
                        ProductShape: shape.ShapeName,
                        ProductSize: size.SizeName
                    });
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
const perProductFacts = async () => {
    try {
        //Fetch the nutrition fact and necessary maps.
        const recipeNutritionFacts = await getRecipeNutritionFacts();
        const maps = await getMaps(['productMap', 'categoryShapeMap', 'categoryShapeSizeMap', 'subCategoryAvgWeightMap']);
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

        console.log(`${Object.keys(perProductFact).length} product nutrition facts generated successfully for ${Object.keys('Product').length} products.`);
        return {success: true, message: "Product nutrition facts generated successfully."};
    } catch (error) {
        console.error("(stProdBuildController)(perProductFact) Error getting nutrition fact per product: ", error);
        return { success: false, message: "Internal server error." };
    }
}



module.exports = { updateProductTable, getRecipeNutritionFacts, perProductFacts, buildRecipes, generateRecipeNutritionFacts, fullUpdate };
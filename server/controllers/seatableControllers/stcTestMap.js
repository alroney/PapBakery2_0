const { capitalize } = require('../../utils/helpers');
const { getMaps } = require('./stcMaps');
const columnOperations  = require('./stColumnController');
const { updateRow, appendRow } = require('./stRowController');
const { createTable } = require('./stTableController');
const { convertUnit, convertPricePerUnit } = require('../../utils/unitConversion');


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

const updateProductsTable = async (req, res) => {
    try {
        const products = await buildProducts();
        const table_name = 'Products-A';
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

        const existingMaps = getMaps(['Products-A']);
        if (existingMaps['Products-A'].length > 0) {
            console.log("Products-A table already exists");
            res.status(200).json({ success: true, message: "Products-A table already exists." });
        }
        else {
            console.log("Products-A table does not exist. Creating Products-A table...");
            await createNewTable(table_name, columns);
            await appendRow({ table_name, rows: products });
            res.status(200).json({ success: true, message: "Products-A table created successfully." });
        }

    }
    catch(error) {
        console.error("(stcTestMap)(updateProductData) Error updating product data: ", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}

const createNewTable = async (table_name, columns) => {
    try {
        const tableData = {
            table_name,
            columns,

        };

        console.log("tableData: ", tableData);
        await createTable(tableData);
    }
    catch(error) {
        console.error("(stcTestMap)(createNewTable) Error creating new table: ", error);
    }
}


const buildRecipes = (categoryIngredientMapT, ingredientMapT, categoryID) => {
    const ingredientsByCategory = Object.keys(categoryIngredientMapT).reduce((acc, categoryIngredientKey) => {
        const categoryIngredientData = categoryIngredientMapT[categoryIngredientKey];
        const { ingredientCategory, quantity, categoryID: catID } = categoryIngredientData;
        if (catID !== categoryID) return acc; // Skip the current iteration if the categoryID does not match the categoryID.

        if (!acc[ingredientCategory]) acc[ingredientCategory] = []; // Initialize the array for the ingredient category.
        for (const ingredientKey in ingredientMapT) { // Iterate over the ingredientMapT to get the ingredient data.
            const ingredientData = ingredientMapT[ingredientKey];
            if (ingredientData.ingredientCategory === ingredientCategory) {
                const { ingredientName, costPerUnit, unitType } = ingredientData;
                const cost = quantity * convertPricePerUnit(costPerUnit, unitType, 'g');
                acc[ingredientCategory].push({ name: ingredientName, quantity, cost, ingID: ingredientKey, ingCat: ingredientCategory });
            }
        }
        return acc;
    }, {});

    const allCombinations = [];
    const generateCombinations = (categories, index, currentCombination) => {
        if (index === categories.length) {
            allCombinations.push({ ...currentCombination });
            return;
        }
        categories[index].forEach(ingredient => {
            currentCombination[ingredient.name] = ingredient;
            generateCombinations(categories, index + 1, currentCombination);
            delete currentCombination[ingredient.name];
        });
    };
    generateCombinations(Object.values(ingredientsByCategory), 0, {});

    return allCombinations;
};



//Function: transform the map into a more usable format.
const transformMap = (map, tableName, cache) => {
    if (cache[tableName]) return cache[tableName];
    const transformed = map.reduce((acc, item) => { //Reduce the map to an object.
        const tableIdKey = `${tableName}ID`;
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
    try {
        const maps = getMaps([
            'categoryMap', 'subCategoryMap', 'subCategoryIngredientMap', 'flavorMap', 'flourMap', 
            'shapeMap', 'sizeMap', 'ingredientMap', 'categoryIngredientMap', 'categoryShapeMap', 'categoryShapeSizeMap'
        ]);

        const cache = {};
        const transformedMaps = Object.keys(maps).reduce((acc, key) => {
            const tableName = key.replace('Map', '');
            acc[(key)+'T'] = transformMap(maps[key], tableName, cache); //Transform the map and store it in transformedMaps.
            return acc;
        }, {});

        const { 
            categoryMapT, subCategoryMapT, subCategoryIngredientMapT, flavorMapT, flourMapT, 
            shapeMapT, sizeMapT, ingredientMapT, categoryIngredientMapT, categoryShapeMapT, categoryShapeSizeMapT 
        } = transformedMaps;

        const products = [];

        for (const key in categoryShapeSizeMapT) { //Iterate over the categoryShapeSizeMapT to get the categoryShapeSize data.
            const { categoryShapeID, sizeID, batchSize } = categoryShapeSizeMapT[key];
            const { categoryID, shapeID } = categoryShapeMapT[categoryShapeID];
            const categoryDesc = categoryMapT[categoryID].description;
            const sizeDesc = sizeMapT[sizeID].description;
            const shapeDesc = shapeMapT[shapeID].description;

            const allCombinations = buildRecipes(categoryIngredientMapT, ingredientMapT, categoryID);

            for (const combination of allCombinations) {
                for (const subCategoryKey in subCategoryMapT) { //Iterate over the subCategoryMapT to get the subCategory data.
                    const tempIngredients = { ...combination }; //Copy the combination to prevent mutation. This will be used to store the ingredients for the current product.
                    const subCategoryData = subCategoryMapT[subCategoryKey];
                    const { subCategoryName, categoryID: scd_categoryID, description: scd_description } = subCategoryData;
                    if (scd_categoryID !== categoryID) continue;

                    for (const subCategoryIngredientKey in subCategoryIngredientMapT) { //Iterate over the subCategoryIngredientMapT to get the subCategoryIngredient data.
                        const subCategoryIngredientData = subCategoryIngredientMapT[subCategoryIngredientKey];
                        const { subCategoryID, ingredientID, quantity } = subCategoryIngredientData;
                        if (subCategoryID !== Number(subCategoryKey)) continue;

                        for (const ingredientKey in ingredientMapT) { //Iterate over the ingredientMapT to get the ingredient data.
                            const ingredientData = ingredientMapT[ingredientKey];
                            if (ingredientID === Number(ingredientKey)) {
                                const { ingredientName, costPerUnit, unitType } = ingredientData;
                                const cost = quantity * convertPricePerUnit(costPerUnit, unitType, 'g');
                                tempIngredients[ingredientName] = { quantity, cost, ingCat: ingredientData.ingredientCategory, ingID: ingredientKey };
                            }
                        }
                    }

                    const recipeIngredients = Object.entries(tempIngredients).reduce((acc, [name, data]) => {
                        if (data.ingCat && data.ingID) {
                            const firstWord = data.ingCat.split(' ')[0].toLowerCase(); // Get the first word of the ingredient category.
                            const mapKey = `${firstWord}MapT`; //Get the map that is associated with the ingredient category.
                            if (transformedMaps[mapKey]) { //Check if the map exists in transformedMaps.
                                const specialID = Object.keys(transformedMaps[mapKey]).find(key => transformedMaps[mapKey][key][`${firstWord}Name`] === ingredientMapT[data.ingID].ingredientName);
                                acc[firstWord] = { id: specialID, name: specialID ? transformedMaps[mapKey][specialID][`${firstWord}Name`] : '' };
                            } else { //The map does not exist therefore no specialID is necessary for the ingredient.
                                acc[firstWord] = { id: '0', name: '' };
                            }
                        } else {
                            acc[name.toLowerCase()] = { id: '0', name };
                        }
                        return acc;
                    }, {}); //Initialize the recipeIngredients object.

                    const flavorDesc = recipeIngredients.flavor ? flavorMapT[recipeIngredients.flavor.id].description : 'No Description for Flavor';
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
                    const productName = `${recipeIngredients.flavor.name} ${subCategoryName} ${categoryMapT[categoryID].categoryName}`;

                    products.push({ //Push the product data to the products array.
                        ProductSKU: String(sku),
                        ProductName: productName,
                        RecipeCost: Number(recipeCost.toFixed(4)),
                        Description: productDesc,
                        Ingredients: ingredientList,
                    });
                }
            }
        } //End of iteration over categoryShapeSizeMapT.

        return products;
    } catch (error) {
        console.error("Error building products: ", error);
    }
};



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


module.exports = { testSTCMaps, updateProductsTable };
const { getMaps } = require('./stcMaps');

const testSTCMaps = async (req, res) => {
    try {
        const map = getMaps(['subCategoryIngredientMap']);
        convertForeignKeys(map, true);
        res.status(200).json({ success: true, map });
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

const convertForeignKeys = (map, idToName) => {
    try {
        const tableName = Object.keys(map)[0].replace('Map', '');

        //Sub-function: Process the column data.
        const processColumn = (column, row, idToName) => {
            console.log("Current column: ", column);
            if(column.toLowerCase().startsWith(tableName.toLowerCase())) return;
            
            const value = row[column];
            const shouldConvert = idToName ? column.endsWith('ID') : column.endsWith('Name');
            
            if(shouldConvert) {
                console.log(`Converting ${column} value: ${value}`);
                const {newColumnName, newValue} = processForeignKeyConversion(column, value);
                console.log(`New column name: ${newColumnName}, New value: ${newValue}`);
            }
        };

        //Iterate over the map values.
        for (const entry of Object.values(map)) {
            Object.values(entry).forEach(row => {
                Object.keys(row).forEach(column => processColumn(column, row, idToName));
            });
        }
    }
    catch(error) {
        console.error("(stcTestMap.js)(replaceNameWithId) Error replacing name with ID: ", error);
    }
}


const processForeignKeyConversion = (columnName, input) => {
    const camelColumnName = columnName.charAt(0).toLowerCase() + columnName.slice(1); //Convert columnName to camel case.
    const mapName = camelColumnName.replace(/ID|Name/g, '') + 'Map'; //Remove 'ID' or 'Name' from the end and replace with 'Map'.  
    const map = getMaps([mapName])[mapName];

    for(const entry of Object.values(map)) {
        if(entry[columnName] === input) {
            console.log("Attempting conversion...");
            if(columnName.endsWith('ID')) {
                console.log("Converting ID to Name.");
                return {newColumnName: columnName.replace('ID', 'Name'), newValue: entry[columnName.replace('ID', 'Name')]};
            }
            else if(columnName.endsWith('Name')){
                console.log("Converting Name to ID.");
                return {newColumnName: columnName.replace('Name', 'ID'), newValue: entry[columnName.replace('Name', 'ID')]};
            }
            else {
                console.log(`Column name ${columnName} does not end with 'ID' or 'Name'.`);
            }
        }
    }
}


module.exports = { testSTCMaps };
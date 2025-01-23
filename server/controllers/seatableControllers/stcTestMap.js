const { getMaps } = require('./stcMaps');

const testSTCMaps = async (req, res) => {
    try {
        const map = getMaps(['categoryShapeMap']);
        const updatedMap = convertForeignKeys(map, true);
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


//Function: Convert the foreign keys in the given map.
const convertForeignKeys = (map, idToName) => {
    try {
        console.log("Old Map: ", map);
        const tableName = Object.keys(map)[0].replace('Map', '');

        //Nested Function: Process the column data.
        const processColumn = (column, columns, idToName) => {
            if(column.toLowerCase().startsWith(tableName.toLowerCase())) return;
            
            const value = columns[column];
            const shouldConvert = idToName ? column.endsWith('ID') : column.endsWith('Name');
            
            if(shouldConvert) {
                const result = processForeignKeyConversion(column, value);
                if (result) {
                    const keys = Object.keys(columns);
                    const newColumns = {};
                    
                    keys.forEach(key => {
                        if (key === column) {
                            newColumns[result.newColumnName] = result.newValue;
                        } else {
                            newColumns[key] = columns[key];
                        }
                    });
                    
                    // Replace the row contents
                    Object.keys(columns).forEach(key => delete columns[key]);
                    Object.assign(columns, newColumns);
                }
            }
        };

        // Iterate over the map values
        Object.values(map).forEach(row => { //In the map object.
            Object.keys(row).forEach(rowKey => { //In the row object.
                const columns = row[rowKey]; //List columns in the row.
                Object.keys(columns).forEach(column => { //In the columns object.
                    processColumn(column, columns, idToName) //Process the column using the column name (column), the columns object (columns), and the boolean to determine what direction of attack will be (idToName).
                });
            });
        });
        console.log("New Map: ", map);
        return map;
    }
    catch(error) {
        console.error("(stcTestMap.js)(replaceNameWithId) Error converting foreign keys: ", error);
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
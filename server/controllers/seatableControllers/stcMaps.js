const { getCachedTablesData } = require('../seatableControllers/stDataController'); //Import the getCachedTablesData function from the stDataController.js file.



const mapSTCData = (ctd, mapNames) => {
    


    //Dynamically create tables and maps objects based on ctd
    let tables = {};
    let maps = {};

    //Extract table names from ctd and populate tables/maps
    ctd.forEach(table => {
        const tableName = table.tableName;
        // Exclude tables ending with '-A' (these are tables that are generated automatically).
        if (!tableName.endsWith('-A')) {
            const mapName = tableName.charAt(0).toLowerCase() + tableName.slice(1) + "Map";
            const tableKey = tableName.charAt(0).toLowerCase() + tableName.slice(1) + "Table";
            tables[tableKey] = tableName;
            maps[mapName] = {};
        }
    });

    console.log("tables: ", tables);
    console.log("maps: ", maps);

    const findTable = (tableName) => ctd.find((table) => table.tableName === tableName);

    const mapData = (table, map, mapFunction) => {
        if (table && table.data && Array.isArray(table.data.rows)) {
            return table.data.rows.reduce(mapFunction, map);
        } else {
            console.error(`Error mapping ${table.tableName} data.`);
            return map;
        }
    };

    const mapFunction = {
        categoryMap: (map, row) => {
            map[row.CategoryID] = { name: row.CategoryName, description: row.Description };
            return map;
        },
        subCategoryMap: (map, row) => {
            map[row.SubCategoryID] = { name: row.SubCategoryName, description: row.Description };
            return map;
        },
        flavorMap: (map, row) => {
            map[row.FlavorID] = { name: row.FlavorName, description: row.Description };
            return map;
        },
        shapeMap: (map, row) => {
            map[row.ShapeID] = { name: row.ShapeName, description: row.Description };
            return map;
        },
        sizeMap: (map, row) => {
            map[row.SizeID] = { name: row.SizeName, description: row.Description };
            return map;
        },
        ingredientMap: (map, row) => {
            map[row.IngredientID] = { name: row.ShortName, unitType: row.UnitType, unitSize: row.UnitSize, purchaseCost: row.PurchaseCost, cpu: row.CostPerUnit, category: row.Category };
            return map;
        },
        categoryShapeMap: (map, row) => {
            map[row.CategoryShapeID] = { categoryID: row.CategoryID, shapeID: row.ShapeID };
            return map;
        },
        categoryShapeSizeMap: (map, row) => {
            map[row.CategoryShapeSizeID] = { categoryShapeID: row.CategoryShapeID, sizeID: row.SizeID, batchSize: row.BatchSize };
            return map;
        }
    };

    const selectedMaps = {};
    mapNames.forEach(mapName => {
        if(maps.hasOwnProperty(mapName)) { //Check if the mapName exists in the maps object.
            const tableName = tables[`${mapName.replace('Map', 'Table')}`];
            const table = findTable(tableName);
            selectedMaps[mapName] = mapData(table, maps[mapName], mapFunction[mapName])
        }
    })

    return selectedMaps;
};


//Function: Get the maps from the SeaTableControllers cachedTablesData.
const getMaps = (mapNames) => {
    const ctd = getCachedTablesData(); //Get the cachedTablesData.
    return mapSTCData(ctd, mapNames); //Return the mapping of the SeaTableControllers cachedTablesData.
}


module.exports = { getMaps }; //Export the getMaps function.
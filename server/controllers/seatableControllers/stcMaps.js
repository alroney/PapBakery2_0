const { getCachedTablesData } = require('../seatableController');



const mapSTCData = (ctd) => {
    const tables = {
        categoryTable: "Category",
        subCategoryTable: "SubCategory",
        flavorTable: "Flavor",
        shapeTable: "Shape",
        sizeTable: "Size",
        ingredientTable: "Ingredient",
        categoryShapeTable: "CategoryShape",
        categoryShapeSizeTable: "CategoryShapeSize"
    };

    const maps = {
        categoryMap: {},
        subCategoryMap: {},
        flavorMap: {},
        shapeMap: {},
        sizeMap: {},
        ingredientMap: {},
        categoryShapeMap: {},
        categoryShapeSizeMap: {}
    };

    const findTable = (tableName) => ctd.find((table) => table.tableName === tableName);

    const mapData = (table, map, mapFunction) => {
        if (table && table.data && Array.isArray(table.data.rows)) {
            return table.data.rows.reduce(mapFunction, map);
        } else {
            console.error(`Error mapping ${table.tableName} data.`);
            return map;
        }
    };

    maps.categoryMap = mapData(findTable(tables.categoryTable), maps.categoryMap, (map, row) => {
        map[row.CategoryID] = { name: row.CategoryName, description: row.Description };
        return map;
    });

    maps.subCategoryMap = mapData(findTable(tables.subCategoryTable), maps.subCategoryMap, (map, row) => {
        map[row.SubCategoryID] = { name: row.SubCategoryName, description: row.Description };
        return map;
    });

    maps.flavorMap = mapData(findTable(tables.flavorTable), maps.flavorMap, (map, row) => {
        map[row.FlavorID] = { name: row.FlavorName, description: row.Description };
        return map;
    });

    maps.shapeMap = mapData(findTable(tables.shapeTable), maps.shapeMap, (map, row) => {
        map[row.ShapeID] = { name: row.ShapeName, description: row.Description };
        return map;
    });

    maps.sizeMap = mapData(findTable(tables.sizeTable), maps.sizeMap, (map, row) => {
        map[row.SizeID] = { name: row.SizeName, description: row.Description };
        return map;
    });

    maps.ingredientMap = mapData(findTable(tables.ingredientTable), maps.ingredientMap, (map, row) => {
        map[row.IngredientID] = { name: row.ShortName, unitType: row.UnitType, unitSize: row.UnitSize, purchaseCost: row.PurchaseCost, cpu: row.CostPerUnit, category: row.Category };
        return map;
    });

    maps.categoryShapeMap = mapData(findTable(tables.categoryShapeTable), maps.categoryShapeMap, (map, row) => {
        map[row.CategoryShapeID] = { categoryID: row.CategoryID, shapeID: row.ShapeID };
        return map;
    });

    maps.categoryShapeSizeMap = mapData(findTable(tables.categoryShapeSizeTable), maps.categoryShapeSizeMap, (map, row) => {
        map[row.CategoryShapeSizeID] = { categoryShapeID: row.CategoryShapeID, sizeID: row.SizeID, batchSize: row.BatchSize };
        return map;
    });

    return maps;
};

const test = () => {
    const ctd = getCachedTablesData(); //Get the cachedTablesData.
    return mapSTCData(ctd); //Return the mapping of the SeaTableControllers cachedTablesData.
}


module.exports = { test };
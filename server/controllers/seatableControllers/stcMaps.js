const { getCachedTablesData } = require('../seatableController');



const mapSTCData = (ctd) => {
    const categoryTable = ctd.find((table) => table.tableName === "Category");
    const subCategoryTable = ctd.find((table) => table.tableName === "SubCategory");
    const flavorTable = ctd.find((table) => table.tableName === "Flavor");
    const shapeTable = ctd.find((table) => table.tableName === "Shape");
    const sizeTable = ctd.find((table) => table.tableName === "Size");
    const ingredientTable = ctd.find((table) => table.tableName === "Ingredient");
    const categoryShapeTable = ctd.find((table) => table.tableName === "CategoryShape");
    const categoryShapeSizeTable = ctd.find((table) => table.tableName === "CategoryShapeSize");


    let categoryMap = {};
    let subCategoryMap = {};
    let flavorMap = {};
    let shapeMap = {};
    let sizeMap = {};
    let ingredientMap = {};
    let categoryShapeMap = {};
    let categoryShapeSizeMap = {};


    if(categoryTable && categoryTable.data && Array.isArray(categoryTable.data.rows)) {
        categoryMap = categoryTable.data.rows.reduce((map, row) => {
            map[row.CategoryID] = { name: row.CategoryName, description: row.Description };
            return map;
        }, {});
    }
    else {
        console.error("Error mapping Category data.");
    }

    if(subCategoryTable && subCategoryTable.data && Array.isArray(subCategoryTable.data.rows)) {
        subCategoryMap = subCategoryTable.data.rows.reduce((map, row) => {
            map[row.SubCategoryID] = { name: row.SubCategoryName, description: row.Description };
            return map;
        }, {});
    }
    else {
        console.error("Error mapping SubCategory data.");
    }

    if(flavorTable && flavorTable.data && Array.isArray(flavorTable.data.rows)) {
        flavorMap = flavorTable.data.rows.reduce((map, row) => {
            map[row.FlavorID] = { name: row.FlavorName, description: row.Description };
            return map;
        }, {});
    }
    else {
        console.error("Error mapping Flavor data.");
    }

    if(shapeTable && shapeTable.data && Array.isArray(shapeTable.data.rows)) {
        shapeMap = shapeTable.data.rows.reduce((map, row) => {
            map[row.ShapeID] = { name: row.ShapeName, description: row.Description };
            return map;
        }, {});
    }
    else {
        console.error("Error mapping Shape data.");
    }

    if(sizeTable && sizeTable.data && Array.isArray(sizeTable.data.rows)) {
        sizeMap = sizeTable.data.rows.reduce((map, row) => {
            map[row.SizeID] = { name: row.SizeName, description: row.Description };
            return map;
        }, {});
    }
    else {
        console.error("Error mapping Size data.");
    }

    if(ingredientTable && ingredientTable.data && Array.isArray(ingredientTable.data.rows)) {
        ingredientMap = ingredientTable.data.rows.reduce((map, row) => {
            map[row.IngredientID] = { name: row.ShortName, unitType: row.UnitType, unitSize: row.UnitSize, purchaseCost: row.PurchaseCost, cpu: row.CostPerUnit, category: row.Category };
            return map;
        }, {});
    }
    else {
        console.error("Error mapping Ingredient data.");
    }

    if(categoryShapeTable && categoryShapeTable.data && Array.isArray(categoryShapeTable.data.rows)) {
        categoryShapeMap = categoryShapeTable.data.rows.reduce((map, row) => {
            map[row.CategoryShapeID] = { categoryID: row.CategoryID, shapeID: row.ShapeID };
            return map;
        }, {});
    }
    else {
        console.error("Error mapping CategoryShape data.");
    }

    if(categoryShapeSizeTable && categoryShapeSizeTable.data && Array.isArray(categoryShapeSizeTable.data.rows)) {
        categoryShapeSizeMap = categoryShapeSizeTable.data.rows.reduce((map, row) => {
            map[row.CategoryShapeSizeID] = { categoryShapeID: row.CategoryShapeID, sizeID: row.SizeID, batchSize: row.BatchSize };
            return map;
        }, {});
    }
    else {
        console.error("Error mapping CategoryShapeSize data.");
    }

    return { categoryMap, subCategoryMap, flavorMap, shapeMap, sizeMap, ingredientMap, categoryShapeMap, categoryShapeSizeMap };
}

const test = () => {
    console.log("Getting ctd...");
    const ctd = getCachedTablesData();
    console.log("ctd: ", ctd);

    console.log("Mapping STC Data...");
    return mapSTCData(ctd);
}


module.exports = { test };
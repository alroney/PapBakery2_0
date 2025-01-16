const { test } = require('./stcMaps');

const testSTCMaps = async (req, res) => {
    try {
        console.log("Testing STC Maps...");
        const { categoryMap, subCategoryMap, flavorMap, shapeMap, sizeMap, ingredientMap, categoryShapeMap, categoryShapeSizeMap } = test();
        console.log("Category Map: ", categoryMap);
        res.json({ success: true, message: "Test successful." });
    }
    catch (error) {
        console.error("Error testing STC Maps: ", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}

module.exports = { testSTCMaps };
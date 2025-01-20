const { getMaps } = require('./stcMaps');

const testSTCMaps = async (req, res) => {
    try {
        console.log("Testing STC Maps...");
        const { categoryMap } = getMaps(['categoryMap']);
        console.log("Finished testing STC Maps.");
        console.log("Category Map: ", categoryMap);
        res.status(200).json({ success: true, categoryMap });
    }
    catch (error) {
        console.error("Error testing STC Maps: ", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}



const buildRecipes = (req, res) => {
    try {
        const {
            categoryIngredientMap,
            subCategoryIngredientMap,
        } = getMaps('categoryIngredientMap', 'subCategoryIngredientMap');
        const recipes = [];

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

module.exports = { testSTCMaps };
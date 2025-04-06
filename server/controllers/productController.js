const Products = require('../models/productSchema'); //Get & import the Products model.
const SubCategory = require('../models/subcategorySchema'); //Get & import the SubCategory model.
const Category = require('../models/categorySchema'); //Get & import the Category model.
const Users = require('../models/userSchema');
const fs = require('fs');
const path = require('path');
const { getTableDataDirectly } = require('./seatableControllers/stDataController');
const { destructureSKU } = require('../utils/helpers');
const nutritionLabelService = require('../services/nutritionLabelService');
require('dotenv').config({ path: __dirname + '/.env' }); //Allows access to environment variables.
const serverUrl = process.env.SERVER_URL;
const NodeCache = require('node-cache');



const baseImagePath = `${serverUrl}/public/images`; //Base path for images.
const constraintsCache = new NodeCache({ stdTTL: 3600 }); //Create a cache instande with a Time To Live of 1 hour (3600 seconds).

const getProductBySKU = async (req, res) => {
    try {
        const { sku } = req.params;
        const product = await Products.findOne({ sku });

        if(!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        //Get nutrition facts.
        const nutritionFacts = nutritionLabelService.getProductNutrition(sku);

        //Generate nutrition image if it doesn't exist.
        let nutritionImageFilename = null;
        if(nutritionFacts) {
            //Check if we have a version mapping.
            const versionMappingPath = path.join(__dirname, '../cache/nutrition-image-versions.json');
            if(fs.existsSync(versionMappingPath)) {
                const versionMap = JSON.parse(fs.readFileSync(versionMappingPath, 'utf8'));
                if(versionMap[sku]) {
                    nutritionImageFilename = `${sku}.${versionMap[sku]}.png`;
                }
            }

            //If no version found, generate one.
            if(!nutritionImageFilename) {
                nutritionImageFilename = await nutritionLabelService.generateNutritionImage(sku);
            }
        }

        //Add nutrition image URL to product data.
        if(nutritionImageFilename) {
            product.nutritionImageUrl = `${baseImagePath}/nutrition/${nutritionImageFilename}`;

            //Also include webp format for modern browsers.
            const webpFilename = nutritionImageFilename.replace('.png', '.webp');
            product.nutritionImageUrlWebp = `${baseImagePath}/nutrition/${webpFilename}`;
        }

        //Include raw nutrition facts for client-side use if needed.
        if(nutritionFacts) {
            product.nutritionFacts = nutritionFacts;
        }

        res.json({ success: true, product });
    } 
    catch(error) {
        console.error("(getProductBySKU) Error fetching product by SKU: ", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};



//Function: Get nutrition image directly.
const getNutritionImage = async (req, res) => {
    try {
        const { sku } = req.params;

        //Check if we have a version mapping.
        const versionMappingPath = path.join(__dirname, '../cache/nutrition-image-versions.json');
        let nutritionImageFilename = null;

        if(fs.existsSync(versionMappingPath)) {
            const versionMap = JSON.parse(fs.readFileSync(versionMappingPath, 'utf8'));
            if(versionMap[sku]) {
                nutritionImageFilename = `${sku}.${versionMap[sku]}.png`;
            }
        }

        //If no version found, generate one.
        if(!nutritionImageFilename) {
            nutritionImageFilename = await nutritionLabelService.generateNutritionImage(sku);

            if(!nutritionImageFilename) {
                return res.status(404).json({ success: false, message: 'Nutrition image not found' });
            }
        }

        //Set cache control headers for better performance.
        res.setHeader('Cache-Control', 'public, max-age=604800'); //Cache for 1 week.

        //Redirect to the image URL.
        res.redirect(`${baseImagePath}/nutrition/${nutritionImageFilename}`);
    }
    catch(error) {
        console.error("(getNutritionImage) Error fetching nutrition image: ", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}



//#region - PRODUCT OPTIONS API ENDPOINTS
const getFlavorOptions = async (req, res) => {
    try {
        const flavors = await getTableDataDirectly('Flavor');
        res.json(flavors);
    } catch (error) {
        console.error("(getFlavorOptions) Error fetching flavor options: ", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

const getFlourOptions = async (req, res) => {
    try {
        const flours = await getTableDataDirectly('Flour');
        res.json(flours);
    } catch (error) {
        console.error("(getFlourOptions) Error fetching flour options: ", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

const getShapeOptions = async (req, res) => {
    try {
        const shapes = await getTableDataDirectly('Shape');
        res.json(shapes);
    } catch (error) {
        console.error("(getShapeOptions) Error fetching shape options: ", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

const getSizeOptions = async (req, res) => {
    try {
        const sizes = await getTableDataDirectly('Size');
        res.json(sizes);
    } catch (error) {
        console.error("(getSizeOptions) Error fetching size options: ", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

const getCategoryShapes = async (req, res) => {
    try {
        const { categoryId } = req.query;
        const categoryShapeData = await getTableDataDirectly('CategoryShape');

        let result = categoryShapeData;

        //Filter by categoryId if provided.
        if(categoryId) {
            const filteredRows = categoryShapeData.rows.filter(row => row.CategoryID === Number(categoryId));
            result = { ...categoryShapeData, rows: filteredRows };
        }

        res.json(result);
    } catch (error) {
        console.error("(getCategoryShapes) Error fetching shapes: ", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

const getCategoryShapeSizes = async (req, res) => {
    try {
        const { categoryShapeId, shapeId } = req.query;
        const categoryShapeSizeData = await getTableDataDirectly('CategoryShapeSize');

        let result = categoryShapeSizeData;

        //Filter by categoryShapeId if provided.
        if(categoryShapeId) {
            const filteredRows = categoryShapeSizeData.rows.filter(row => row.CategoryShapeID === Number(categoryShapeId));
            result = { ...categoryShapeSizeData, rows: filteredRows };
        }
        else if(shapeId) {
            const categoryShapes = await getTableDataDirectly('CategoryShape');
            const relevantCategoryShapeIds = categoryShapes.rows.filter(row => row.ShapeID === Number(shapeId)).map(row => row.CategoryShapeID);
            const filteredRows = categoryShapeSizeData.rows.filter(row => relevantCategoryShapeIds.includes(row.CategoryShapeID));

            result = { ...categoryShapeSizeData, rows: filteredRows };
        }

        res.json(result);

    } catch (error) {
        console.error("(getCategoryShapeSizes) Error fetching sizes: ", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
//#endregion - PRODUCT OPTIONS API ENDPOINTS



const getProductConstraints = async (req, res) => {
    try {
        const { categoryId } = req.query;
        const cacheKey = categoryId ? `constraints_${categoryId}` : 'constraints_all';

        //Try to get from cache first.
        const cachedData = constraintsCache.get(cacheKey);
        if(cachedData) {
            return res.json(cachedData);
        }

        //Fetch required data in parallel.
        const [categoryShapes, categoryShapeSizes] = await Promise.all([
            getTableDataDirectly('CategoryShape'),
            getTableDataDirectly('CategoryShapeSize')
        ]);
        
        //Build optimized constraint structure.
        const validShapesByCategory = new Map();
        const validSizesByShape = new Map();
        const categoryShapeMap = new Map();
        
        //Process category-shape relationships.
        categoryShapes.rows.forEach(cs => {
            //Skip if category filter is applied and this row doesn't match.
            if (categoryId && cs.CategoryID !== Number(categoryId)) return;
            
            //Initialize set if needed.
            if (!validShapesByCategory.has(cs.CategoryID)) {
                validShapesByCategory.set(cs.CategoryID, new Set());
            }
            
            //Add shape to the set of valid shapes for this category.
            validShapesByCategory.get(cs.CategoryID).add(cs.ShapeID);
            
            //Store mapping for later use.
            categoryShapeMap.set(cs.CategoryShapeID, {
                categoryId: cs.CategoryID,
                shapeId: cs.ShapeID
            });
        });
        
        //Process category-shape-size relationships.
        categoryShapeSizes.rows.forEach(css => {
            const categoryShape = categoryShapeMap.get(css.CategoryShapeID);
            
            if (categoryShape) {
                const { shapeId } = categoryShape;
                
                //Skip if category filter is applied and this row doesn't match.
                if (categoryId && categoryShape.categoryId !== Number(categoryId)) return;
                
                //Initialize set if needed.
                if (!validSizesByShape.has(shapeId)) {
                    validSizesByShape.set(shapeId, new Set());
                }
                
                //Add size to the set of valid sizes for this shape.
                validSizesByShape.get(shapeId).add(css.SizeID);
            }
        });
        
        //Convert to JSON-friendly format.
        const result = {
            validShapesByCategory: Object.fromEntries(
                Array.from(validShapesByCategory.entries()).map(([key, value]) => [
                    key, 
                    Array.from(value)
                ])
            ),
            validSizesByShape: Object.fromEntries(
                Array.from(validSizesByShape.entries()).map(([key, value]) => [
                    key, 
                    Array.from(value)
                ])
            ),
            //Include raw data for reference if needed.
            raw: {
                categoryShapes: categoryShapes.rows,
                categoryShapeSizes: categoryShapeSizes.rows
            }
        };

        constraintsCache.set(cacheKey, result); //Cache the result for future use.
        res.json(result);
    } catch (error) {
        console.error("Error fetching product constraints: ", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
} //End of getProductConstraints function.



//Function: Find the subcategory by ID.
const getSubcategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const subcategories = await getTableDataDirectly('SubCategory');
        const subcategory = subcategories.rows.find(row => row.SubCategoryID === Number(id));

        if(!subcategory) {
            return res.status(404).json({ success: false, message: 'Subcategory not found' });
        }

        res.json(subcategory);
    }
    catch(error) {
        console.error("Error fetching subcategory by ID: ", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}



//Function: Find and return all products in the MongoDB
const fetchAllProducts = async () => {
    try {

        //Aggregate the products with reviews and users.
        const productsWithReviews = await Products.aggregate([
            {
                $lookup: {
                    from: 'reviews', // The name of the reviews collection
                    localField: '_id', // The field in the product collection
                    foreignField: 'productId', // The field in the reviews collection
                    as: 'reviews', // The name of the field to add the reviews
                },
            },
            {
                $unwind: {
                    path: '$reviews',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'users', // The name of the users collection
                    localField: 'reviews.userId', // The userId in the reviews
                    foreignField: '_id', // The _id in the users
                    as: 'reviews.user',
                },
            },
            {
                $unwind: {
                    path: '$reviews.user',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    _id: '$_id',
                    sku: { $first: '$sku' },
                    name: { $first: '$name' },
                    description: { $first: '$description' },
                    price: { $first: '$price' },
                    category: { $first: '$category' },
                    subCategory: { $first: '$subcategory' },
                    image: { $first: '$image' },
                    rating: { $first: '$rating' },
                    reviewCount: { $first: '$reviewCount' },
                    reviews: { $push: '$reviews' },
                },
            },
        ]).option({ maxTimeMS: 30000 });

        //Construct the image URL for use in the response or front-end rendering.
        const productsWithImages = productsWithReviews.map((product) => ({
            ...product, //Spread the product details.
            image: `${baseImagePath}/${product.image}`, //Add the base path to the image name.
        }));

        return productsWithImages;
    } catch (error) {
        console.error("Error while fetching products: ", error);
        throw error;
    }
};



//Function: Find and return all categories in the MongoDB.
const fetchAllCategories = async () => {
    try {
        let categories = await Category.find();
        return categories;
    }
    catch(error) {
        console.log("(fetchAllCategories) Error while fetching categories: ", error);
    }
};



//API endpoint to fetch all categories.
const allCategories = async (req,res) => {
    try {
        let categories = await fetchAllCategories();
        res.send(categories);
    }
    catch(error) {
        console.log("(allCategories) Error while getting all categories: ", error);
    }
};



//Function: Find and return all subcategories in the MongoDB.
const fetchAllSubcategories = async () => {
    try {
        let subcategories = await SubCategory.find();
        return subcategories;
    }
    catch(error) {
        console.log("Error while fetching subcategories: ", error);
    }
};



//API endpoint to fetch all subcategories.
const allSubCategories = async (req,res) => {
    try {
        let subcategories = await fetchAllSubcategories();
        res.send(subcategories);
    }
    catch(error) {
        console.log("Error while getting all subcategories: ", error);
    }
};



//Function: API endpoint to synchronize all the products from Seatable to MongoDB.
const syncProducts = async (req, res) => {
    try {
        console.time('syncProducts');
        
        //Fetch all reference data in parallel.
        const [categoryData, subCategoryData, flourData, flavorData, shapeData, sizeData, productsData] = 
            await Promise.all([
                getTableDataDirectly('Category'),
                getTableDataDirectly('SubCategory'),
                getTableDataDirectly('Flour'),
                getTableDataDirectly('Flavor'),
                getTableDataDirectly('Shape'),
                getTableDataDirectly('Size'),
                getTableDataDirectly('Product')
            ]);
        
        console.log(`Fetched ${productsData.rows.length} products and reference data`);
        
        //Synchronize categories first.
        if(categoryData.rows.length > 0) {
            console.log(`Synchronizing ${categoryData.rows.length} categories...`);
            const categoryBulkOps = categoryData.rows.map(row => ({
                updateOne: {
                    filter: { categoryID: row.CategoryID },
                    update: { 
                        $set: {
                            categoryID: row.CategoryID,
                            categoryName: row.CategoryName
                        }
                    },
                    upsert: true,
                },
            }));
            await Category.bulkWrite(categoryBulkOps);
            console.log(`Synchronized ${categoryData.rows.length} categories.`);
        }

        //Synchronize subcategories next.
        if(subCategoryData.rows.length > 0) {
            console.log(`Synchronizing ${subCategoryData.rows.length} subcategories...`);
            const subCategoryBulkOps = subCategoryData.rows.map(row => ({
                updateOne: {
                    filter: { subCategoryID: row.SubCategoryID },
                    update: {
                        $set: {
                            subCategoryID: row.SubCategoryID,
                            subCategoryName: row.SubCategoryName,
                            subCategoryImage: row.SubCategoryImage,
                            categoryID: row.CategoryID
                        }
                    },
                    upsert: true,
                },
            }));
            await SubCategory.bulkWrite(subCategoryBulkOps);
            console.log(`Synchronized ${subCategoryData.rows.length} subcategories.`);
        }


        //Create maps for lookups .- using more descriptive variable names
        const flourMap = new Map(flourData.rows.map(row => [row.FlourId, row.FlourName]));
        const flavorMap = new Map(flavorData.rows.map(row => [row.FlavorId, row.FlavorName]));
        const shapeMap = new Map(shapeData.rows.map(row => [row.ShapetId, row.ShapeName]));
        const sizeMap = new Map(sizeData.rows.map(row => [row.SizeId, row.SizeName]));
        const subCategoryMap = new Map(subCategoryData.rows.map(row => [
            row.SubCategoryID, 
            { categoryId: row.CategoryID, name: row.SubCategoryName }
        ]));
        const categoryMap = new Map(categoryData.rows.map(row => [
            row.CategoryID, 
            { name: row.CategoryName }
        ]));
        
        //Ensure we have an array of products.
        const productsArray = Array.isArray(productsData.rows) ? productsData.rows : [productsData];
        
        if (productsArray.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "No products found to synchronize" 
            });
        }
        
        //Create a more efficient key mapping by doing this once instead of for each product.
        const keyMap = Object.keys(productsArray[0] || {})
            .filter(key => key !== '_id' && key !== 'ProductID')
            .reduce((map, key) => {
                map[key] = key.replace(/Product/g, '').toLowerCase();
                return map;
            }, {});
        
        //Process products in batches to avoid memory issues with large datasets.
        const BATCH_SIZE = 100;
        let processed = 0;
        
        for (let i = 0; i < productsArray.length; i += BATCH_SIZE) {
            const batch = productsArray.slice(i, i + BATCH_SIZE);
            
            //Transform products more efficiently.
            const updProducts = batch.map(product => {
                const updProduct = {};
                
                //Apply key transformations using the pre.-calculated map
                for (const [oldKey, newKey] of Object.entries(keyMap)) {
                    updProduct[newKey] = product[oldKey];
                    
                    //Special handling for SKU.
                    if (newKey === 'sku') {
                        const sku = product[oldKey];
                        const deSKU = destructureSKU(sku);
                        const { subCategoryID } = deSKU;
                        
                        //Add error handling for missing mappings.
                        const subCategory = subCategoryMap.get(Number(subCategoryID));
                        if (subCategory) {
                            updProduct.subcategory = subCategory.name;
                            
                            const category = categoryMap.get(subCategory.categoryId);
                            if (category) {
                                updProduct.category = category.name;
                            } else {
                                console.warn(`Category not found for subcategory ID: ${subCategoryID}`);
                                updProduct.category = 'Unknown';
                            }
                        } else {
                            console.warn(`Subcategory not found for ID: ${subCategoryID}`);
                            updProduct.subcategory = 'Unknown';
                            updProduct.category = 'Unknown';
                        }
                        
                        //Add additional attributes from SKU if available.
                        if (deSKU.flourID && flourMap.has(Number(deSKU.flourID))) {
                            updProduct.flour = flourMap.get(Number(deSKU.flourID));
                        }
                        if (deSKU.flavorID && flavorMap.has(Number(deSKU.flavorID))) {
                            updProduct.flavor = flavorMap.get(Number(deSKU.flavorID));
                        }
                        if (deSKU.shapeID && shapeMap.has(Number(deSKU.shapeID))) {
                            updProduct.shape = shapeMap.get(Number(deSKU.shapeID));
                        }
                        if (deSKU.sizeID && sizeMap.has(Number(deSKU.sizeID))) {
                            updProduct.size = sizeMap.get(Number(deSKU.sizeID));
                        }
                    }
                }
                
                return updProduct;
            });
            
            //Create bulk operations for the current batch.
            const bulkOps = updProducts.map(product => ({
                updateOne: {
                    filter: { sku: product.sku },
                    update: { $set: product },
                    upsert: true,
                },
            }));
            
            //Execute bulk operations for this batch.
            await Products.bulkWrite(bulkOps);
            
            processed += batch.length;
            console.log(`Processed ${processed}/${productsArray.length} products`);
        }
        
        console.timeEnd('syncProducts');
        
        res.status(200).json({ 
            success: true, 
            message: `${processed} products synchronized successfully.` 
        });
    }
    catch(error) {
        console.error("Error while syncing products: ", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error.",
            error: error.message
        });
    }
};



//API endpoint to add a new product.
const addProduct = async (req,res) => {
    try {
        //Create a new product with the provided values.
        const product = new Products({
            name: req.body.name,
            image: req.body.image,
            category: req.body.category,
            price: req.body.price,
        });

        //Save the product to the database.
        await product.save();
        console.log("Product Added");

        //Respond with success.
        res.json({
            success: true,
            name: req.body.name,
            product: product, //Respond with the created product.
        })
    }
    catch(error) {
        res.status(500).json({
            success: false,
            message: "Failed to add product",
            error: error.message,
        })
    }
};


//API endpoint to edit product by ID.
const editProduct = async (req,res) => {
    try {
        const filter = {_id:req.body._id};
        const update = {
            name: req.body.name,
            price: req.body.price,
            category: req.body.category,
        }

        let product = await Products.findOneAndUpdate(filter, update);
        product;
        product.save();
        console.log("Product ID: "+ product._id +", has successfully updated!");

        if(product){
            res.json({
                success: true,
                name: product.name,
                message: "Update Successful",
            })
        }
    }
    catch(error) {
        console.log("An error occurred trying to update a product: ", error);
    }

};


//API endpoint to remove a product by ID.
const removeProduct = async (req,res) => {
    try {
        const product = await Products.findOne({id:req.body._id});

        if(!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        //Construct the image URL for use in the response or front-end rendering.
        const imageName = product.image; //Extract image name only.
        const imageURL = path.join(__dirname, `../../upload/images/${imageName}`); //Construct the full image path.

        

        //Delete the image file
        try {
            fs.unlink(imageURL, async (error) => {
                if(error) {
                    console.error("Error while deleting the image file: ", error);
                }
                else {
                    console.log("Image file deleted successfull.");
                    //Delete the product from the database.
                    await Products.findOneAndDelete({ id: req.body._id });
                    res.json({
                        success: true,
                        name: req.body.name,
                    });
                }
            });
        }
        catch(error) {
            console.error("Error while deleting the image file: ", error);
            res.status(500).json({
                success: false,
                message: "Error while deleting the image file.",
            });
        }
        
    }
    catch(error) {
        console.log("Error while removing product: ", error);
        res.status(500).json({
            success: false,
            message: "Error while removing product",
        })
    }
};


//API endpoint to fetch all products.
const allProducts = async (req,res) => {
    try {
        let products = await fetchAllProducts();
        res.send(products); //Respond with list of all products.
    }
    catch(error) {
        console.log("Error while getting all products: ", error);
    }
};


/**
 * @TODO: Find a way to increase performance with find newest products and topProducts. Consider using a cache or a more efficient query.
*/


//API endpoint to fetch the newest items (last 8 added).
const newProducts = async (req,res) => {
    try {
        let products = await fetchAllProducts();
        let newProducts = products.slice(-8);
        res.send(newProducts);
    }
    catch(error) {
        console.log("Error while getting new items: ", error);
    }
};

/**
 * @TODO Create algorithm that compares the likes of 1 product to other products and shows the 3 most popular.
 */

//API endpoint to fetch popular flavors (first 4 items).
const topProducts = async (req,res) => {
    try {
        let products = await fetchAllProducts();
        let topProducts = products.slice(0,4);
        console.log("Popular Flavors Fetched.");
        res.send(topProducts);
    }
    catch(error) {
        console.log("Error while getting popular items: ", error);
    }
};



module.exports = {
    allProducts,
    addProduct, 
    removeProduct,
    editProduct,
    topProducts,
    newProducts,
    syncProducts,
    allCategories,
    allSubCategories,
    getFlavorOptions,
    getFlourOptions,
    getShapeOptions,
    getSizeOptions,
    getProductBySKU,
    getSubcategoryById,
    getCategoryShapes,
    getCategoryShapeSizes,
    getProductConstraints,
    getNutritionImage,
};
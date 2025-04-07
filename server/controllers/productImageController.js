const fs = require('fs');
const path = require('path');
const { destructureSKU } = require('../utils/helpers');
const { getTableDataDirectly } = require('./seatableControllers/stDataController');
const Products = require('../models/productSchema');
require('dotenv').config({ path: __dirname + '/.env' });
const serverUrl = process.env.SERVER_URL;


//Directory paths.
const productImagesDir = path.join(__dirname, '../../public/images/productsByCatShapeSize');
const nutritionImagesDir = path.join(__dirname, '../../public/images/nutrition');
const baseImagePath = `${serverUrl}/public/images`;


//Cache to avoid repeated file system operations.
const imageCache = {
    productImages: {},
    nutritionImages: {},
    lastUpdate: null
};

//Function: Scan directories and refresh the image cache.
const refreshImageCache = () => {
    console.log("Refreshing image cache...");
    try {
        const currentTime = new Date().getTime(); //Get current time in milliseconds.
        //Only refresh the cache every 10 minutes unless forced.
        // if(imageCache.lastUpdate && currentTime - imageCache.lastUpdate < 10 * 60 * 1000) {   
        //     return;
        // }

        console.log("Refreshing product image cache...");

        //Read product images directory.
        if(fs.existsSync(productImagesDir)) {
            const productFiles = fs.readdirSync(productImagesDir);

            //Create a map for product images by category, shape and size.
            const newProductImages = {};
            productFiles.forEach(file => {
                if(!file.endsWith('.jpeg') && !file.endsWith('.png') && !file.endsWith('.jpg')) return; //Skip non-image files.

                //Format: [CategoryID]-[ShapeID][SizeID]_[ImageNumber].jpeg
                const match = file.match(/^(\d+)-(\d)(\d)_(\d+)\.(jpeg|jpg|png)$/);
                if(match) {
                    const categoryId = match[1];
                    const shapeId = match[2];
                    const sizeId = match[3];
                    const imageNumber = parseInt(match[4]);
                    const key = `${categoryId}-${shapeId}${sizeId}`;

                    if(!newProductImages[key]) {
                        newProductImages[key] = [];
                    }

                    newProductImages[key].push({ //Store image data in an array.
                        path: `productsByCatShapeSize/${file}`,
                        order: imageNumber
                    });
                }
            });

            //Sort image by order (image number).
            Object.keys(newProductImages).forEach(key => {
                newProductImages[key].sort((a, b) => a.order - b.order);
            });

            imageCache.productImages = newProductImages;
        }

        //Read nutrition image directory and cache them by SKU.
        if(fs.existsSync(nutritionImagesDir)) {
            const nutritionFiles = fs.readdirSync(nutritionImagesDir);

            const newNutritionImages = {};
            nutritionFiles.forEach(file => {
                //Pattern: sku.hash.png or sku.hash.webp.
                const match = file.match(/^(\d+-\d\d)\.([0-9a-f]+)\.(png|webp)$/);
                if(match) {
                    const sku = match[1];
                    const hash = match[2];
                    const format = match[3];

                    if(!newNutritionImages[sku]) {
                        newNutritionImages[sku] = {};
                    }

                    newNutritionImages[sku][format] = `nutrition/${file}`;
                }
            });

            imageCache.nutritionImages = newNutritionImages;
        }

        imageCache.lastUpdate = currentTime; //Update last updated time.
        console.log("Image cache refreshed successfully.");
    }
    catch(error) {
        console.error("Error refreshing image cache: ", error);
    }
};



//Function: Get all available images for a product by SKU.
const getProductImages = async (sku) => {
    try {
        if(!sku) return []; //Return empty array if SKU is not provided.

        //Make sure cache is initialized.
        if(!imageCache.lastUpdate) {
            refreshImageCache(); //Refresh cache if not initialized.
        }

        //Parse the SKU to get components.
        const parsedSKU = destructureSKU(sku);

        //Get category for subcategory.
        const subcategoryData = await getTableDataDirectly('SubCategory');
        const subcategoryRow = subcategoryData.rows.find(row => row.SubCategoryID === Number(parsedSKU.subCategoryID));

        if(!subcategoryRow) {
            console.error(`Subcategory not found for SKU: ${sku}`);
            return []; //Return empty array if subcategory not found.
        }

        const categoryId = subcategoryRow.CategoryID;
        const imageKey = `${categoryId}-${parsedSKU.shapeID}${parsedSKU.sizeID}`; //Construct the key for looking up in the cache.
        const productImages = imageCache.productImages[imageKey] || []; //Get product images matching the category-shape-size pattern OR empty array if not found.
        const nutritionPath = imageCache.nutritionImages[sku] ? imageCache.nutritionImages[sku].png || imageCache.nutritionImages[sku].webp : null; //Get nutrition image path if available.


        //Combine images with product images first and nutrition images last.
        const allImages = [
            ...productImages.map(img => ({
                path: `${baseImagePath}/${img.path}`,
                isNutrition: false
            })),
        ];

        //Add nutrition image if available.
        if(nutritionPath) {
            allImages.push({
                path: `${baseImagePath}/${nutritionPath}`,
                isNutrition: true,
            });
        }

        return allImages;
        
    }
    catch(error) {
        console.error("Error getting product images: ", error);
        return [];
    }
};




//API endpoint to get all images for a product.
const getProductImagesAPI = async (req, res) => {
    console.log("Getting product images for SKU: ", req.params.sku);
    try {
        const { sku } = req.params;

        if(!sku) {
            return res.status(400).json({ success: false, message: "SKU is required." });
        }

        const images = await getProductImages(sku);

        //Set cache control headers for better performance.
        res.setHeader('Cache-Control', 'public, max-age=3600'); //Cache for 1 hour.

        res.json({
            success: true,
            sku,
            images
        });
    }
    catch(error) {
        console.error("Error getting product images: ", error);
        res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
    }
};



//Function: Update the product images in the database.
const updateProductImagesInDatabase = async () => {
    try {
        console.log("Updating product images in database...");
        refreshImageCache();

        //Get all products.
        const products = await Products.find({});
        let updatedCount = 0;

        //Process in batches to avoid memory issues.
        const BATCH_SIZE = 50;
        for(let i = 0; i < products.length; i += BATCH_SIZE) {
            const batch = products.slice(i, i + BATCH_SIZE);
            const bulkOps = [];

            //Update each product in the batch.
            for(const product of batch) {
                const images = await getProductImages(product.sku); //Get images from cache.

                //Skip if no images found.
                if(!images.length) continue;

                //Create update operation.
                bulkOps.push({
                    updateOne: {
                        filter: { _id: product._id },
                        update: {
                            $set: {
                                productImages: images,
                            }
                        }
                    }
                });
                updatedCount++;
            }

            if(bulkOps.length) {
                await Products.bulkWrite(bulkOps); //Execute bulk operations.
            }
        }

        console.log(`Successfully updated ${updatedCount} products with images.`);
        return { success: true, updatedCount };
    }
    catch(error) {
        console.error("Error updating product images in database: ", error);
        return { success: false, error: error.message };
    }
};



//API endpoint to trigger an update of all product images.
const updateAllProductImages = async (req, res) => {
    try {
        const result = await updateProductImagesInDatabase();
        res.json(result);
    }
    catch(error) {
        console.error("Error updating all product images: ", error);
        res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
    }
};



//API endpoint to force refresh the image cache.
const forceRefreshImageCache = (req, res) => {
    try {
        imageCache.lastUpdate = null;
        refreshImageCache();
        res.json({ success: true, message: "Image cache refreshed successfully." });
    }
    catch(error) {
        console.error("Error refreshing image cache: ", error);
        res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
    }
};


//Initialize cache on server start.
refreshImageCache();

module.exports = {
    getProductImagesAPI,
    updateAllProductImages,
    forceRefreshImageCache,
    getProductImages
};
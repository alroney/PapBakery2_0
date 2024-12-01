const Products = require('../models/productSchema'); //Get & import the Products model.
const Users = require('../models/userSchema');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: __dirname + '/.env' }); //Allows access to environment variables.
const serverUrl = process.env.SERVER_URL;

const baseImagePath = `${serverUrl}/images`; //Base path for images.


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
                    name: { $first: '$name' },
                    description: { $first: '$description' },
                    price: { $first: '$price' },
                    category: { $first: '$category' },
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



module.exports = { allProducts, addProduct, removeProduct, editProduct, topProducts, newProducts};
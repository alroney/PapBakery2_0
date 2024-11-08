const Products = require('../models/productSchema'); //Get & import the Products model.
const Users = require('../models/userSchema');
const fs = require('fs');
const path = require('path');
const serverUrl = process.env.SERVER_URL;




//Function: Find and return all products in the MongoDB
const fetchAllProducts = async () => {
    try {
        const products = await Products.find({}).populate('reviews.user', 'name');
        return products;
    }
    catch(error) {
        console.error("Error while fetching products: ", error);
        throw error;
    }
}


//API endpoint to add a new product.
const addProduct = async (req,res) => {
    let products = await fetchAllProducts();
    try {
        //Generate a new product ID. If there are exisiting products, it takes the last product's ID and increments it by 1. If no products exist, it starts with an ID of 1.
        let id = products.length > 0 ? products.slice(-1)[0].id + 1 : 1; //slice() method is used to return a shallow copy of a portion of an array. So, slice(-1) is used with a negative index, which means "get the last element of the array". This returns an array containing only the last product in the products array.

        //Create a new product with the provided values.
        const product = new Products({
            id: id,
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
        })
    }
    catch(error) {
        console.log("Product Length was: ", products.length);
        console.log("Error while adding product: ", error);
    }
};


//API endpoint to edit product by ID.
const editProduct = async (req,res) => {
    try {
        const filter = {id:req.body.id};
        const update = {
            name: req.body.name,
            price: req.body.price,
            category: req.body.category,
        }

        let product = await Products.findOneAndUpdate(filter, update);
        product;
        product.save();
        console.log("Product ID: "+ product.id +", has successfully updated!");

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
        const product = await Products.findOne({id:req.body.id});

        if(!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        //Construct the image URL for use in the response or front-end rendering.
        const imageName = path.basename(product.image); //Extract image name only.
        const imageURL = `${serverUrl}/images/${imageName}`; //URL that clients can access.

        

        //Delete the image file
        fs.unlink(imageURL, async (error) => {
            if(error) {
                console.error("Error while deleting the image file: ", error);
            }
            else {
                console.log("Image file deleted successfull.");
                //Delete the product from the database.
                await Products.findOneAndDelete({ id: req.body.id });
                res.json({
                    success: true,
                    name: req.body.name,
                });
            }
        });
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
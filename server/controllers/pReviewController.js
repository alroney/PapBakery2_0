const Products = require('../models/productSchema');
const Users = require('../models/userSchema');


const findProduct = async (req) => {
    return await Products.findOne({id:req.body.productId});
}


const updateAverageRating = async (productId) => {
    try {
        const product = await Products.findOne({id:productId});
        let avgRating = 0;

        if(product.reviews.length > 0) {
            const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
            console.log("TotalRating: ", totalRating);
            avgRating = totalRating / product.reviews.length;
            console.log("Avg Rating: ", avgRating);
            product.rating = avgRating;
        }

        else {
            console.log("Product has no reviews.");
        }

        await product.save();
    }
    catch(error) {
        console.log("Error while updating rating: ", error);
        return 0;
    }
}

//API endpoint to add a review to a product
const addReview = async (req,res) => {
    try {
        //Fetch the product which the review is being added to.
        let product = await findProduct(req);
        let success = false;
        console.log("product: ", product);

        if(!product) {
            console.log("The product: "+ product +" is not found.");
            return res.status(404).json({error: "Product not found"});
        }

        //Extract user ID from request (added by the middleware).
        let userId = req.user.id;

        

        //Validate if name and rating are provided
        if(!req.body.name || !req.body.rating) {
            const missingFields = [];
            if(!req.body.name) missingFields.push("Title");
            if(!req.body.rating) missingFields.push("rating");
            
            console.log("Missing required fields: ", missingFields.join(", "));
            success = false;
            return res.status(400).json({ error: `Missing required fields: ${missingFiels.join(", ") }`});
        }
        else{
            success = true;
        }

        //Generate a new review ID.
        let id = product.reviews.length > 0 ? product.reviews.slice(-1)[0].id + 1 : 1; //slice() method is used to return a shallow copy of a portion of an array. So, slice(-1) is used with a negative index, which means "get the last element of the array". This returns an array containing only the last product in the products array.
        

        //Create a new product with the provided values.
        const newReview = {
            id: id,
            name: req.body.name,
            image: req.body.image,
            rating: req.body.rating,
            comment: req.body.comment,
            user: userId,
        };
        
        product.reviews.push(newReview); //Add the review to the product's reviews property's array.

        //Save the updated product to the database.
        if(success) {
            await product.save();
            console.log("A review as been saved.");
        }


        await updateAverageRating(product.id);
        //Link the saved review to user who created it.
        await Users.findByIdAndUpdate(userId, {$push: {reviews: product._id}}); //`findByIdAndUpdate(userId, updateObject)`. The `$push` is a MongoDB update operator. The `{reviews:` is the name of the array field within the user's document where reviews are stored. ` product._id}` is the unique ID of the product that was reviewed.

        //Respond with success.
        res.json({
            success: true,
            review: newReview
        });
    }

    catch (error) {
        console.error("IN THE CATCH", error);
        res.status(500).json({ success:false, message: "Server Error" });
    }
};

const productReviews = async (req,res) => {
    try {
        const productId = req.params.productId;
        let product = await Products.findOne({id:productId});

        res.status(200).json({
            success: true,
            reviews: product.reviews,
        });
    }
    catch(error) {
        console.log("Error getting product reviews: ", error);
    }
};

module.exports = {productReviews, addReview};
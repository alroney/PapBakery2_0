const Products = require('../models/productSchema');
const Users = require('../models/userSchema');
const Reviews = require('../models/reviewSchema');


const findProduct = async (req) => {
    console.log("(pReviewController)(findProduct) req.body: ", req.body);
    return await Products.findById(req.body.productId).populate('reviews.user', 'name');
}


const updateAverageRating = async (pId) => {
    try {
        const aggregateData = await Reviews.aggregate([
            { $match: { productId: pId } },
            { $group: { _id: null, averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
        ]);

        if(aggregateData.length > 0) {
            const {averageRating, reviewCount } = aggregateData[0];
            //Update product with new rating and review count.
            await Product.findByIdAndUpdate(pId, {rating: averageRating, reviewCount });
        }
    }
    catch(error) {
        console.log("Error while updating rating: ", error);
        return 0;
    }
}

//API endpoint to add a review to a product
const addReview = async (req,res) => {
    try {
        const {productId, userId, title, comment, rating, image} = req.body;
        //Fetch the product which the review is being added to.
        let product = await findProduct(req);
        let success = false;

        if(!product) {
            console.log("The product: "+ product +" is not found.");
            return res.status(404).json({error: "Product not found"});
        }


        

        //Validate if name and rating are provided.
        // if(!req.body.name || !req.body.rating) {
        //     const missingFields = [];
        //     if(!req.body.name) missingFields.push("Title");
        //     if(!req.body.rating) missingFields.push("rating");
            
        //     console.log("Missing required fields: ", missingFields.join(", "));
        //     success = false;
        //     return res.status(400).json({ error: `Missing required fields: ${missingFiels.join(", ") }`});
        // }
        // else{
        //     success = true;
        // }


        const newReview = await Reviews.create({
            productId,
            userId,
            title,
            comment,
            rating,
            image,
        })

        await updateAverageRating(productId);
        
        //Respond with code 201 then success and the review itself.
        res.status(201).json({
            success: true,
            review: newReview,
        });
    }

    catch (error) {
        console.error("(addReview) ", error);
        res.status(500).json({ success:false, message: "Server Error" });
    }
};


//Get all reviews
const productReviews = async (req,res) => {
    try {
        const productId = req.params.productId;
        const reviews = await Reviews.find({ productId }).populate('userId', 'name');

        res.status(200).json({
            success: true,
            reviews,
        });
    }
    catch(error) {
        console.log("Error getting product reviews: ", error);
        res.status(500).json({ success: false, error: 'Failed to fetch reviews.'})
    }
};

module.exports = {productReviews, addReview};
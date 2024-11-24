const Product = require('../models/productSchema');
const Users = require('../models/userSchema');
const Review = require('../models/reviewSchema');
const mongoose = require('mongoose');


const findProduct = async (req) => {
    console.log("(pReviewController)(findProduct) req.body: ", req.body);
    return await Product.findById(req.body.productId).populate('Review.user', 'name');
}


const updateAverageRating = async (productId) => {
    try {
        //Ensure the productId is a valid ObjectId
        const objectId = new mongoose.Types.ObjectId(productId);

        //Aggregate to calculate the average rating and review count.
        const [aggregateData] = await Review.aggregate([
            { $match: { productId: objectId} },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    reviewCount: { $sum: 1 },
                },
            },
        ]);

        if (aggregateData) {
            const { averageRating, reviewCount } = aggregateData;

            //Update the product with the new rating and review count.
            await Product.findByIdAndUpdate(
                productId,
                {
                    rating: averageRating,
                    reviewCount,
                },
                { new: true } //Return the updated document.
            );

            console.log(`Updated product ${productId} with average rating: ${averageRating}, review count: ${reviewCount}`);
        } else {
            //No reviews found, reset product rating and review count.
            await Product.findByIdAndUpdate(
                productId,
                {
                    rating: 0,
                    reviewCount: 0,
                },
                { new: true }
            );

            console.log(`Reset product ${productId} rating and review count as no reviews were found.`);
        }
    } catch (error) {
        console.error("Error while updating rating: ", error);
        throw error; //Re-throw the error to handle it at a higher level if needed.
    }
};


//API endpoint to add a review to a product
const addReview = async (req,res) => {
    try {
        const {productId, userId, title, comment, rating, image} = req.body;
        //Fetch the product which the review is being added to.
        const product = await Product.findById(productId);

        if(!product) {
            console.log("The product: "+ product +" is not found.");
            return res.status(404).json({error: "Product not found"});
        }

        const newReview = await Review.create({
            productId,
            userId,
            title,
            comment,
            rating,
            image,
        })
        //Update the product's average rating and review count.
        await updateAverageRating(productId);

        //Populate the user data in the new review.
        const populatedReview = await Review.findById(newReview._id).populate('userId', 'name');
        
        
        //Respond with code 201 then success and the review itself.
        res.status(201).json({
            success: true,
            review: populatedReview,
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
        const reviews = await Review.find({ productId }).populate('userId', 'name');

        res.status(200).json({
            success: true,
            reviews,
        });
    }
    catch(error) {
        console.log("Error getting product reviews: ", error);
        res.status(500).json({ success: false, error: 'Failed to fetch Review.'})
    }
};

module.exports = {productReviews, addReview};
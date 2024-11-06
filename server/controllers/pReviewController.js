//API endpoint to add a review to a product
const addReview = async (req,res) => {
    try {
        //Fetch the product which the review is being added to.
        let product = await Product.findOne({id:req.body.productId});
        console.log("product: ", product);

        if(!product) {
            console.log("The product: "+ product +" is not found.");
            return res.status(404).json({error: "Product not found"});
        }

        //Extract user ID from request (added by the middleware).
        let userId = req.user.id;

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

        product.reviews.push(newReview);

        //Save the product to the database.
        await product.save();
        console.log("A review as been saved.");


        await updateAverageRating(product.id);
        //Link saved review to user who created it.
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
        let product = await Product.findOne({id:productId});

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
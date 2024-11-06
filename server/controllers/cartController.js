//API endpoint to add a product to user's cart.
const addToCart = async (req,res) => {
    try {
        let userData = await Users.findOne({_id: req.user.id}); //Wait for server to find a single user.
        userData.cartData[req.body.itemId] += 1;
        await Users.findOneAndUpdate({_id: req.user.id}, {cartData: userData.cartData});
    }
    catch(error) {
        console.log("Add to Cart error occurred: ", error);
    }
};

//API endpoint to remove a product from user's cart.
const removeFromCart = async (req,res) => {
    try {
        let userData = await Users.findOne({_id: req.user.id});
        if(userData.cartData[req.body.itemId] > 0) {
            userData.cartData[req.body.itemId] -= 1;
        }
        await Users.findOneAndUpdate({_id: req.user.id}, {cartData: userData.cartData});
    }
    catch(error) {
        console.log("Remove from Cart error occurred: ", error);
    }
};

//API endpoint to get user's cart data.
const getCart = async (req,res) => {
    try {
        let userData = await Users.findOne({_id: req.user.id});
        res.json(userData.cartData);
    }
    catch(error) {
        console.log("Get Cart error occurred: ", error);
    }
};

module.exports = { getCart, addToCart, removeFromCart };
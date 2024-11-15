const Mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Cart = require('../models/cartSchema');
const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10); //Convert incoming .env value into an integer.

//Define User schema and create Mongoose model.
const userSchema = new Mongoose.Schema({ 
    name: {
        type: String,
        lowercase: true,
        trim: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
    },
    cartId: {
        type: Mongoose.Schema.Types.ObjectId, ref: 'Cart', //Reference to the Cart schema.
    },
    date: {
        type: Date,
        default: Date.now,
    },
    reviews: [ //Storage for all reviews made by the user.
        {
            type: Mongoose.Schema.Types.ObjectId,
            ref: 'Product',
        }
    ],
});

//A pre hook named save
userSchema.pre("save", async function(next) {
    try {
        const user = this; //`this` refers to the current user document.
        //Password hashing.
        if(user.isModified("password")) { //Hash only if password is new or modified.
            user.password = await bcrypt.hash(user.password, saltRounds);
        }
        //Cart creation and assignment.
        if(user.isNew) {
            //Create a cart for the new user.
            const cart = await Cart.create({ userId: user._id })
            user.cartId = cart._id
        }
        next();
    }
    catch(error) {
        console.log("Error occurred while hashing password: ", error);
        next(error); //Pass the error to the next middleware if necessary.
    }
})

const Users = Mongoose.model("Users", userSchema); //Create the Users model using the userSchema details.

module.exports = Users; //Export the model for use in other parts of the application.
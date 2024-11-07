const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const saltRounds = process.env.BCRYPT_SALT_ROUNDS;

//Define User schema and create Mongoose model.
const userSchema = new mongoose.Schema({ 
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
    cartData: {
        type: Object,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    reviews: [ //Storage for all reviews made by the user.
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
        }
    ],
});

userSchema.pre("save", async function(next) {
    try {
        const user = this; //`this` refers to the document.
        if(user.isModified("password")) {
            console.log("hashing password...");
            user.password = await bcrypt.hash(user.password, saltRounds);
        }

        next();
    }
    catch(error) {
        console.log("Error occurred while hashing password: ", error);
    }
})

const Users = mongoose.model("Users", userSchema); //Create the Users model using the userSchema details.

module.exports = Users; //Export the model for use in other parts of the application.
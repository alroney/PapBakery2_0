
const jwt = require("jsonwebtoken"); //Used to generate and verify tokens.
const {Users} = require("../models/userSchema");


//API endpoint for user registration.
const signup = async (req,res) => {
    try {
        //Check if user already exists with the given email.
        let check = await Users.findOne({email:req.body.email});
        if(check) {
            return res.status(400).json({success: false, errors: "Exisiting user found with that email!"});
        }

        //Create an empty cart with keys from 1 to 400 initialized to 0.
        let cart = {}; 
        for(let i = 0; i < 10; i++) {
            cart[i] = 0;
        }

        //Create a new user with the provided details.
        const user = new Users({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            cartData: cart,
        });

        await user.save(); //Save the new user to the database.

        /** Explanation of `data` object
         * This section creates an object named `data` that will be encoded into the JWT.
         * 
         * The `data` object contains a `user` property, which is itself an object with a single property, `id`.
         * - `user.id` represents the unique identifier of the user in the database. It is used to associate requests or operations with a 
        specific user whenever they register or log in.
         * 
         * @PURPOSE
         * - The `data` object serves as the payload for the JWT, which means it contains the information that will be encoded within the token.
         * - Including the user's ID allows the server to identify the user when handling subsequent authenticated requests.
         */
        const data = {
            user: {
                id: user.id,
            }
        };

        /** Explanation of JWT token generation
         * This section generates a JWT token using the jsonwebtoken library (`jwt`).
         * The function `jwt.sign()` is used to create the JWT.
         * 
         * The function takes two main arguments:
         * - @argument {Payload `data`}: The object that contains the information to be included in the token (in this case, the `data` object containing the user's ID).
         * - @argument {Secret `process.env.JWT_SECRET`}: A secret key used to digitally sign the token. This key is securely stored in the `.env` file.
         *  -The server uses this secret key when creating or verifying tokens to ensure they haven't been tampered with.
         *  - In a production environment, it's crucial to use a strong and unpredictable secret key for security reasons.
         */
        const token = jwt.sign(data, process.env.JWT_SECRET); //jwt.sign(payload, secret);

        //Respond with success and the generated JWT token.
        res.json({success: true, token});

        
    }

    catch(error) {
        console.log("User sign-up error occurred: ", error);
    }
};



//API Endpoint for user login.
const login = async (req,res) => {
    try {
        //Find user by email.
        let user = await Users.findOne({email: req.body.email});
        if(user) {
            //Compare provided password with stored password.
            const passCompare = await bcrypt.compare(req.body.password, user.password);//Use bcrypt.compare to compare the hashing. Instead of direct comparison.
            if(passCompare) {
                //Generate JWT token if password matches.
                const data = {
                    user: {
                        id: user.id,
                    },
                };
                const token = jwt.sign(data, process.env.JWT_SECRET);
                res.json({success: true, token});
            }

            else {
                res.json({success: false, errors: "Password Incorrect!"});
            }
        }

        else {
            res.json({success: false, errors: "Email does not exist!"});
        }
    }
    catch(error) {
        console.log("User login error occurred: ", error);
    }
};

module.exports = {signup, login};
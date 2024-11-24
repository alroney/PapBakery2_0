
const jwt = require('jsonwebtoken'); //Used to generate and verify tokens.
const bcrypt = require('bcryptjs');
const Users = require('../models/userSchema');


//API endpoint for user registration.
const signup = async (req,res) => {
    try {
        //Check if user already exists with the given email.
        let check = await Users.findOne({email:req.body.email});
        if(check) {
            return res.status(400).json({success: false, errors: "Exisiting user found with that email!"});
        }

        //Create a new user with the provided details.
        const user = new Users({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
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
        const { email, password } = req.body
        //Find user by email.
        let user = await Users.findOne({email: email});

        if(!user || !(await bcrypt.compare(password, user.password))) { //Use bcrypt.compare to compare the hashing. Instead of direct comparison.
            return res.status(401).json({ success: false, message: 'Invalid email or password'})
        }
            
        //Create a JWT token
        const token = jwt.sign({user: { id: user._id } }, process.env.JWT_SECRET, { expiresIn: '1h' });

        user.populate('cartId');
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
            token,
        })
    }
    catch(error) {
        console.log("User login error occurred: ", error);
    }
};


const me = async (req, res) => {
    try {

        console.log("(me) req.user: ", req.user);
        if(!req.user) {
            //User is a guest.
            return res.status(200).json({
                success: true,
                user: null,
                message: 'Guest browsing mode',
            });
        }

        //Fetch user details for logged-in users.
        const user = await Users.findById(req.user.id).select('-password'); //Exclude sensitive information like password.

        if(!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ success: true, user });
    }
    catch(error) {
        console.log("(me) Error fetching current user: ", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

module.exports = {signup, login, me};
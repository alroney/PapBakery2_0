const port = 4000;

//Import necessary packages -> const varname = require("packagename");.
const express = require("express");
const app = express();
const mongoose = require("mongoose"); //Allows connection to MongoDB
const jwt = require("jsonwebtoken"); //Used to generate and verify tokens.
const multer = require("multer"); //Allows for image storage handling.
const path = require("path");
const cors = require("cors"); //Allows frontend (React) to access the backend.
const axios = require("axios"); //Used to make HTTP requests to external APIs.
const nodemailer = require("nodemailer"); 
require('dotenv').config(); //Load environment variables.

//Middleware setup
app.use(express.json()); //Automatically parse incoming requests as JSON.
app.use(cors()); //Allow React app to connect to the Express app.


//Database credentials and connection string.
let uri = process.env.MONGO_URI;



//Database connection with MongoDB
mongoose.connect(uri);

//Image Storage Engine configuration
const storage = multer.diskStorage({
    destination: './upload/images', //Directory to save uploaded images.
    filename: (req, file, cb) => {
        //Generate unique filename with original extension.
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`); //`cb` is a callback function that is provided by the Multer library (used for handling file uploads in Node.js).
    }
})

//Multer configuration for file uploads.
const upload = multer({storage:storage})


//Start the server and listen on the specified port.
app.listen(port, (error) => {
    if(!error) {
        console.log("Server Running on Port: "+ port);
    }
    else {
        console.log("Error: "+ error);
    }
})


//#region - API
    /** Abbreviations
     * req = request.
     * res = respond.
     */
    //API creation for the root route.
    app.get("/", (req, res) => {
        res.send("Express App is Running")//response.send displays the text on to web page.
    })

    //Serve static images from the 'upload/images' folder.
    app.use('/images', express.static('upload/images'))

    //API Endpoint to handle image uploads.
    app.post("/upload", upload.single('product'), (req,res) => {//field name is product.
        //Respond with success and img url.
        res.json({
            success:1,
            image_url:`http://localhost:${port}/images/${req.file.filename}`
        })
    })


    /**
     * Product schema definition using Mongoose.
     * In MondoDB, data is stored in collections, not tables (as in SQL databases).
     * Therefore, This creates a model named "Product" which represents a collection in the MongoDB database.
     */
    const Product = mongoose.model("Product", {
        //key: object -> { key: value,}.
        id:{
            type: Number,
            required: true,
        },
        name:{
            type: String,
            required: true,
        },
        image:{
            type: String,
            required: true,
        },
        category:{
            type: String,
            required: true,
        },
        price:{
            type: Number,
            required: true,
        },
        date:{
            type: Date,
            default: Date.now,
        },
        available:{
            type: Boolean,
            default: true,
        },
    })

    //#region - PRODUCT RELATED API ENDPOINTS
        //API endpoint to add a new product.
        app.post('/addproduct', async (req,res) => {

            let products = await Product.find({}); 
            console.log("Product Length: "+ products.length);

            //Generate a new product ID. If there are exisiting products, it takes the last product's ID and increments it by 1. If no products exist, it starts with an ID of 1.
            let id = products.length > 0 ? products.slice(-1)[0].id + 1 : 1; //slice() method is used to return a shallow copy of a portion of an array. So, slice(-1) is used with a negative index, which means "get the last element of the array". This returns an array containing only the last product in the products array.
            

            //Create a new product with the provided values.
            const product = new Product({
                id: id,
                name: req.body.name,
                image: req.body.image,
                category: req.body.category,
                price: req.body.price,
            });

            //Save the product to the database.
            console.log(product);
            await product.save();
            console.log("Saved");

            //Respond with success.
            res.json({
                success: true,
                name: req.body.name,
            })
        })

        //API endpoint to remove a product by ID.
        app.post('/removeproduct', async (req,res) => {
            await Product.findOneAndDelete({id:req.body.id});

            res.json({
                success: true,
                name: req.body.name,
            });
        })

        //API endpoint to fetch all products.
        app.get('/allproducts', async (req,res) => {
            let products = await Product.find({});
            res.send(products); //Respond with list of all products.
        })

        //API endpoint to fetch the newest items (last 8 added).
        app.get('/newitems', async (req,res) => {
            let products = await Product.find({}); //Get all products.
            let newItems = products.slice(-8);
            console.log("New Items Fetched.");
            res.send(newItems);
        })

        /**
         * @TODO Create algorithm that compares the likes of 1 product to other products and shows the 3 most popular.
         */

        //API endpoint to fetch popular flavors (first 4 items).
        app.get('/popularflavors', async (req,res) => {
            let products = await Product.find({}); //Get all products.
            let popular_flavors = products.slice(0,4);
            console.log("Popular Flavors Fetched.");
            res.send(popular_flavors);
        })

    //#endregion

    //Define User schema and create Mongoose model.
    const Users = mongoose.model('Users', { //This creates the table users in the mongoose database.
        name: {
            type: String,
        },
        email: {
            type: String,
            unique: true,
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
    })

    //#region - USER RELATED API ENDPOINTS
        //API endpoint for user registration.
        app.post('/signup', async (req,res) => {
            //Check if user already exists with the given email.
            let check = await Users.findOne({email:req.body.email});
            if(check) {
                return res.status(400).json({success: false, errors: "Exisiting user found with that email!"})
            }

            //Create an empty cart with keys from 1 to 400 initialized to 0.
            let cart = {}; 
            for(let i = 0; i < 300; i++) {
                cart[i] = 0;
            }

            //Create a new user with the provided details.
            const user = new Users({
                name: req.body.name,
                email: req.body.email,
                password: req.body.password,
                cartData: cart,
            })

            await user.save(); //Save the new user to the database.

            /** Explanation of `data` object.
             * Create an object named 'data' that will be encoded into the JWT.
             * 
             * The 'data' object contains a property named user, which is itself an object.
             * The 'user' object has a single property, 'id', which is set to 'user.id'.
             *      - 'user.id' is a unique identifier for the user in the database. When a user registers or logs in, this ID is used to associate requests or operations with that specific user.
             * 
             * @PURPOSE
             * - The 'data' object is used as the payload for the JWT. It is what will be encoded in the token.
             * - By including the user's ID, the token carries information about who the user is, allowing the server to identify the user for subsequent requests that require authentication.
             */
            const data = {
                user: {
                    id: user.id,
                }
            }

            /** Explanation of JWT token.
             * This generates a JWT token using the jsonwebtoken library (jwt).
             * 'jwt.sign()' is the function that creates the JWT.
             * 
             * The function takes two main arguments:
             * - @argument Payload (`data`): This is the object that contains the information to be included in the token (in this case, the 'data' object created earlier with the user's ID).
             * - @argument Secret (process.env.JWT_SECRET): The secret key is used to digitally sign the token. The key is secured in the .env file where it it retrieved.
             *      - When creating or verifying the token, the server uses this secret key to ensure that the token hasn't been tampered with.
             *      - In production environments, it is important to use a strong and unpredictable secret key for security purposes.
             */
            const token = jwt.sign(data, process.env.JWT_SECRET); //jwt.sign(object, secret);

            //Respond with success and the JWT token that was generated.
            res.json({success: true, token})

            /** Summary
             * - When the user successfully registers or logs in, then generate a 'data' object containing information about the user (in this case, just the user ID).
             * - The 'jwt.sign()' function is used to create a JWT token that includes this information and sign it with a secret key to ensure its integrity.
             * - Finally, the token gets sent to the client so it can be used to authenticate future requests. 
             */

        })


        //API Endpoint for user login.
        app.post('/login', async (req,res) => {
            //Find user by email.
            let user = await Users.findOne({email: req.body.email});
            if(user) {
                //Compare provided password with stored password.
                const passCompare = req.body.password === user.password;
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
        })

        /** Explanation of Middleware.
         * Asynchronous Middleware Function.
         * 
         * @param {*} req: Represents the request made by the client.
         * @param {*} res: Represents the response that will be sent to the client.
         * @param {*} next: A function that, when called, will pass control to the next middleware in the stack.
         * 
         * PURPOSE:
         * - To authenticate the user using the JWT token provided in the request headers.
         */
        const fetchUser = async (req,res,next) => {
            const token = req.header('auth-token'); //Extract JWT token value from the key 'auth-token' located in the 'headers' key's object value in the fetch functions object parameter -> fetch(('api_endpoint_url'), {}).
            if(!token) {
                //If no token is provided.
                res.status(401).send({errors: "Please authenticate using valid token."});
            }
            else {
                try {
                    /** Explanation of JWT verification process.
                     * Verify JWT token and extract user data.
                     * 
                     * @Verification_Process
                     * - `jwt.verify(token, process.env.JWT_SECRET)`: used to verify the token.
                     *      - `token`: The JWT token extracted from the request header.
                     *      - `secret_ecom`: The secret key used to verify the token's integrity.
                     *          - This is the same secret that was used to sign the token when it was originally created.
                     *          - If the token has been altered or is not valid, verification will fail.
                     * - If the token is valid, `jwt.verify()` returns the decoded payload from the token, which in this case is assigned to the variable `data`.
                     *      - `data` contains the information embedded when the token was created, specifically `{user: {id: user.id} }`
                     * 
                     * Extract User Data
                     * - `req.user =data.user;` assigns the `user` object (from the decoded token) to `req.user`.
                     * - This allows the information about the user (e.g. user ID) to be available in any subsequent route handler or middleware.
                     * - For example, any route that follows this middleware can use req.user.id to know which user is making the request.
                     * 
                     * Call Next Middleware
                     * - `next();` is called to pass control to the next middleware function in the stack.
                     * - If the middleware successfully authenticates the user, the request proceeds to the next handler (e.g. a route that handles a request to add a product to a cart).
                     */
                    const data = jwt.verify(token, process.env.JWT_SECRET);
                    req.user = data.user;
                    next();
                }
                catch (error) {
                    res.status(401).send({errors: "Please authenticate using valid token."});
                }
            }
        }

        /** Explanation of Middleware Usage.
         * HOW THE MIDDLEWARE IS USED (fetchUser)
         * 
         * @Purpose
         * - This middleware is used to ensure that the request is coming from an authenticated user.
         * - It validates the user's identity using the token, making sure that only authorized users can access protected routes.
         * 
         * @Usage
         * - Middleware is added to routes that require authentication.
         * - For example, in `app.post('/addtocart', fetchUser, async (req, res) => {});`
         *      - This route will only proceed if the user is authenticated.
         *      - `fetchUser` will run before this function.
         * 
         * @Summary
         * - The `fetchUser` middleware ensures that users are authenticated before they can access certain routes.
         * - It extracts the token from the request header and verifies it using a secret key.
         * - If the token is valid, the user's data is attched to req.user, allowing downstream handlers to know the user's identity.
         * - If the token is missing or invalid, the user gets a 401 Unauthorized response, preventing access to the route.
         */

        //API endpoint to add a product to user's cart.
        app.post('/addtocart', fetchUser, async (req,res) => {
            let userData = await Users.findOne({_id: req.user.id}); //Wait for server to find a single user.
            userData.cartData[req.body.itemId] += 1;
            await Users.findOneAndUpdate({_id: req.user.id}, {cartData: userData.cartData});
            res.send("Added");
        });

        //API endpoint to remove a product from user's cart.
        app.post('/removefromcart', fetchUser, async (req,res) => {
            let userData = await Users.findOne({_id: req.user.id});
            if(userData.cartData[req.body.itemId] > 0) {
                userData.cartData[req.body.itemId] -= 1;
            }
            await Users.findOneAndUpdate({_id: req.user.id}, {cartData: userData.cartData});
            res.send("Removed");
        });

        //API endpoint to get user's cart data.
        app.post('/getcart', fetchUser, async (req,res) => {
            console.log("GetCart");
            let userData = await Users.findOne({_id: req.user.id});
            res.json(userData.cartData);
        });
        //#endregion



        /**@TODO Create emailing APIs done with Zoho Mail*/




        /** Explanation of Zoho external API
         * @Variables
         * - `client_id` & `client_secret` are both retrieved from the environment variables. `process.env` is used to access environment variables, allowing to securely manage sensitive information without hard-coding it.
         * - `grant_type` is a paramater required by Zoho's OAuth API to specify the type of OAuth flow. Here it is set to "authorization_code", which is used for obtaining an access token after the user authorizes the app.
         * - `auth_code` holds the authorization code, which is a temporary code received from Zoho after a user grants application permission to acces their account. This value should be dynamic and not hard coded.
         * - `accounts_server_url` holds the base URL for Zoho's accounts server.
         * 
         * @Express_Post_Route
         * - Creates a new POST endpoint at the URL "/get-access-token" using Express.
         * - `response` is a variable that holds the HTTP POST request to Zoho's OAuth endpoint using 'axios'.
         *      - `${account_server_url}/oauth/v2/token` is the complete URL for Zoho's token endpoint.
         *      - `null` is passed because there is no request body for this POST request.
         *      - `params: {...}` specifies the query parameters needed for the POST request.
         *      - `res.json({...})` if the request is successful, it sends a JSON reponse to the client with a status of success and the access token.
         *          - `response.data` is the response object from Zoho's server, and `response.data.access_token` is the actual access token.
         */

        const client_id = process.env.ZOHO_C_ID;
        const client_secret = process.env.ZOHO_C_SECRET;
        const grant_type = "authorization_code";
        let auth_code = "1000.d48d151b746f7472e1ded977dde87eea.02be336e6d8060d249832b418cb159eb";
        let accounts_server_url = "https://accounts.zoho.com";
        
        app.post("/get-access-token", async (req,res) => {
            
            try {
                console.log("Getting access_token.");
                const response = await axios.post(
                    `${accounts_server_url}/oauth/v2/token`,
                    null,
                    {
                        params: {
                            client_id,
                            client_secret,
                            grant_type,
                            code: auth_code,
                        },
                    }
                );

                res.json({
                    success: true,
                    access_token: response.data.access_token,
                });
            }

            catch(error) {
                console.error("Error getting access token: ", error.response?.data || error.message);
                res.status(500).json({
                    success: false,
                    error: error.response?.data || error.message,
                });
            }
            /**SUMMARY
             * 
             * This snippet creates an API endpoint that, when called, attempts to obtain an access token from Zoho.
             * It uses the axios library to make an outgoing POST request to Zoho's OAuth server, passing required credentials and the authorization code.
             */
        });

        //API endpoint to send an email.
        app.post("/send-confirmation-email", async (req,res) => {

            const {to, subject, text} = req.body;
        
            if (!to || !subject || !text) {
                res.status(400).json({success: false, message: "Missing required email fields."});
            }
        
            try {
                //SMTP configuration for Zoho Mail.
                const transporter = nodemailer.createTransport({
                    host: "smtp.zoho.com",
                    port: 465,
                    secure: true,
                    auth: {
                        user: process.env.AUTO_EMAIL_ADR,
                        pass: process.env.AUTO_EMAIL_PAS,
                    },
                });
        
                await transporter.sendMail({
                    from: process.env.AUTO_EMAIL_ADR,
                    to,
                    subject,
                    text,
                });
        
                res.json({
                    success: true,
                    message: "Email sent successfully",
                });
            }
            catch(error) {
                console.log("Error sending email: ", error);
                res.status(500).json({
                    success: false,
                    message: "Failed to send email.",
                });
            }
            
        });

//#endregion





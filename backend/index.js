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
const bcrypt = require("bcryptjs");
require('dotenv').config(); //Load environment variables.






//#region - MIDDLEWARE SETUP
app.use(express.json()); //Automatically parse incoming requests as JSON.
app.use(cors()); //Allow React app to connect to the Express app.

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

//#endregion


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
        id: {
            type: Number,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
        },
        image: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: false, //CHANGE LATER
            default: `Product Description`,
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
            default: Date.now(),
        },
        available:{
            type: Boolean,
            default: true,
        },
        reviews: [ //This property is an array since it will hold multiple reviews.
            {
                id: {
                    type: Number,
                    required: true,
                    unique: true,
                },
                name: {
                    type: String,
                    required: true,
                },
                rating: {
                    type: Number,
                    required: true,
                },
                comment: {
                    type: String,
                    required: true,
                },
                image: { //This property gives the option to add an image to a review.
                    type: String,
                    required: false,
                },
                user: {//This property is created to assign the user to the review made.
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                    ref: "users",
                },
                date: {
                    type: Date,
                    required: true,
                    default: Date.now(),
                },
            },
        ],
        rating: { //This will be the average. It will be retrieved from getting all reviews, adding the rating value for each one, then divide by the number of reviews made, based off the current product id.
            type: Number,
            required: true,
            default: 0,
        },
        reviewNumber: { //This will count the number of reviews that have been made.
            type: Number,
            required: true,
            default: 0,
        }
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
            console.log("Product Added");

            //Respond with success.
            res.json({
                success: true,
                name: req.body.name,
            })
        });


        //API endpoint to edit product by ID.
        app.post('/editproduct', async (req,res) => {
            try {
                const filter = {id:req.body.id};
                const update = {
                    name: req.body.name,
                    price: req.body.price,
                    category: req.body.category,
                }

                let product = await Product.findOneAndUpdate(filter, update);
                product;
                product.save();
                console.log("Product ID: "+ product.id +", has successfully updated!");

                if(product){
                    res.json({
                        success: true,
                        name: product.name,
                    })
                }
            }
            catch(error) {
                console.log("An error occurred trying to update a product: ", error);
            }

        })


        //API endpoint to remove a product by ID.
        app.post('/removeproduct', async (req,res) => {
            await Product.findOneAndDelete({id:req.body.id});

            res.json({
                success: true,
                name: req.body.name,
            });
        });

        //API endpoint to fetch all products.
        app.get('/allproducts', async (req,res) => {
            let products = await Product.find({});
            res.send(products); //Respond with list of all products.
        });

        //API endpoint to fetch the newest items (last 8 added).
        app.get('/newitems', async (req,res) => {
            let products = await Product.find({}); //Get all products.
            let newItems = products.slice(-8);
            console.log("New Items Fetched.");
            res.send(newItems);
        });

        /**
         * @TODO Create algorithm that compares the likes of 1 product to other products and shows the 3 most popular.
         */

        //API endpoint to fetch popular flavors (first 4 items).
        app.get('/popular', async (req,res) => {
            let products = await Product.find({}); //Get all products.
            let popular_flavors = products.slice(0,4);
            console.log("Popular Flavors Fetched.");
            res.send(popular_flavors);
        });

        //API endpoint to add a review to a product
        app.post('/addreview', fetchUser, async (req,res) => {
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

                //Link saved review to user who created it.
                await Users.findByIdAndUpdate(userId, {$push: {reviews: product._id}}); //`findByIdAndUpdate(userId, updateObject)`. The `$push` is a MongoDB update operator. The `{reviews:` is the name of the array field within the user's document where reviews are stored. ` product._id}` is the unique ID of the product that was reviewed.

                //Respond with success.
                res.json({
                    success: true,
                    review: newReview,
                });
            }

            catch (error) {
                console.error("IN THE CATCH", error);
                res.status(500).json({ error: "Server Error" });
            }
        });

        app.get('/productreviews/:productId', async (req,res) => {
            const productId = req.params.productId;
            let product = await Product.findOne({id:productId});

            res.status(200).json({
                success: true,
                reviews: product.reviews,
            });
        });

    //#endregion

    //Define User schema and create Mongoose model.
    const userSchema = new mongoose.Schema({ //This creates the model named 'users' in the mongoose database.
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
        const user = this; //`this` refers to the document.
        if(user.isModified("password")) {
            user.password = await bcrypt.hash(user.password, 8);
        }

        next();
    })

    const Users = mongoose.model("Users", userSchema);



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
        })

       

        //API endpoint to add a product to user's cart.
        app.post('/addtocart', fetchUser, async (req,res) => {
            let userData = await Users.findOne({_id: req.user.id}); //Wait for server to find a single user.
            userData.cartData[req.body.itemId] += 1;
            await Users.findOneAndUpdate({_id: req.user.id}, {cartData: userData.cartData});
        });

        //API endpoint to remove a product from user's cart.
        app.post('/removefromcart', fetchUser, async (req,res) => {
            let userData = await Users.findOne({_id: req.user.id});
            if(userData.cartData[req.body.itemId] > 0) {
                userData.cartData[req.body.itemId] -= 1;
            }
            await Users.findOneAndUpdate({_id: req.user.id}, {cartData: userData.cartData});
        });

        //API endpoint to get user's cart data.
        app.post('/getcart', fetchUser, async (req,res) => {
            console.log("GetCart");
            let userData = await Users.findOne({_id: req.user.id});
            res.json(userData.cartData);
        });
        //#endregion





        //API endpoint to send an email.
        app.post("/send-confirmation-email", fetchUser, async (req,res) => {
            console.log("API contacted.")

            let userData = await Users.findOne({_id: req.user.id});
            let cartData = userData.cartData;
            
        
            try {
                //Find all products that are in the cart by querying the Product collection.
                let cartItemIds = Object.keys(cartData).filter(itemId => cartData[itemId] > 0);
                let products = await Product.find({id: {$in: cartItemIds} });

                
                let cartSummary = "Your cart summary includes the following items: \n\n";
                let totalAmount = 0;

                products.forEach((product) => {
                    const quantity = cartData[product.id];
                    const itemTotal = product.price * quantity;
                    totalAmount += itemTotal;

                    cartSummary += `Product: ${product.name}\n`;
                    cartSummary += `Price: ${product.price}\n`;
                    cartSummary += `Quantity: ${quantity}\n`;
                    cartSummary += `Total: $${itemTotal}\n`;
                    cartSummary += `==================================\n\n`
                });

                if(cartSummary === "Your cart summary includes the following items: \n\n") {
                    cartSummary += `No items in your cart.`
                }

                cartSummary += `\nGrand Total = $${totalAmount}`

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
                console.log("Emails sending");
                await transporter.sendMail({
                    from: process.env.AUTO_EMAIL_ADR,
                    to: userData.email,
                    subject: "Order Confirmation",
                    text: `Your order has been confirmed.\n\n ${cartSummary}`,
                });
        
                res.json({
                    success: true,
                    message: "Email sent successfully"
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





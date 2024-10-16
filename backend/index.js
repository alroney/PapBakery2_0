const port = 4000;

//const [name of variable] = require("[name of package]");
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { error } = require("console");

//Database variables
const username = "alrpapb";
const password = "c3ZVpLGPJ4kCXC";
const cluster = "cluster0";
const project = "Papbakery";
let uri = `mongodb+srv://${username}:${password}@${cluster}.ci6fw.mongodb.net/${project}`;

app.use(express.json()); //Any request that is received from response will be automatically passed through json.
app.use(cors()); //This will allow the reactjs project to connect to express app on the specificed port (4000).

//Database connection with MongoDB
mongoose.connect(uri);

//Image Storage Engine
const storage = multer.diskStorage({
    destination: './upload/images', //Path of upload folder.
    filename: (req, file, cb) => { //(require, file, )
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)//cb(null, `(template literal)` )
    }
})

const upload = multer({storage:storage})

//#region - API
    //API creation
    app.get("/", (req, res) => {
        res.send("Express App is Running")//response.send displays the text on to web page.
    })

    //Creating upload endpoint for images
    app.use('/images', express.static('upload/images'))

    //API Endpoint named upload used to allow upload of images.
    app.post("/upload", upload.single('product'), (req,res) => {//field name is product
        res.json({ //Respond with success and img url.
            success:1,
            image_url:`http://localhost:${port}/images/${req.file.filename}`
        })
    })

    //Schema for creating products
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

    //API Endpoint named addproduct with an asynchronous arrow function.
    app.post('/addproduct', async (req,res) => {
        let products = await Product.find({}); //Get all existing products into one array.
        let id;
        if(products.legnth > 0) {
            let last_product_array = products.slice(-1); //Get only the last object(product) from the array of objects(products).
            let last_product = last_product_array[0]; //Access the (last)product with the index 0 since their is only 1 object in the array.
            id = last_product.id+1; //Get id of last product, then add 1 to it to create the id for the new product.
        }
        else {
            id = 1;
        }

        //Create a product for Product using values requested from body.
        const product = new Product({
            //key: value
            id: id,
            name: req.body.name, //request name from the body.
            image: req.body.image,
            category: req.body.category,
            price: req.body.price,
        });
        //Log and save.
        console.log(product);
        await product.save();//Save to database.
        console.log("Saved");
        res.json({ //Create response with the keys success and name.
            success: true,
            name: req.body.name,
        })
    })


    //API Endpoint used to remove product from database.
    app.post('/removeproduct', async (req,res) => {
        await Product.findOneAndDelete({id:req.body.id});
        console.log("Removed");
        res.json({
            success: true,
            name: req.body.name,
        });
    })


    //API Endpoint used to get all products.
    app.get('/allproducts', async (req,res) => {
        let products = await Product.find({}); //Await the server and get all products.
        console.log("All Products Fetched");
        res.send(products); //Respond with display of all products.
    })


    //API Endpoint for listening to port.
    app.listen(port, (error) => {
        if(!error) {
            console.log("Server Running on Port "+ port)
        }
        else {
            console.log("Error: "+ error);
        }
    })
//#endregion
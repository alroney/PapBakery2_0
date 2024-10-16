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

//API creation
app.get("/", (req, res) => {
    res.send("Express App is Running")//response.send displays the text on to web page.
})

//Image Storage Engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage:storage})

//Creating upload endpoint for images
app.use('/images', express.static('upload/images'))
app.post("/upload", upload.single('product'), (req,res) => {//field name is product
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })
})

//Schema for creating products
const Product = mongoose.model("Product", {
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

//Endpoint named addproduct with an asynchronous arrow function.
app.post('/addproduct', async (req,res) => {
    let products = await Product.find({}); //Get all existing products in one array.
    let id;
    if(products.legnth > 0) {
        let last_product_array = products.slice(-1); //Get the last object(product) only from the array of objects(products).
        let last_product = last_product_array[0]; //Access the (last)product with the index 0 since their is only 1 object in the array.
        id = last_product.id+1; //Get id of last product, then add 1 to it to create the id for the new product.
    }
    const product = new Product({
        id: id,
        name: req.body.name,
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






app.listen(port, (error) => {
    if(!error) {
        console.log("Server Running on Port "+ port)
    }
    else {
        console.log("Error: "+ error);
    }
})
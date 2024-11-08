const multer = require('multer');
const path = require('path');
const serverUrl = process.env.SERVER_URL;


//Image Storage Engine configuration
const storage = multer.diskStorage({
    destination: '../upload/images', //Directory to save uploaded images.
    filename: (req, file, cb) => {
        //Generate unique filename with original extension.
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`); //`cb` is a callback function that is provided by the Multer library (used for handling file uploads in Node.js).
    }
})

//Multer configuration for file uploads.
const upload = multer({storage:storage})

//API Endpoint to handle image uploads.
const uploadImage = (req,res) => {//field name is product.
    try {
        //Respond with success and img url.
        res.json({
            success:1,
            image_url:`${serverUrl}/images/${req.file.filename}`
        })
    }
    catch(error) {
        console.log("Upload error occurred: ", error);
    }
}


module.exports = { upload, uploadImage }
const multer = require('multer');
const path = require('path');
const serverUrl = process.env.SERVER_URL;

//Maximum file size (in bytes)
const MAX_FILE_SIZE = 5 * 1024 * 1024; //5MB


//Image Storage Engine configuration
const storage = multer.diskStorage({
    destination: path.join(__dirname, '../upload/images'), //Directory to save uploaded images.
    filename: (req, file, cb) => {
        //Generate unique filename with original extension.
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`); //`cb` is a callback function that is provided by the Multer library (used for handling file uploads in Node.js).
    }
})



//Multer configuration for file uploads.
const upload = multer({
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE, //Limit file size.
    },
    fileFilter: (req, file, cb) => {
        //Filter for specific file types.
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if(extname && mimetype) {
            return cb(null, true);
        }
        else {
            cb(new Error ('Only image files are allowed!'));
        }
    },
});



//API Endpoint to handle image uploads.
const uploadImage = (req,res) => {
    try {
        //Respond with success and img url.
        res.json({
            success:1,
            image_url:`${serverUrl}/images/${req.file.filename}`
        })
    }
    catch(error) {
        console.log("Upload error occurred: ", error);
        res.status(400).json({
            success: 0,
            message: error.message || "An error occurred during the upload.",
        })
    }
}


module.exports = { upload, uploadImage }
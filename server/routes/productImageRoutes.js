const express = require('express');
const router = express.Router();
const productImageController = require('../controllers/productImageController');
// const authenticateUser = require('../middlewares/authMiddleware');

router.get('/by-sku/:sku', productImageController.getProductImagesAPI);

//Admin routes that require authentications.
router.post('/update-all', productImageController.updateAllProductImages);
router.post('/refresh-cache' , productImageController.forceRefreshImageCache);

module.exports = router;
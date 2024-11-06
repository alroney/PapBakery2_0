const express = require('express');
const router = express.Router();
const authenticateUser = require('../middlewares/authMiddleware');
const { allProducts, addProduct, removeProduct, editProduct, topProducts, newProducts} = require('../controllers/productController');

router.get('/api/allProducts', allProducts);
router.get('/api/topProducts', topProducts);
router.get('/api/newProducts', newProducts);

router.post('/api/addproduct', addProduct);
router.post('/api/editProduct', editProduct);
router.post('/api/removeProduct', removeProduct);

module.exports = router;
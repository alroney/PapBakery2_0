const express = require('express');
const router = express.Router();
const authenticateUser = require('../middlewares/authMiddleware');
const { allProducts, addProduct, removeProduct, editProduct, topProducts, newProducts, syncProducts} = require('../controllers/productController');


router.get('/all', allProducts);
router.get('/top', topProducts);
router.get('/new', newProducts);

router.post('/sync', syncProducts);
router.post('/add', addProduct);
router.post('/edit', editProduct);
router.post('/remove', removeProduct);

module.exports = router;
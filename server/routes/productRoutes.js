const express = require('express');
const router = express.Router();
const authenticateUser = require('../middlewares/authMiddleware');
const { allProducts, addProduct, removeProduct, editProduct, topProducts, newProducts, syncProducts, allCategories, allSubCategories} = require('../controllers/productController');
const { testDSKU } = require('../controllers/seatableControllers/stProdBuildController');


router.get('/all', allProducts);
router.get('/top', topProducts);
router.get('/new', newProducts);
router.get('/allCategories', allCategories);
router.get('/allSubCategories', allSubCategories);

router.post('/sync', syncProducts);
router.post('/add', addProduct);
router.post('/edit', editProduct);
router.post('/remove', removeProduct);
router.post('/destructSKU', testDSKU);

module.exports = router;
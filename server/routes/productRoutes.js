const express = require('express');
const router = express.Router();
const authenticateUser = require('../middlewares/authMiddleware');
const { allProducts, addProduct, removeProduct, editProduct, topProducts, newProducts, syncProducts, allCategories, allSubCategories, getFlavorOptions, getFlourOptions, getShapeOptions, getSizeOptions, getProductBySKU, getSubcategoryById, getCategoryShapes, getCategoryShapeSizes, getProductConstraints} = require('../controllers/productController');
const { testDSKU } = require('../controllers/seatableControllers/stProdBuildController');


router.get('/all', allProducts);
router.get('/top', topProducts);
router.get('/new', newProducts);
router.get('/allCategories', allCategories);
router.get('/allSubCategories', allSubCategories);
router.get('/options/flavors', getFlavorOptions);
router.get('/options/flours', getFlourOptions);
router.get('/options/shapes', getShapeOptions);
router.get('/options/sizes', getSizeOptions);
router.get('/options/category-shapes', getCategoryShapes);
router.get('/options/category-shape-sizes', getCategoryShapeSizes);
router.get('/by-sku/:sku', getProductBySKU); //The colon indicates a parameter in the URL.')
router.get('/subcategory/:id', getSubcategoryById);
router.get("/constraints/", getProductConstraints);

router.post('/sync', syncProducts);
router.post('/add', addProduct);
router.post('/edit', editProduct);
router.post('/remove', removeProduct);
router.post('/destructSKU', testDSKU);

module.exports = router;
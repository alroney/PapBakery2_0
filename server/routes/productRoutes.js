const express = require('express');
const router = express.Router();
const authenticateUser = require('../middlewares/authMiddleware');
const productController = require('../controllers/productController');
const { testDSKU } = require('../controllers/seatableControllers/stProdBuildController');


router.get('/all', productController.allProducts);
router.get('/top', productController.topProducts);
router.get('/new', productController.newProducts);
router.get('/allCategories', productController.allCategories);
router.get('/allSubCategories', productController.allSubCategories);
router.get('/options/flavors', productController.getFlavorOptions);
router.get('/options/flours', productController.getFlourOptions);
router.get('/options/shapes', productController.getShapeOptions);
router.get('/options/sizes', productController.getSizeOptions);
router.get('/options/category-shapes', productController.getCategoryShapes);
router.get('/options/category-shape-sizes', productController.getCategoryShapeSizes);
router.get('/by-sku/:sku', productController.getProductBySKU); //The colon indicates a parameter in the URL.')
router.get('/subcategory/:id', productController.getSubcategoryById);
router.get("/constraints/", productController.getProductConstraints);
router.get('/nutrition/:sku', productController.getNutritionImage);

router.post('/sync', productController.syncProducts);
router.post('/add', productController.addProduct);
router.post('/edit', productController.editProduct);
router.post('/remove', productController.removeProduct);
router.post('/destructSKU', testDSKU);

module.exports = router;
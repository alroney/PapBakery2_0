const express = require('express');
const router = express.Router();
const { updateRows, calculate } = require('../controllers/seatableController');
const { convertFKeys, updateProductsTable, buildRecipes, generateRecipeNutritionFact  } = require('../controllers/seatableControllers/stcTestMap');
const { getTableData, getTables, syncSeaTableData } = require('../controllers/seatableControllers/stDataController');
// const checkAuth = require('../middlewares/seatableMiddleware');

router.get('/tables', getTables);
router.get('/table/:tableName', getTableData);
router.get('/updateProductsTable', updateProductsTable);
router.get('/syncSeaTable', syncSeaTableData);
router.get('/buildRecipes', buildRecipes);
router.get('/test', generateRecipeNutritionFact);

router.post('/convertFKeys', convertFKeys);
router.post('/calculate', calculate);

router.put('/update', updateRows);

module.exports = router;
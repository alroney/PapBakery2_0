const express = require('express');
const router = express.Router();
const { updateRows, calculate, convertFKeys } = require('../controllers/seatableController');
const { updateProductTable, buildRecipes, perProductFacts, fullUpdate  } = require('../controllers/seatableControllers/stProdBuildController');
const { getTableData, getTables, syncSeaTableData } = require('../controllers/seatableControllers/stDataController');
const { buildBag } = require('../services/bagBuilder');
// const checkAuth = require('../middlewares/seatableMiddleware');

router.get('/tables', getTables);
router.get('/table/:tableName', getTableData);
router.get('/updateProductTable', updateProductTable);
router.get('/syncSeaTable', syncSeaTableData);
router.get('/buildRecipes', buildRecipes);
router.get('/perProductFacts', perProductFacts);
router.get('/test', fullUpdate);

router.post('/buildBag', buildBag);
router.post('/convertFKeys', convertFKeys);
router.post('/calculate', calculate);

router.put('/update', updateRows);

module.exports = router;
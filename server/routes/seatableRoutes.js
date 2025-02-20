const express = require('express');
const router = express.Router();
const { updateRows, calculate } = require('../controllers/seatableController');
const { convertFKeys, updateProductsTable, fullSync } = require('../controllers/seatableControllers/stcTestMap');
const { getTableData, getTables } = require('../controllers/seatableControllers/stDataController');
// const checkAuth = require('../middlewares/seatableMiddleware');

router.get('/tables', getTables);
router.get('/table/:tableName', getTableData);
router.get('/updateProductsTable', updateProductsTable);
router.get('/fullSync', fullSync);

router.post('/convertFKeys', convertFKeys);
router.post('/calculate', calculate);

router.put('/update', updateRows);

module.exports = router;
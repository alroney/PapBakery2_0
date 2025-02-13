const express = require('express');
const router = express.Router();
const { updateRows, calculate } = require('../controllers/seatableController');
const { testSTCMaps, updateProductsTable } = require('../controllers/seatableControllers/stcTestMap');
const { getAvailableTables, getTableData } = require('../controllers/seatableControllers/stDataController');
// const checkAuth = require('../middlewares/seatableMiddleware');

router.get('/tables', getAvailableTables);
router.get('/table/:tableName', getTableData);
router.get('/test', testSTCMaps);
router.get('/updateProductsTable', updateProductsTable);

router.post('/calculate', calculate);

router.put('/update', updateRows);

module.exports = router;
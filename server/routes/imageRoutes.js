const express = require('express');
const router = express.Router();
const { upload } = require('../controllers/imageController');

router.post('/upload', upload);

module.exports = router;
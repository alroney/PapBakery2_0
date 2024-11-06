const express = require('express');
const router = express.Router();
const { signup, login } = require('../controllers/userController');

router.post('/api/login', login);
router.post('/api/signup', signup);

module.exports = router;
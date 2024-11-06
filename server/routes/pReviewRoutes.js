const express = require('express');
const router = express.Router();
const authenticateUser = require('../middlewares/authMiddleware');
const { productReviews, addReview } = require('../controllers/pReviewController');



router.post('/api/addReview', authenticateUser, addReview);
router.get('/api/productReviews/:productId', productReviews);

module.exports = router;
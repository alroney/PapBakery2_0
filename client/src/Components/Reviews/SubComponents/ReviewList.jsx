// SubComponents/ReviewList.jsx
import React from 'react';
import ReviewItem from './ReviewItem';

const ReviewList = ({ reviews }) => {
    


    return (
        <div className="reviews">
            {reviews.length === 0 ? (
                <div className="no-reviews">No reviews yet</div>
            ) : (
                reviews.map(review => (
                    <ReviewItem key={review._id} review={review} />
                ))
            )}
        </div>
    );
};

export default ReviewList;
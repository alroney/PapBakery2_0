import React, { memo } from 'react';
import './DisplayReview.css';

export const DisplayReview = memo(({ reviews }) => {
    
  return (
    <div className="displayreview">
        <hr />
        {reviews.length === 0 && <p>No reviews yet.</p>}
        {reviews.map((review) => {
            //Template to map each review according to its key (index).
            return (
                <div key={review.id} className="displayreview-format-main displayreview-format">
                    <h1 className='displayreview-title'>{review.name}</h1>
                    <p className='displayreview-date'>{review.date}</p>
                    <p className='displayreview-user'>{review.user && review.user.name ? review.user.name : "Anonymous"}</p>
                    <p className='displayreview-rating'>{review.rating}</p>
                    <p className='displayreview-comment'>{review.comment}</p>
                </div>
            )
        })}
    </div>
  )
});

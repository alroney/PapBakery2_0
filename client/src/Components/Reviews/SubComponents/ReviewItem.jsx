// SubComponents/ReviewItem.jsx
import React from 'react';

const ReviewItem = ({ review }) => {

    //Date formatting
    const formatLongDate = (date) => {
        const options = { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true, 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        };
        return new Date(date).toLocaleString('en-US', options);
    }

    const formatShortDate = (date) => {
        const d = new Date(date);
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear().toString().slice(-2)}`;
    };


    //Comment handling
    const handleToggle = (e) => {
        const commentText = e.target.previousElementSibling;
        commentText.classList.toggle('expanded');
        e.target.textContent = commentText.classList.contains('expanded') ? 'Show Less' : 'Continue Reading';
    }

    const checkOverflow = (element) => {
        return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
    }

    const handleCommentRef = (comment) => {
        if(comment && checkOverflow(comment)) {
            comment.nextElementSibling.style.display = 'inline';
        }
    }

    //Helper function to convert numerical rating to stars
    const convertRatingToStars = (rating) => {
        const filledStars = '★'.repeat(rating).split('').map((star, index) => (
            <span key={`filled-${index}`} style={{ color: 'gold' }}>{star}</span>
        ));
        const emptyStars = '☆'.repeat(5 - rating).split('').map((star, index) => (
            <span key={`empty-${index}`} style={{ color: 'gray' }}>{star}</span>
        ));
        return [...filledStars, ...emptyStars];
    }

    return (
        <div className="reviewItem">
            <div className="reviewItem-left-content">
                <div className="reviewItem-title">{review.title}</div>
                <div className="reviewItem-lc-lower">
                    <img className="reviewItem-image" src="#" alt="" />
                    <div className="reviewItem-lc-txt">
                        <div className="reviewItem-lc-t-top">
                            <p className="reviewItem-user">{review.userId.name}</p>
                            <p className='reviewItem-date'>
                                <span className='reviewItem-date-extended'>{formatLongDate(review.createdAt)}</span>
                                <span className='reviewItem-date-short'>{formatShortDate(review.createdAt)}</span>
                            </p>
                        </div>
                        <p className='reviewItem-comment'>
                            <span className='comment-text' ref={handleCommentRef}>{review.comment}</span>
                            <span className='continue-reading' onClick={handleToggle}>Continue reading</span>
                        </p>
                    </div>
                </div>
            </div>
            <div className="reviewItem-right-content">
                <div className="reviewItem-rating">{convertRatingToStars(review.rating)}</div>
            </div>
        </div>
    );
};

export default ReviewItem;
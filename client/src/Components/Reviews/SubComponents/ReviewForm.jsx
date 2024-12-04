// SubComponents/ReviewForm.jsx
import React from 'react';
import StarRating from './StarRating';

const ReviewForm = ({ 
    newReview, 
    setNewReview, 
    titleCharCount, 
    commentCharCount, 
    setTitleCharCount, 
    setCommentCharCount,
    error,
    onSubmit,
    onCancel 
}) => {

    

    return (
        <div className="addreview">
            {error && <div className="addreview-error">{error}</div>}
            <div className="addreview-itemfield">
                <p>Title</p>
                <div className="input-wrapper">
                    <input
                        type="text"
                        value={newReview.title}
                        onChange={(e) => {
                            setNewReview({ ...newReview, title: e.target.value });
                            setTitleCharCount(e.target.value.length);
                        }}
                        maxLength={50}
                    />
                    <span className="char-counter">{titleCharCount}/50</span>
                </div>
            </div>
            <div className="addreview-itemfield">
                <p>Comment</p>
                <div className="input-wrapper">
                    <textarea
                        value={newReview.comment}
                        onChange={(e) => {
                            setNewReview({ ...newReview, comment: e.target.value });
                            setCommentCharCount(e.target.value.length);
                        }}
                        maxLength={300}
                    />
                    <span className="char-counter">{commentCharCount}/300</span>
                </div>
            </div>
            <div className="addreview-itemfield">
                <StarRating rating={newReview.rating} setRating={(rating) => setNewReview({ ...newReview, rating })} />
            </div>
            <button className="addreview-btn" onClick={onSubmit}>Submit Review</button>
            <button className="addreview-btn cancel-btn" onClick={onCancel}>Cancel</button>
        </div>
    );
};

export default ReviewForm;
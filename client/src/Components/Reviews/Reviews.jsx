import React, { useEffect, useState, useCallback } from 'react';
import './Reviews.css';
import apiUrl from '@config'
import { useUser } from '../../Context/UserContext';
import StarRating from './StarRating';

export const Reviews = React.memo(({ productId }) => {
    console.log("(Reviews.jsx) Component Loaded.");

    const {currentUser} = useUser();
    const [reviews, setReviews] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const [titleCharCount, setTitleCharCount] = useState(0);
    const [commentCharCount, setCommentCharCount] = useState(0);
    const [newReview, setNewReview] = useState({
        title: '',
        comment: '',
        rating: 0,
        image: '',

    });


    useEffect(() => {
        fetchReviews();
    }, [productId]);


    const fetchReviews = async () => {
        try {
            const response = await fetch(`${apiUrl}/reviews/${productId}`);
            const data = await response.json();
            console.log("(fetchReviews) data.reviews: ", data.reviews);
            setReviews(data.reviews);
        }
        catch(error) {
            console.error("Error fetching updated reviews: ", error);
        }
    }

    // Helper function to convert numerical rating to stars
    const convertRatingToStars = (rating) => {
        return '★'.repeat(rating) + '☆'.repeat(5 - rating);
    };

    const handleTitleChange = useCallback((e) => {
        const value = e.target.value.slice(0, 30);
        if(value.length > 0) {
            setError('');
        }
        setNewReview((prevReview) => ({ ...prevReview, title: value }));
        setTitleCharCount(value.length);
    }, []);

    const handleCommentChange = useCallback((e) => {
        const value = e.target.value.slice(0, 100);
        setNewReview((prevReview) => ({ ...prevReview, comment: value }));
        setCommentCharCount(value.length);
    }, []);

    const showAddReview = () => {
        if(!currentUser) {
            setShowForm(false);
            setError("You need to logged in to create a new review.");
            return;
        }
        else {
            setError("")
            setShowForm(true);
            return;
        }
    }



    const handleAddReview = async (e) => {
        e.preventDefault();
        if(!newReview.title) {
            setError("Title is required.");
            return;
        }
        if(newReview.rating < 1) {
            setError("Rating is required.");
            return;
        }
        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch(`${apiUrl}/reviews/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ ...newReview, productId, userId: currentUser._id }),
            });

            const data = response.json();
            setReviews((prevReviews) => [...prevReviews, data.reviews]);
            setNewReview({ title: '', comment: '', rating: 0 });
            setShowForm(false);
            fetchReviews();
        }
        catch(error) {
            console.error("Error submitting review: ", error);
        }
    }


    const cancelForm = () => {
        setNewReview({
            title: "",
            rating: 0,
            comment: "",
            image: "",
        });
        setShowForm(false);
    }

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



    //Pagination variables.
    const [currentPage, setCurrentPage] = useState(1);
    const [reviewsPerPage, setReviewsPerPage] = useState(5);
    const indexOfLastReview = currentPage * reviewsPerPage;
    const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
    const currentReviews = reviews.slice(indexOfFirstReview, indexOfLastReview);
    const totalPages = Math.ceil(reviews.length / reviewsPerPage);

    const handleNextPage = () => {
        if(currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    }

    const handlePrevPage = () => {
        if(currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }

    }

  return (
    <div className='review-section'>
        <div className='addreview'>
            {!showForm
                ? (
                    <>
                        {error && <p className='addreview-error'>{error}</p>}
                        <button onClick={() => showAddReview()} className="addreview-btn">Add New Review</button>
                    </>
                ) : (
                    <>
                        {error && <p className='addreview-error'>{error}</p>}
                        <form onSubmit={handleAddReview}>
                            <div className="addreview-itemfield">
                                <p>Title</p>
                                <div className="input-wrapper">
                                    <input 
                                        type='text' 
                                        id='title' 
                                        placeholder='Title' 
                                        value={newReview.title} 
                                        onChange={handleTitleChange}
                                    />
                                    <span className="char-counter">{titleCharCount}/30</span>
                                </div>
                            </div>
                            <div className="addreview-itemfield">
                                <p>Comment</p>
                                    <div className="input-wrapper">
                                    <textarea 
                                        type='text' 
                                        placeholder='Comment' 
                                        value={newReview.comment} 
                                        onChange={handleCommentChange}
                                        rows="4"
                                    />
                                    <span className="char-counter">{commentCharCount}/100</span>
                                </div>
                            </div>
                            <div className="addreview-itemfield">
                                <StarRating rating={newReview.rating} onRatingChange={(rating) => setNewReview({ ...newReview, rating })} />
                            </div>
                            <button className='addreview-btn' type='submit'>Submit Review</button>
                            <button className='addreview-btn cancel-btn' onClick={() => cancelForm()}>Cancel</button>
                        </form>
                    </>
                )
            }
        </div>
        

        <div className='reviews'>
            {currentReviews.length === 0 && <p className='no-reviews'>No reviews yet.</p>}
            {currentReviews.map((review) => {
                //Template to map each review according to its key (index).
                return (
                    <div key={review._id} className='reviewItem'>
                        <div className="reviewItem-left-content">
                            <h3 className='reviewItem-title'>{review.title}</h3>
                            <div className="reviewItem-lc-lower">
                                <div className="reviewItem-image"></div>
                                <div className="reviewItem-lc-txt">
                                    <div className="reviewItem-lc-t-top">
                                        <p className='reviewItem-user'>{review.userId?.name ? review.userId.name.charAt(0).toUpperCase() + review.userId.name.slice(1) : 'Anonymous'}</p>
                                        <p className='reviewItem-date'>
                                            <span className='reviewItem-date-extended'>{formatLongDate(review.createdAt)}</span>
                                            <span className='reviewItem-date-short'>{formatShortDate(review.createdAt)}</span>
                                        </p>
                                    </div>
                                    <p className='reviewItem-comment'>{review.comment}</p>
                                </div>
                            </div>
                        </div>
                        <div className="reviewItem-right-content">
                            <p className='reviewItem-rating'>{convertRatingToStars(review.rating)}</p>
                        </div>
                    </div>
                )
            })}
            <div className="pagination">
                <button onClick={handlePrevPage} className={`pagination-btn ${currentPage === 1 ? 'button-disabled' : ''}`}>Prev</button>
                <p>{currentPage} / {totalPages}</p>
                <button onClick={handleNextPage} className={`pagination-btn ${currentPage === totalPages ? 'button-disabled' : ''}`}>Next</button>
            </div>
        </div>
    </div>
  )
})

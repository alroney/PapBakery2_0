import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '../../Context/UserContext';
import ReviewForm from './SubComponents/ReviewForm';
import ReviewList from './SubComponents/ReviewList';
import Pagination from './SubComponents/Pagination';
import './Reviews.css';
import { apiUrl } from '@config';

export const Reviews = React.memo(({ productId }) => {
    console.log("(Reviews.jsx) Component Loaded.");

    const { currentUser } = useUser();
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

    console.log("Current User: ", currentUser);
    const handleSubmit = async () => {
        if(!newReview.title) {
            setError('Title is required.');
            return;
        }
        if(newReview.rating < 1) {
            setError('Rating is required.');
            return;
        }
        if(!currentUser) {
            setError('You need to be logged in to create a new review.');
            return;
        }

        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch(`${apiUrl}/reviews/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ...newReview, productId, userId: currentUser._id }),
            });

            const data = await response.json();
            setReviews([...reviews, data.review]);
            setNewReview({ title: '', comment: '', rating: 0 });
            setShowForm(false);
        } catch (error) {
            console.error('Error submitting review: ', error);
        }
    }

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


    //Pagination variables.
    const [currentPage, setCurrentPage] = useState(1);
    const [reviewsPerPage, setReviewsPerPage] = useState(5);
    const indexOfLastReview = currentPage * reviewsPerPage;
    const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
    const currentReviews = reviews.slice(indexOfFirstReview, indexOfLastReview);
    const totalPages = Math.ceil(reviews.length / reviewsPerPage);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    }

    return (
        <div className="review-section">
            {!showForm 
                ? (
                    <>
                        {error && <p className="addreview-error">{error}</p>}
                        <button onClick={() => showAddReview()} className="addreview-btn">Write a Review</button>
                    </>
                ) : (
                    <>
                        <ReviewForm 
                            newReview={newReview}
                            setNewReview={setNewReview}
                            titleCharCount={titleCharCount}
                            commentCharCount={commentCharCount}
                            setTitleCharCount={setTitleCharCount}
                            setCommentCharCount={setCommentCharCount}
                            error={error}
                            onSubmit={handleSubmit}
                            onCancel={() => {setShowForm(false); setError('');}}
                        />
                    </>
                )
            
            }
            <ReviewList reviews={currentReviews} />
            <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
            />
        </div>
    );
});

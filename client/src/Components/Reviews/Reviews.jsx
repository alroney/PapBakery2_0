import React, { useEffect, useState } from 'react';
import './Reviews.css';
import apiUrl from '@config'
import { useUser } from '../../Context/UserContext';

export const Reviews = ({ productId }) => {
    console.log("(Reviews.jsx) Component Loaded.");

    const {currentUser} = useUser();
    const [reviews, setReviews] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
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



    const handleSubmit = async (e) => {
        e.preventDefault();
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
            setReviews(data.reviews);
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


  return (
    <div className='review-section'>
        <div className='addreview'>
            {!showForm
                ? (
                    <>
                        {error && <p className='addReview-error'>{error}</p>}
                        <button onClick={() => showAddReview()} className="addreview-btn">Add New Review</button>
                    </>
                ) : (
                    <>
                        {error && <p className='addReview-error'>{error}</p>}
                        <form onSubmit={handleSubmit}>
                            <div className="addreview-itemfield">
                                <p>Title</p>
                                <input type='text' placeholder='Title' value={newReview.title} onChange={(e) => setNewReview({ ...newReview, title: e.target.value })} />
                            </div>
                            <div className="addreview-itemfield">
                                <p>Comment</p>
                                <input type='text' placeholder='Comment' value={newReview.comment} onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })} />
                            </div>
                            <div className="addreview-itemfield">
                                <p>Rating</p>
                                <select value={newReview.rating} onChange={(e) => setNewReview({ ...newReview, rating: e.target.value })}>
                                    <option value='0'>0</option>
                                    <option value='1'>1</option>
                                    <option value='2'>2</option>
                                    <option value='3'>3</option>
                                    <option value='4'>4</option>
                                    <option value='5'>5</option>
                                </select>
                            </div>
                            <button className='addreview-btn' type='submit'>Submit Review</button>
                            <button className='addreview-btn cancel-btn' onClick={() => cancelForm()}>Cancel</button>
                        </form>
                    </>
                )
            }
        </div>
        

        <div className='reviews'>
            {reviews.length === 0 && <p className='no-reviews'>No reviews yet.</p>}
            {reviews.map((review) => {
                //Template to map each review according to its key (index).
                return (
                    <div key={review._id} className='reviewItem'>
                        <h3 className='reviewItem-title'>{review.title}</h3>
                        <p className='reviewItem-user'>{review.userId?.name || 'Anonymous'}</p>
                        <p className='reviewItem-comment'>{review.comment}</p>
                        <p className='reviewItem-rating'>Rating: {review.rating}</p>
                    </div>
                )
            })}
        </div>
    </div>
  )
}

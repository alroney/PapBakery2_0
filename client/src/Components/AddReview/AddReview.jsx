import React, { useEffect, useState } from 'react';
import { useUser } from '../../Context/UserContext';

import './AddReview.css';
import upload_area from '../Assets/img/icon/upload_area.svg';
import apiUrl from '@config';


export const AddReview = (props) => {
    const { product, onAddReview } = props; //Store the current product object into product
    const { currentUser } = useUser();
    const [image, setImage] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const [reviewDetails, setReviewDetails] = useState({
        userId: "",
        productId: product.id,
        title: "",
        rating: 0,
        comment: "",
        image: "",
    });

    

    //Image handler gets called from the activation of the input field with the onChange property that specifies imageHandler.
    const imageHandler = (e) => {
        setImage(e.target.files[0]); //Set the image to the first([0]) selected image from the target of files (chosen from a popup window).
    }

    const changeHandler = (e) => {
        //Create a new object with all the existing product details, then update the specific field (e.target.name) with its new value (e.target.value).
        setReviewDetails({
            ...reviewDetails, //Spread the current product details (keep the other properties).
             [e.target.name]:e.target.value //Update the property that matches the input's name.
        });
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


    const cancelForm = () => {
        setReviewDetails({
            title: "",
            rating: 0,
            comment: "",
            image: "",
        });
        setShowForm(false);
    }

    useEffect(() => {
        setReviewDetails((prevDetails) => ({
            ...prevDetails,
            productId: product._id,
        }));
    }, []);

    const handleSubmit = async () => {
        try {
            const newReview = {
                userId: currentUser._id, //Include the current user's ID
                productId: product._id,
                title: reviewDetails.title,
                rating: reviewDetails.rating,
                comment: reviewDetails.comment,
                image: '',
            }

            

            //Use the onAddReview callback to post the review to the backend and update context state.
            onAddReview(newReview);

            setReviewDetails({
                title: "",
                rating: 0,
                comment: "",
                image: "",
            });
            setImage(false);
            setError(""); //Clear error if submission succeeds.
        }
        catch(error) {
            console.error('An error occurred while adding review: ', error);
        }
    }

  return (
    <div className="addreview">
        {!showForm
            ? (
                <>
                    {error && <p className="addreview-error">{error}</p>}
                    <button onClick={() => showAddReview()} className="addreview-btn">Add New Review</button>
                </>
            ) 

            : (
                <>
                    {error && <p className="addreview-error">{error}</p>}
                    <div className="addreview-itemfield">
                        <p>Title</p>
                        <input value={reviewDetails.title} onChange={changeHandler} type="text" name="title" placeholder="Review Title" />
                    </div>

                    <div className="addreview-itemfield">
                        <p>Rating</p>
                        <select value={reviewDetails.rating} onChange={changeHandler} name="rating" className="addreview-itemfield-selector">
                            <option value="0">0</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                        </select>
                    </div>

                    <div className="addreview-itemfield">
                        <p>Comment</p>
                        <input value={reviewDetails.comment} onChange={changeHandler} type="text" name="comment" placeholder="Enter a Comment" />
                    </div>

                    <button onClick={() => (handleSubmit(product.id))} className="addreview-btn">Submit Review</button>
                    <button onClick={() => cancelForm()} className="addreview-btn cancel-btn">Cancel</button>
                </>
            )
        
        }
    </div>
  )
}

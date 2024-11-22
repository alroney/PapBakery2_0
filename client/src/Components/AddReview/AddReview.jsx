import React, { useEffect, useState } from 'react';
import './AddReview.css';
import upload_area from '../Assets/img/icon/upload_area.svg';
import apiUrl from '@config';


export const AddReview = (props) => {
    const { product, onAddReview } = props; //Store the current product object into product
    const [image, setImage] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const [reviewDetails, setReviewDetails] = useState({
        name: "",
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
        if(localStorage.getItem("isGuest") === "true") {
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
            name: "",
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

    const Add_Review = async () => {
        try {
            if(localStorage.getItem("isGuest") === "true") {
                setError("You need to be logged in to submit a review.");
                return;
            }

            let responseData;
            let review = reviewDetails;

            let formData = new FormData();

            if(image) {
                formData.append('product', image); //Append image separtely if it's provided.

                await fetch(`${apiUrl}/upload`, {
                    method:'POST',
                    headers: {
                        Accept: 'application/json',
                    },
                    body: formData,
                }).then((resp) => resp.json()).then((data) => {responseData = data});

                if(responseData.success) {
                    review.image = responseData.image_url;
                    console.log("Image success.");
                }
                else {
                    console.log("responseData was not successful.");
                }
            }

            //Use the onAddReview callback to post the review to the backend and update context state.
            if(onAddReview) {
                onAddReview(review);
                setReviewDetails({
                    name: "",
                    rating: 0,
                    comment: "",
                    image: "",
                });
                setImage(false);
                setError(""); //Clear error if submission succeeds.
            }
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
                        <input value={reviewDetails.name} onChange={changeHandler} type="text" name="name" placeholder="Review Title" />
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

                    <div className="addreview-itemfield">
                        <label htmlFor="file-input">
                            <img src={image?URL.createObjectURL(image):upload_area} className="addreview-itemfield-thumbnail-img" alt="" />
                        </label>
                        <input onChange={imageHandler} type="file" name="product" id="file-input" hidden/>
                    </div>

                    <button onClick={() => (Add_Review(product.id))} className="addreview-btn">Submit Review</button>
                    <button onClick={() => cancelForm()} className="addreview-btn cancel-btn">Cancel</button>
                </>
            )
        
        }
    </div>
  )
}

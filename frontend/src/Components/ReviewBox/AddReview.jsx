import React, { useState } from 'react'
import './AddReview.css'

export const AddReview = () => {
    const [reviewDetails, setReviewDetails] = useState({
        name: "",
        rating: 0,
        comment: "",
        image: "",
    });



    const changeHandler = (e) => {
        //Create a new object with all the existing product details, then update the specific field (e.target.name) with its new value (e.target.value).
        setReviewDetails({
            ...reviewDetails, //Spread the current product details (keep the other properties).
             [e.target.name]:e.target.value //Update the property that matches the input's name.
        });
    }

    const Add_Review = async () => {
        try {
            let responseData;

            let formData = new FormData();

            if(image) {
                formData.append('image', image); //Append image separtely if it's provided.

                await fetch('http://localhost:4000/upload', {
                    method:'POST',
                    headers: {
                        Accept: 'application/json',
                    },
                    body: formData,
                }).then((resp) => resp.json()).then((data) => {responseData = data});
            }

            

    
            await fetch('http://localhost:4000/addreview', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'auth-token': `${localStorage.getItem('auth-token')}`,
                },
                body: JSON.stringify.formData,
            }).then((resp) => resp.json()).then((data) => {responseData = data});
        }
        catch(error) {
            console.error('An error occurred while adding review: ', error);
        }

        
    }

  return (
    <div className="addreview">
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
            <input onChange={imageHandler} type="file" name="image" id="file-input" hidden/>
        </div>

        <button onClick={() => (Add_Review())} className="addreview-btn">Submit Review</button>
    </div>
  )
}

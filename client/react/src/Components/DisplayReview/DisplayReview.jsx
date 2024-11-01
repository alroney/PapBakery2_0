import React, { useEffect, useState, memo } from 'react'
import './DisplayReview.css'

export const DisplayReview = memo(({ reviews }) => {
    console.log("Rendering DisplayReview.")
    // const {product} = props;
    // const productId = product.id;
    // console.log("Product ID: ", productId);
    // const [allreviews, setAllReviews] = useState([]);//Set default of allReviews to an emtpy array. 

    // const fetchReviews = async () => {
    //     await fetch(`http://localhost:4000/productreviews/${productId}`)
    //     .then((res) => res.json())
    //     .then((data) => {
    //         if(data && data.reviews) {
    //             setAllReviews(data.reviews)
    //         }
    //         else {
    //             setAllReviews([]);
    //         }
    //     });//Saves data retrieved from productreviews api to allReviews.
    // }

    

    // useEffect(() => {

    //     fetchReviews();
    // }, [product.reviews]) //Runs whenever product.reviews changes.

  return (
    <div className="displayreview">
        <hr />
        {reviews.length === 0 && <p>No reviews yet.</p>}
        {reviews.map((review) => {
            //Template to map each review according to its key (index).
            return (
                <div key={review.id} className="displayreview-format-main displayreview-format">
                    <h1>{review.name}</h1>
                    <p>{review.date}</p>
                    <p>{review.user}</p>
                    <p>{review.rating}</p>
                    <p>{review.comment}</p>
                </div>
            )
        })}
    </div>
  )
});

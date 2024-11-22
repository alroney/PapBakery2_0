import React, { useEffect, useState } from 'react';
import { useProduct } from '../Context/ProductContext';
import { useParams } from 'react-router-dom';
import { Breadcrum } from '../Components/Breadcrums/Breadcrum';
import { ProductDisplay } from '../Components/ProductDIsplay/ProductDisplay';
import { DescriptionBox } from '../Components/DescriptionBox/DescriptionBox';
import { RelatedProducts } from '../Components/RelatedProducts/RelatedProducts';
import { AddReview } from '../Components/AddReview/AddReview';
import { DisplayReview } from '../Components/DisplayReview/DisplayReview';
import apiUrl from '@config';

export const Product = () => {
  const { state, dispatch } = useProduct();
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);


  useEffect(() => {
    //Find product by ID
    const foundProduct = state.products.find(
      (p) => p._id === productId
    );
    
    setProduct(foundProduct);
  }, [state.products, productId]);


  useEffect(() => {
    const fetchReviews = async () => {
      const response = await fetch(`${apiUrl}/reviews/${productId}`);
      const data = await response.json();
      if(data.success) {
        setReviews(data.reviews);
      }
    };

    fetchReviews();
  }, [productId]);


  /**
    * The handleAddReview function immediately dispatches an action to ad the new review to the
    state, before waiting for the server response. This provides a fast UI update, giving the
    user instant feedback
    * @param {*} newReview 
    */
  const handleAddReview = async (newReview) => {
    console.log("handleAddReview was triggered. newReview: ", newReview);

    try {
      const response = await fetch(`${apiUrl}/reviews/add`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'auth-token': `${localStorage.getItem('auth-token')}`,
        },
        body: JSON.stringify({ ...newReview, productId }),
      });

      const data = await response.json();

      if(data.success) {
        //Refetch reviews after adding a new one.
        const reviewResponse = await fetch(`${apiUrl}/reviews/${productId}`);
        const reviewData = await reviewResponse.json();
        if(reviewData.success) {
          setReviews(reviewData.reviews);
        }
      } 
      else {
        alert('Failed to add review');
      }
    }
    catch(error) {
      console.error("Catch -> Failed to add review: ", error);
    }
  };

  if(!product) {
    return <div> No product to display.</div>
  }

  return (
    <div>
      <Breadcrum product={product}/>
      <ProductDisplay product={product}/>
      <DescriptionBox/>
      {/* Add Review Form */}
      <AddReview product={product} onAddReview={handleAddReview}/>
      {/* Display Reviews */}
      <DisplayReview key={product.reviews.length} reviews={product.reviews}/>
      <RelatedProducts/>
    </div>
  )
}

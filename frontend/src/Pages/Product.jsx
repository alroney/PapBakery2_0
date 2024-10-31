import React, { useContext, useEffect, useState } from 'react';
import { useProduct } from '../Context/ProductContext';
import { useParams } from 'react-router-dom';
import { Breadcrum } from '../Components/Breadcrums/Breadcrum';
import { ProductDisplay } from '../Components/ProductDIsplay/ProductDisplay';
import { DescriptionBox } from '../Components/DescriptionBox/DescriptionBox';
import { RelatedProducts } from '../Components/RelatedProducts/RelatedProducts';
import { AddReview } from '../Components/AddReview/AddReview';
import { DisplayReview } from '../Components/DisplayReview/DisplayReview';

export const Product = () => {
  const { state, dispatch } = useProduct();
  const {productId} = useParams();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    console.log("State: ", state);
    //Find product by ID
    const foundProduct = state.products.find(
      (p) => p.id === Number(productId)
    );
    setProduct(foundProduct);
  }, [state.products, productId]);

  /**
    * The handleAddReview function immediately dispatches an action to ad the new review to the
    state, before waiting for the server response. This provides a fast UI update, giving the
    user instant feedback
    * @param {*} newReview 
    */
  const handleAddReview = async (newReview) => {
    console.log("handleAddReview was triggered. newReview: ", newReview);
    try {
      let responseData;
      
      //Post the new review to the backend.
      await fetch('http://localhost:4000/addreview', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'auth-token': `${localStorage.getItem('auth-token')}`,
        },
        body: JSON.stringify({ ...newReview, productId }),
      })
        .then((response) => response.json())
        .then((data) => {
          console.log("data: ", data);
          if(data.success) {
            //Dispatch action to update state optimistically.
            dispatch({ 
              type: 'ADD_REVIEW',
              payload: {
                productId: Number(productId),
                review: newReview,
              }
            });
          }
          else {
            alert("Failed to add review.");
          }
        });
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

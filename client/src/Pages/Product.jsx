import React, { useEffect, useState } from 'react';
import { useProduct } from '../Context/ProductContext';
import { useParams } from 'react-router-dom';
import { Breadcrum } from '../Components/Breadcrums/Breadcrum';
import { ProductDisplay } from '../Components/ProductDIsplay/ProductDisplay';
import { DescriptionBox } from '../Components/DescriptionBox/DescriptionBox';
import { RelatedProducts } from '../Components/RelatedProducts/RelatedProducts';
import { AddReview } from '../Components/AddReview/AddReview';
import { DisplayReview } from '../Components/DisplayReview/DisplayReview';
import { Reviews } from '../Components/Reviews/Reviews';
import { useUser } from '../Context/UserContext'
import apiUrl from '@config';

export const Product = () => {
  const { state, dispatch } = useProduct();
  const { currentUser } = useUser();
  const { productId } = useParams();
  const [error, setError] = useState('');
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
    fetchReviews();
  }, [productId]);


  const fetchReviews = async () => {
    try {
      const response = await fetch(`${apiUrl}/reviews/${productId}`);
      const data = await response.json();
      setReviews(data.reviews);
    }
    catch(error) {
      console.error("Error fetching updated reviews: ", error);
    }
  }


  const handleAddReview = async (newReview) => {
    if(!currentUser) {
        setError("You need to be logged in to submit a review.");
        return;
    }

    const token = localStorage.getItem('auth-token'); //Get the token.

    const response = await fetch(`${apiUrl}/reviews/add`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ ...newReview, userId: currentUser._id }),
    });

    const data = await response.json();
    if(data.success) {
      console.log("Review added successfully");
      fetchReviews();
    }
    else {
      alert("Failed to add review");
    }
  }


  if(!product) {
    return <div> No product to display.</div>
  }

  return (
    <div>
      <Breadcrum product={product}/>
      <ProductDisplay product={product}/>
      <DescriptionBox/>
      {/* <AddReview product={product} onAddReview={handleAddReview}/>
      <DisplayReview reviews={reviews}/> */}
      <Reviews productId={productId}/>
      <RelatedProducts/>
    </div>
  )
}

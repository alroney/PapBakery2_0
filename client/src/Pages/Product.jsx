import React, { useEffect, useState } from 'react';
import { useProduct } from '../Context/ProductContext';
import { useParams } from 'react-router-dom';
import { Breadcrum } from '../Components/Breadcrums/Breadcrum';
import { ProductDisplay } from '../Components/ProductDIsplay/ProductDisplay';
import { DescriptionBox } from '../Components/DescriptionBox/DescriptionBox';
import { RelatedProducts } from '../Components/RelatedProducts/RelatedProducts';
import { Reviews } from '../Components/Reviews/Reviews';
import { useUser } from '../Context/UserContext'

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


  if(!product) {
    return <div> No product to display.</div>
  }

  return (
    <div>
      <Breadcrum product={product}/>
      <ProductDisplay product={product}/>
      <DescriptionBox/>
      <Reviews productId={productId}/>
      <RelatedProducts/>
    </div>
  )
}

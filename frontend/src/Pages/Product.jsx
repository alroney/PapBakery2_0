import React, { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../Context/ShopContext';
import { useParams } from 'react-router-dom';
import { Breadcrum } from '../Components/Breadcrums/Breadcrum';
import { ProductDisplay } from '../Components/ProductDIsplay/ProductDisplay';
import { DescriptionBox } from '../Components/DescriptionBox/DescriptionBox';
import { RelatedProducts } from '../Components/RelatedProducts/RelatedProducts';
import { AddReview } from '../Components/AddReview/AddReview';
import { DisplayReview } from '../Components/DisplayReview/DisplayReview';

export const Product = () => {
  const {all_product, fetchProducts} = useContext(ShopContext);
  const {productId} = useParams();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    //Fetch products if not already loaded
    if(!all_product.length) {
      fetchProducts();
    }
  }, [all_product, fetchProducts]);

  useEffect(() => {
    const foundProduct = all_product.find((e) => e.id === Number(productId));
    setProduct(foundProduct);
  }, [all_product, productId]);

  if(!product) {
    return <div>Loading product...</div>;
  }

  return (
    <div>
      <Breadcrum product={product}/>
      <ProductDisplay product={product}/>
      <DescriptionBox/>
      <AddReview product={product}/>
      <DisplayReview product={product}/>
      <RelatedProducts/>
    </div>
  )
}

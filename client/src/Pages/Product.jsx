import React, { useEffect, useState } from 'react';
import { useProduct } from '../Context/ProductContext';
import { useParams } from 'react-router';
import { Breadcrum } from '../Components/Breadcrums/Breadcrum';
import { ProductDisplay } from '../Components/ProductDIsplay/ProductDisplay';
import { DescriptionBox } from '../Components/DescriptionBox/DescriptionBox';
import { RelatedProducts } from '../Components/RelatedProducts/RelatedProducts';
import { Reviews } from '../Components/Reviews/Reviews';

export const Product = () => {
  console.log("==(Product.jsx) Component Loaded.==");

  const { state } = useProduct();
  const { productSKU } = useParams(); //Get the product ID from the URL.
  const [product, setProduct] = useState(null);


  /* MAJOR TODO: change this to find product from SKU possibly. */

  useEffect(() => {
    //Find product by SKU
    const foundProduct = state.products.find(
      (p) => p.sku === productSKU
    );
    
    setProduct(foundProduct);
  }, [state.products, productSKU]);



  if(!product) {
    return <div> No product to display.</div>
  }


  
  return (
    <div>
      <Breadcrum product={product}/>
      <ProductDisplay product={product}/>
      <DescriptionBox/>
      {/* <Reviews productSKU={productSKU}/> */} {/* DISABLED until rework of Reviews gathering is done. */}
      <RelatedProducts/>
    </div>
  )
}

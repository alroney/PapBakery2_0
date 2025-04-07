import React, { useMemo } from 'react';
import { useProduct } from '../Context/ProductContext';
import { useParams } from 'react-router';
import { Breadcrum } from '../Components/Breadcrums/Breadcrum';
import { ProductDisplay } from '../Components/ProductDIsplay/ProductDisplay';
import { DescriptionBox } from '../Components/DescriptionBox/DescriptionBox';
import { RelatedProducts } from '../Components/RelatedProducts/RelatedProducts';
// import { Reviews } from '../Components/Reviews/Reviews';

export const Product = () => {
    console.log("==(Product.jsx) Component Loaded.==");

    const { products } = useProduct();
    const { productSKU } = useParams();

    const product = useMemo(() => 
        products.find(p => p.sku === productSKU),
        [products, productSKU]
    );

    if(!product) {
        return <div>No product to display.</div>;
    }

    return (
        <div>
            <Breadcrum product={product} />
            <ProductDisplay product={product} />
            <DescriptionBox />
            <RelatedProducts />
            {/* <Reviews /> */}
        </div>
    )
}

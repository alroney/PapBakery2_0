import React, { memo, useEffect, useState } from 'react';
import Item from '../Item/Item';
import { apiUrl } from '@config';

export const ProductGrid = memo(({ title, endpoint, className = "product-grid" }) => {
    console.log(`(${title}.jsx) Component Loaded.`);

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);



    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await fetch(`${apiUrl}${endpoint}`);

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await response.json();
                setProducts(data);
            } 
            catch (error) {
                console.error("Error fetching products: ", error);
                setError(error);
            } 
            finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [endpoint]);


    return (
        <div className={className}>
            {loading && <div className="loading">Loading...</div>}
            {error && <div className="error">Error: {error.message}</div>}
            {!loading && !error && products.length === 0 && (
                <div className="no-products">No products available.</div>
            )}

            <h1>{title}</h1>
            <hr />
            <div className={`${className}-item`}>
                {products.map((item, i) => {
                    //Get the first product image from the array if available, but only if it's not a nutrition image.
                    return (
                        <Item
                            key={i}
                            id={item._id}
                            scID={item.subCategoryID}
                            scName={item.subcategory}
                            catName={item.category}
                            sku={item.sku}
                            name={item.size + " " + item.shape + " " + item.flavor + " " + item.subcategory + " " + item.category}
                            image={item.images}
                            price={item.price}
                        />
                    )
                })}
            </div>
        </div>
    )
})
import React, { useContext, useEffect } from 'react'
import './ProductDisplay.css'
import star_icon from '../Assets/img/icon/star_icon.png'
import star_dull_icon from '../Assets/img/icon/star_dull_icon.png'
import { CartContext } from '../../Context/CartContext'

export const ProductDisplay = (props) => {
    console.log("(ProductDisplay.jsx) Component Loaded.");

    const {product} = props;
    const {name, image, description, rating, reviews, price} = product;
    const {handleAddToCart} = useContext(CartContext);


    
    //Function to render stars based on rating
    const renderStars = (rating) => {
        let stars = [];
        for(let i = 1; i<= 5; i++) {
            stars.push(
                <img 
                    key={i} 
                    src={i <= Math.round(rating) ? star_icon : star_dull_icon} 
                    alt=""
                />
            );
        }
        return stars;
    };



  return (
    <div className="productdisplay">
        <div className="productdisplay-left">
            <div className="productdisplay-img-list">
                {/* TODO: Dynamically set number of images to show based on img array. */}
                <img src={image} alt="" />
            </div>
            <div className="productdisplay-img">
                <img src={image} alt="" className="productdisplay-main-img" loading="lazy" />
            </div>
        </div>

        <div className="productdisplay-right">
            <h1>{name}</h1>
            <div className="productdisplay-right-stars" title={rating.toFixed(1)}>
                {renderStars(rating)} {/* Render average rating */}
                <p>({reviews.length})</p>
            </div>

            <div className="productdisplay-right-prices">
                <div className="productdisplay-right-price">${price}</div>
            </div>

            <div className="productdisplay-right-description">
                <p>{description}</p>
            </div>

            <div className="productdisplay-right-size">
                <h1>Select Size</h1>
                <div className="productdisplay-right-sizes">
                    {/* TODO: Dynamic size selection based on sizes available to product.*/}
                </div>
            </div>

            <button onClick={() => {handleAddToCart(product)}}>ADD TO CART</button>
            <p className="productdisplay-right-category"><span>Category: </span></p>
            <p className="productdisplay-right-category"><span>Tags: </span></p>
        </div>
    </div>
  )
}

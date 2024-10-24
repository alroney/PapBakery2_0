import React, { useContext } from 'react'
import './ProductDisplay.css'
import star_icon from '../Assets/img/icon/star_icon.png'
import star_dull_icon from '../Assets/img/icon/star_dull_icon.png'
import { ShopContext } from '../../Context/ShopContext'

export const ProductDisplay = (props) => {
    const {product} = props;
    const {addToCart} = useContext(ShopContext);
  return (
    <div className="productdisplay">
        <div className="productdisplay-left">
            <div className="productdisplay-img-list">
                <img src={product.image} alt="" />
                <img src={product.image} alt="" />
                <img src={product.image} alt="" />
                <img src={product.image} alt="" />
            </div>
            <div className="productdisplay-img">
                <img src={product.image} alt="" className="productdisplay-main-img" />
            </div>
        </div>

        <div className="productdisplay-right">
            <h1>{product.name}</h1>
            <div className="productdisplay-right-stars">
                <img src={star_icon} alt="" />
                <img src={star_icon} alt="" />
                <img src={star_icon} alt="" />
                <img src={star_icon} alt="" />
                <img src={star_dull_icon} alt="" />
                <p>(10)</p>
            </div>

            <div className="productdisplay-right-prices">
                <div className="productdisplay-right-price">${product.price}</div>
            </div>

            <div className="productdisplay-right-description">
                <p>{product.description} {product.name}</p>
            </div>

            <div className="productdisplay-right-size">
                <h1>Select Size</h1>
                <div className="productdisplay-right-sizes">
                    <div>Small</div>
                    <div>Small Long</div>
                    <div>Large</div>
                    <div>Large Long</div>
                </div>
            </div>

            <button onClick={() => {addToCart(product.id)}}>ADD TO CART</button>
            <p className="productdisplay-right-category"><span>Category: </span></p>
            <p className="productdisplay-right-category"><span>Tags: </span></p>
        </div>
    </div>
  )
}

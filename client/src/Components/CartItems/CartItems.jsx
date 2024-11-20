import React, { useContext, useEffect, useRef, useState } from 'react';
import './CartItems.css';
import { ShopContext } from '../../Context/ShopContext';
import { PayPalPayment } from '../PayPalPayment/PayPalPayment';
import remove_icon from '../Assets/img/icon/cart_cross_icon.png';
import apiUrl from '@config';
import { CartContext } from '../../Context/CartContext';


export const CartItems = () => {
    const { cart, handleAddToCart, handleUpdateCartItem, handleClearCart } = useContext(CartContext);

    return (
        <div className='cartitems'>
            <h2>Shopping Cart</h2>
            {cart.length > 0 ? <button className="cartitems-clearcart" onClick={handleClearCart}>Clear Cart</button> : <></>}
            <div className="cartitems-format-main">
                <p>Products</p>
                <p>Title</p>
                <p>Price</p>
                <p>Quantity</p>
                <p>Total</p>
                <p>Remove</p>
            </div>
            <hr />
            {cart.map((item) => {
                if(cart) {
                    return (
                        <div key={item.productId}>
                            <div className="cartitems-format cartitems-format-main">
                                <img src={item.image} alt="" className="cartitems-product-icon" />
                                <p>{item.name}</p>
                                <p>${item.price}</p>
                                <div className="cartitems-quantity">
                                    <button className="cartitems-quantity-adjuster" onClick={() => handleUpdateCartItem(item.productId, item.quantity - 1)}>-</button>
                                    <p className='cartitems-quantity-amt'>{item.quantity}</p>
                                    <button className="cartitems-quantity-adjuster" onClick={() => handleUpdateCartItem(item.productId, item.quantity + 1)}>+</button>
                                </div>
                                <p>${item.price * item.quantity}</p>
                                <img className="caritems-remove-icon" src={remove_icon} alt="X" onClick={()=>{handleUpdateCartItem(item.productId, 0)}}/>
                            </div>
                            <hr />
                        </div>
                    )
                }
            })}
        </div>
    );
};

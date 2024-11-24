import React, { useContext } from 'react';
import './CartItems.css';
import remove_icon from '../Assets/img/icon/cart_cross_icon.png';
import { CartContext } from '../../Context/CartContext';


export const CartItems = () => {
    console.log("(CartItems.jsx) Component Loaded.");

    const { cart, handleUpdateCartItem, handleClearCart } = useContext(CartContext);

    return (
        <div className='cartitems'>
            <h2>Shopping Cart</h2>
            {cart.length > 0 
            
                ?  (
                    <button className="cartitems-clearcart" onClick={handleClearCart}>
                        Clear Cart
                    </button> 
                
                ) : (
                    <p className="cartitems-empty">Your cart is empty.</p>
                )
            }
            
            {cart.map((item) => {
                if(cart) {
                    return (
                        <div key={item.productId} className="cartitems-item">
                            <div className="cartitems-main">
                                <img src={item.image} alt="" className="cartitems-product-icon " />
                                <div className="cartitems-details">
                                    <p className="">{item.name}</p>
                                    <p className="">Price: ${item.price}</p>
                                    <div className="cartitems-quantity">
                                        <div className="cartitems-quantity-container">
                                            <button className="cartitems-adjuster" onClick={() => handleUpdateCartItem(item.productId, item.quantity - 1)}>{item.quantity === 1 ? 'x':'\<'}</button>
                                            <p className='cartitems-quantity-display'>{item.quantity}</p>
                                            <button className="cartitems-adjuster" onClick={() => handleUpdateCartItem(item.productId, item.quantity + 1)}>{'\>'}</button>
                                        </div>
                                        
                                <img className="caritems-remove-icon " src={remove_icon} alt="X" onClick={()=>{handleUpdateCartItem(item.productId, 0)}}/>
                                    </div>
                                    <p className="">${item.price * item.quantity}</p>
                                </div>
                            </div>
                            <hr />
                        </div>
                    )
                }
            })}
        </div>
    );
};

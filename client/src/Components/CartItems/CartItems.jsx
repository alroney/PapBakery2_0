import React, { useContext, useRef, useState } from 'react';
import './CartItems.css';
import { ShopContext } from '../../Context/ShopContext';
import { PayPalPayment } from '../PayPalPayment/PayPalPayment';
import remove_icon from '../Assets/img/icon/cart_cross_icon.png';
import apiUrl from '@config';

export const CartItems = () => {
    const {getTotalCartItems, getTotalCartAmount, all_product, cartItems, removeFromCart, loading} = useContext(ShopContext);
    const authToken = localStorage.getItem('auth-token');
    const [guestData, setGuestData] = useState({
        guestName: "",
        guestPhone: "",
        guestEmail: "",
      });
    const payRef = useRef();

    if(loading) {
        return <div>Loading...</div>;
    }

    const subtotal = getTotalCartAmount();
    const shippingFee = 0.00;
    const total = subtotal + shippingFee;
    
    const changeHandler = (e) => {
        setGuestData({...guestData, [e.target.name]:e.target.value});
    }

    const confirmation = async () => {
        const headers = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        };

        const cartData = JSON.parse(localStorage.getItem('cartData')) || {};
        
    }


    
    const paynow_toggle = (e) => {
        payRef.current.classList.toggle('paynow-visible');
        e.target.classList.toggle('open');

        localStorage.setItem("guestEmail", guestData.guestEmail);
    }

  return (
    <div className="cartitems">
        <div className="cartitems-format-main">
            <p>Products</p>
            <p>Title</p>
            <p>Price</p>
            <p>Quantity</p>
            <p>Total</p>
            <p>Remove</p>
        </div>
        <hr />
        {all_product.map((e) => {
            if(cartItems[e.id] > 0) {
                return <div>
                            <div className="cartitems-format cartitems-format-main">
                                <img src={e.image} alt="" className="cartitems-product-icon" />
                                <p>{e.name}</p>
                                <p>${e.price}</p>
                                <button className='cartitems-quantity'>{cartItems[e.id]}</button>
                                <p>${e.price*cartItems[e.id]}</p>
                                <img className="caritems-remove-icon" src={remove_icon} alt="X" onClick={()=>{removeFromCart(e.id)}}/>
                            </div>
                            <hr />
                        </div>
            }
            return null;
        })}
        <div className="cartitems-down">
            <div className="cartitems-total">
                <h1>Cart Totals</h1>
                <div>
                    <div className="cartitems-total-item">
                        <p>Subtotal</p>
                        <p>${subtotal}</p>
                    </div>
                    <hr />
                    <div className="cartitems-total-item">
                        <p>Shipping Fee</p>
                        {shippingFee <= 0 ? <p>Free</p> : <p>{shippingFee}</p>}
                    </div>
                    <hr />
                    <div className="cartitems-total-item">
                        <h3>Total</h3>
                        <h3>${total}</h3>
                    </div>
                </div>

                <div className="cartitems-promocode">
                    <p>If you have a promo code, Enter it here</p>
                    <div className="cartitems-promobox">
                        <input type="text" placeholder="PROMO-CODE"/>
                        <button>SUBMIT</button>
                    </div>
                </div>

                {authToken
                    ? <></> //If true.
                    :   <div className="guest-info-fields">
                            <input type='email' name='guestEmail' value={guestData.guestEmail} onChange={changeHandler}  placeholder='Email' required />
                        </div>
                }
                <button className="paynow-button" onClick={(e) => getTotalCartItems() > 0 ? paynow_toggle(e) : alert("Cart is Empty")}>Pay Now</button>
                <div ref={payRef} className="paynow">
                    <PayPalPayment guestData={ !authToken ? guestData : null }/>
                </div>
            </div>

            
        </div>
    </div>
  )
}

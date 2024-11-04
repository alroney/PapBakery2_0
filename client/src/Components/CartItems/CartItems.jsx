import React, { useContext, useState } from 'react';
import './CartItems.css';
import { ShopContext } from '../../Context/ShopContext';
import { Link } from 'react-router-dom';
import remove_icon from '../Assets/img/icon/cart_cross_icon.png';
import apiUrl from '@config';

export const CartItems = () => {
    const {getTotalCartItems, getTotalCartAmount, all_product, cartItems, removeFromCart, loading} = useContext(ShopContext);
    console.log("# of Items in cart: ", getTotalCartItems());
    const authToken = localStorage.getItem('auth-token');
    const [guestData, setGuestData] = useState({
        name: "",
        phone: "",
        email: "",
      })

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
        console.log("CartData in confirmation: ", cartData);

        await fetch(`${apiUrl}/send-confirmation-email`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                isGuest: !authToken, //Set `isGuest` to true if no auth-token is present.
                cartData: cartData,
                email: guestData.email,
            })
        });
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

                {/* <div className="cartitems-promocode">
                    <p>If you have a promo code, Enter it here</p>
                    <div className="cartitems-promobox">
                        <input type="text" placeholder="PROMO-CODE"/>
                        <button>SUBMIT</button>
                    </div>
                </div> */}

                {authToken
                    ? <></> //If true.
                    :   <div>
                            <input type='text' name='name' value={guestData.name} onChange={changeHandler} placeholder='First Name' required></input>
                            <input type='text' name='phone' value={guestData.phone} onChange={changeHandler} placeholder='###-###-####'></input>
                            <input type='text' name='email' value={guestData.email} onChange={changeHandler} placeholder='Email' required></input>
                        </div>
                }
                <button onClick={() => {getTotalCartItems() > 0 ? confirmation() : alert("Your cart is empty.")}}>PROCEED TO CHECKOUT</button>
                
            </div>

            
        </div>
    </div>
  )
}

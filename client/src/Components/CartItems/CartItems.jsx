import React, { useContext } from 'react'
import './CartItems.css'
import { ShopContext } from '../../Context/ShopContext'
import remove_icon from '../Assets/img/icon/cart_cross_icon.png'

export const CartItems = () => {
    const {getTotalCartAmount, all_product, cartItems, removeFromCart} = useContext(ShopContext);

    const confirmation = async () => {
        await fetch("http://localhost:4000/send-confirmation-email", {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'auth-token': `${localStorage.getItem('auth-token')}`,
                'Content-Type': 'application/json',
            }
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
                        <p>${getTotalCartAmount()}</p>
                    </div>
                    <hr />
                    <div className="cartitems-total-item">
                        <p>Shipping Fee</p>
                        <p>Free</p>
                    </div>
                    <hr />
                    <div className="cartitems-total-item">
                        <h3>Total</h3>
                        <h3>${getTotalCartAmount()}</h3>
                    </div>
                </div>
                <button onClick={() => {getTotalCartAmount > 0 ? confirmation() : alert("Your cart is empty.")}}>PROCEED TO CHECKOUT</button>
            </div>
            <div className="cartitems-promocode">
                <p>If you have a promo code, Enter it here</p>
                <div className="cartitems-promobox">
                    <input type="text" placeholder="PROMO-CODE"/>
                    <button>SUBMIT</button>
                </div>
            </div>
        </div>
    </div>
  )
}

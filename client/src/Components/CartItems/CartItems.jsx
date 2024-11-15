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
        <div>
            <h2>Shopping Cart</h2>
            <ul>
                {cart.map((item) => (
                    <li key={item.productId}>
                        {item.name} - ${item.price} x {item.quantity}
                        <button onClick={() => handleUpdateCartItem(item.productId, item.quantity + 1)}>+</button>
                        <button onClick={() => handleUpdateCartItem(item.productId, item.quantity - 1)}>-</button>
                    </li>
                ))}
            </ul>
            <button onClick={handleClearCart}>Clear Cart</button>
        </div>
    );
};






// export const CartItems = () => {
//     const {all_product, loading} = useContext(ShopContext);
//     const {cartItems, getTotalCartItems, calculateSubtotal, removeFromCart} = useContext(CartContext);
//     const authToken = localStorage.getItem('auth-token');
//     const [guestData, setGuestData] = useState({
//         guestEmail: "",
//       });
//     const [emailError, setEmailError] = useState('');
//     const [isPaynowVisible, setIsPaynowVisible] = useState(false);
//     const [subtotal, setSubtotal] = useState(0);
//     const [promoCode, setPromoCode] = useState('');
//     const payRef = useRef();
    

//     useEffect(() => {
//         if(!loading) {
//             setSubtotal(calculateSubtotal(all_product));
//         }
//     }, [cartItems, all_product, loading]);


//     const changeHandler = (e) => {
//         setGuestData({...guestData, [e.target.name]:e.target.value});
//         setEmailError(''); //Clear email error on input.
//     }

//     const isValidEmail = (email) => {
//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         return emailRegex.test(email);
//     }

//     const total = {
//         subtotal: subtotal,
//         shipping: 0,
//         discounts: [],
//     }

//     const applyPromoCode = () => {
//         //Logic to verify and apply promo code, adjusting the total as necessary.
//     }

    
    
//     const paynow_toggle = (e) => {
//         //Update subtotal
//         const currentSubtotal = calculateSubtotal(all_product);
//         setSubtotal(currentSubtotal);

//         if(!authToken && !isValidEmail(guestData.guestEmail)) {
//             setEmailError('Please enter a valid email address.');
//             setIsPaynowVisible(false); //Hide paypal component if email is invalid.
//         }
//         else {
//             setEmailError('');
//             setIsPaynowVisible(!isPaynowVisible);
//             e.target.classList.toggle('open');
//         }
//     }

//   return (
//     <div className="cartitems">
//         <div className="cartitems-format-main">
//             <p>Products</p>
//             <p>Title</p>
//             <p>Price</p>
//             <p>Quantity</p>
//             <p>Total</p>
//             <p>Remove</p>
//         </div>
//         <hr />
//         {all_product.map((e) => {
//             if(cartItems[e.id] > 0) {
//                 return (
//                         <div key={e.id}>
//                             <div className="cartitems-format cartitems-format-main">
//                                 <img src={e.image} alt="" className="cartitems-product-icon" />
//                                 <p>{e.name}</p>
//                                 <p>${e.price}</p>
//                                 <button className='cartitems-quantity'>{cartItems[e.id]}</button>
//                                 <p>${e.price*cartItems[e.id]}</p>
//                                 <img className="caritems-remove-icon" src={remove_icon} alt="X" onClick={()=>{removeFromCart(e.id)}}/>
//                             </div>
//                             <hr />
//                         </div>
//                 )
//             }
//             return null;
//         })}
//         <div className="cartitems-down">
//             <div className="cartitems-total">
//                 <h1>Cart Totals</h1>
//                 <div>
//                     <div className="cartitems-total-item">
//                         <p>Subtotal</p>
//                         <p>${total.subtotal}</p>
//                     </div>
//                     <hr />
//                     <div className="cartitems-total-item">
//                         <p>Shipping Fee</p>
//                         {total.shipping <= 0 ? <p>Free</p> : <p>{total.shipping}</p>}
//                     </div>
//                     <hr />
//                     <div className="cartitems-total-item">
//                         <h3>Total</h3>
//                         <h3>${Object.values(total).reduce((t, value) => t + value, 0)}</h3>
//                     </div>
//                 </div>

//                 {/* <div className="cartitems-promocode">
//                     <p>If you have a promo code, Enter it here</p>
//                     <div className="cartitems-promobox">
//                         <input type="text" placeholder="PROMO-CODE" value={promoCode} onChange={(e) => setPromoCode(e.target.value)}/>
//                         <button onClick={applyPromoCode}>SUBMIT</button>
//                     </div>
//                 </div> */}

//                 {authToken
//                     ? <></> //If true.
//                     :   <div className="guestCheckout">
//                             <h3>Guest Checkout</h3>
//                             <div className="guest-info-fields">
//                                 <input type='email' name='guestEmail' value={guestData.guestEmail} onChange={changeHandler}  placeholder='Email' required />
//                                 {emailError && <p className="error-message">{emailError}</p>}
//                             </div>
//                         </div>
                        
//                 }
//                 <button className="paynow-button" onClick={(e) => getTotalCartItems() > 0 ? paynow_toggle(e) : alert("Cart is Empty")}>Pay Now</button>
//                 <div ref={payRef} className={`paynow ${isPaynowVisible ? 'paynow-visible' : ''}`}>
//                     {isPaynowVisible && (
//                         <PayPalPayment 
//                             key={authToken ? "userPayment" : "guestPayment"} //Unique key for each condition.
//                             guestData={authToken ? {} : guestData} //Pass empty object for users, guestData for guests.
//                         />
//                     )}
//                 </div>
//             </div>

            
//         </div>
//     </div>
//   )
// }

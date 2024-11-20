import React, { useContext, useEffect, useRef, useState } from 'react';
import './Checkout.css';
import { ShopContext } from '../../Context/ShopContext';
import { PayPalPayment } from '../PayPalPayment/PayPalPayment';
import { CartContext } from '../../Context/CartContext';
import apiURL from '@config';
import { fetchFees } from '../../services/cartService';
import { CashPayment } from '../CashPayment/CashPayment';

export const Checkout = () => {
    const {all_product, loading} = useContext(ShopContext);
    const {cart, getTotalCartItems, calculateSubtotal} = useContext(CartContext);
    const authToken = localStorage.getItem('auth-token');
    const [guestData, setGuestData] = useState({
        guestEmail: "",
    });
    const [emailError, setEmailError] = useState('');
    const [isPaynowVisible, setIsPaynowVisible] = useState(false);
    const [subtotal, setSubtotal] = useState(0);
    const [state, setState] = useState('MD');
    const [shippingCost, setShippingCost] = useState(0.0);
    const [taxRate, setTaxRate] = useState(0.0);
    const [couponCode, setCouponCode] = useState('');
    const [fees, setFees] = useState({ taxRate: 0, tax: 0, shipping: 0, discount: 0, total: 0})
    const [paymentType, setPaymentType] = useState('')
    const payRef = useRef();
    

    const calculateFees = async () => {
        try {
            const feesData = await fetchFees({ subtotal, state, shippingCost, couponCode });
            if(feesData) {
                setFees(feesData);
            }
        } 
        catch (error) {
            console.error("Error fetching fees: ", error);
        }
        
    }

    

    useEffect(() => {
        if(!loading) {
            setSubtotal(calculateSubtotal(all_product));
        }


    }, [cart, all_product, loading]);

    useEffect(() => {
        if(!loading) {
            calculateFees();
        }
    }, [subtotal])

    

    const changeHandler = (e) => {
        setGuestData({...guestData, [e.target.name]:e.target.value});
        setEmailError(''); //Clear email error on input.
    }

    const handlePaymentChange = (e) => {
        setPaymentType(e.target.value);
    }

    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }


    const applyCouponCode = () => {
        //Logic to verify and apply promo code, adjusting the total as necessary.
    }

    
    
    const paynow_toggle = (e) => {
        if(!authToken && !isValidEmail(guestData.guestEmail)) {
            setEmailError('Please enter a valid email address.');
            setIsPaynowVisible(false); //Hide paypal component if email is invalid.
        }
        else {
            setEmailError('');
            setIsPaynowVisible(!isPaynowVisible);
            e.target.classList.toggle('open');
        }
    }

  return (
    <div className="checkout">
        {getTotalCartItems() > 0 
            ? (
                <>
                <div className="checkout-down">
                    <div className="checkout-total">
                        <h1>Cart Totals</h1>
                        <div>
                            <div className="checkout-total-item">
                                <p>Subtotal</p>
                                <p>${subtotal.toFixed(2)}</p>
                            </div>
                            <hr />
                            <div className="checkout-total-item">
                                <div className="checkout-total-fees">
                                    <p>Tax <small>({(state)} @ {(fees.taxRate.toFixed(2)) * 100}%)</small></p>
                                    <p>{fees.tax.toFixed(2)}</p>
                                </div>
                                <div className="checkout-total-fees">
                                    <p>Shipping Fee</p>
                                    {fees.shipping <= 0 ? <p>Free</p> : <p>{fees.shipping}</p>}
                                </div>
                                {fees.discount > 0 
                                    ? <div className="checkout-total-fees">
                                        <p>Discount</p>
                                        <p>- ${fees.discount.toFixed(2)}</p>
                                    </div> 
                                    : <></>
                                }
                            </div>
                            <hr />
                            <div className="checkout-total-item">
                                <h3>Total</h3>
                                <h3>${fees.total.toFixed(2)}</h3>
                            </div>
                        </div>

                        {/* <div className="checkout-promocode">
                            <p>If you have a promo code, Enter it here</p>
                            <div className="checkout-promobox">
                                <input type="text" placeholder="PROMO-CODE" value={promoCode} onChange={(e) => setPromoCode(e.target.value)}/>
                                <button onClick={applyPromoCode}>SUBMIT</button>
                            </div>
                        </div> */}

                        {authToken
                            ? <></> //If true.
                            :   <div className="guestCheckout">
                                    <h3>Guest Checkout</h3>
                                    <div className="guest-info-fields">
                                        <input type='email' name='guestEmail' value={guestData.guestEmail} onChange={changeHandler}  placeholder='Email' required aria-label='Guest Email' aria-describedby='guest-email-desc' />
                                        <p id='guest-email-desc'>Enter a valid email for guest checkout.</p>
                                        {emailError && <p className="error-message">{emailError}</p>}
                                    </div>
                                </div>
                                
                        }
                        <div className="paymentSelection">
                            <input type='radio' id='paycash' name='paytype' value='cash' checked={paymentType === 'cash'} onChange={handlePaymentChange} aria-label='' aria-describedby='' />
                            <label htmlFor='paycash'>Cash</label>
                            <input type='radio' id='payonline' name='paytype' value='online' checked={paymentType === 'online'} onChange={handlePaymentChange} aria-label='' aria-describedby='' />
                            <label htmlFor='payonline'>Online</label>
                        </div>

                        <div className="paymentType-container">
                            {paymentType === 'cash' && (
                                <>
                                <button className="paynow-button" onClick={(e) => getTotalCartItems() > 0 ? paynow_toggle(e) : alert("Cart is Empty")}>
                                    Pay Now
                                </button>
                                <div ref={payRef} className={`paynow ${isPaynowVisible ? 'paynow-visible' : ''}`}>
                                    {isPaynowVisible && (
                                        <CashPayment 
                                            key={authToken ? "userPayment" : "guestPayment"}
                                            guestData={authToken ? {} : guestData}
                                        />
                                    )}
                                    
                                </div>
                                </>
                            )}
                            {paymentType === 'online' && (
                                <>
                                    <button className="paynow-button" onClick={(e) => getTotalCartItems() > 0 ? paynow_toggle(e) : alert("Cart is Empty")}>
                                        Pay Now
                                    </button>
                                    <div ref={payRef} className={`paynow ${isPaynowVisible ? 'paynow-visible' : ''}`}>
                                        {isPaynowVisible && (
                                            <PayPalPayment 
                                                key={authToken ? "userPayment" : "guestPayment"}
                                                guestData={authToken ? {} : guestData}
                                            />
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                </>
            ) : (
                <div className="empty-cart">
                    <h2>Your cart is empty!</h2>
                    <p>Please add some items to your cart before proceeding to checkout.</p>
                </div>
            )}
        
    </div>
  )
}

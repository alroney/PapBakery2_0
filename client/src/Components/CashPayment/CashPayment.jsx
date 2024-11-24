import React, { useContext, useEffect, useState } from 'react';
import apiUrl from '@config';
import { CartContext } from '../../Context/CartContext';
import { Modal } from '../Modal/Modal';

export const CashPayment = ({guestData}) => {
    console.log("(CashPayment.jsx) Component Loaded.");

    const {cart, handleClearCart} = useContext(CartContext);
    const [orderCompleted, setOrderCompleted] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const confirmCashOrder = async () => {
        setLoading(true);
        try {
            const userAuthToken = localStorage.getItem("auth-token");
            const guestMode = localStorage.getItem("isGuest");
            const guestEmail = guestMode ? guestData.guestEmail: null;

            if(cart.length <= 0) {
                alert("Cart is empty.");
                setOrderCompleted(false);
            }
            else {
                const requestBody = {
                    "paymentType": 'cash',
                    "isGuest": guestMode,
                    "guestEmail": guestEmail,
                    "cart": cart,
                };
        
                const response = await fetch(`${apiUrl}/order/confirmCash`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(userAuthToken && { "auth-token": userAuthToken }),
                    },
                    body: JSON.stringify(requestBody),
                });
                const data = await response.json();

                if (!data.success) {
                    setShowModal(false);
                    setOrderCompleted(false);
                    alert('Order failed to process.');
                }
                else {
                    setShowModal(true);
                    setOrderCompleted(true);
                }
            }

        } 
        catch (error) {
            console.error("Error confirming cash order:", error);
            alert("An error occurred while confirming your order.");
        }
        finally {
            setLoading(false);
        }
    };

    //Clear the cart once order is completed and the user closes out of the modal.
    useEffect(() => {
        if(!showModal && orderCompleted) {
            handleClearCart();
        }
    }, [showModal, orderCompleted])


    const closeModal = () => {
        setShowModal(false);
    }
  return (
    <div>
        <h3>Cash Payment Details</h3>
        <p>
            You have selected to pay in cash. Please ensure the following:
        </p>
        <ul>
            <li>Prepare the exact amount as change might not be available.</li>
            <li>Verify your delivery address and contact details are correct.</li>
        </ul>
        <button className="confirm-cash-order" onClick={() => confirmCashOrder()} disabled={loading}>
            {loading ? 'Processing...' : 'Confirm Cash Payment'}
        </button>

        {/*Modal for order completion */}
        <Modal 
            isOpen={showModal}
            onClose={closeModal}
            title="Order Confirmed"
            message={`Your order has been sent successfully! A confirmation email has been sent to
                 ${guestData?.guestEmail || "your registered email"}.`}
        />
    </div>
  )
}

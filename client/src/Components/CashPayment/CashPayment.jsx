import React, { useContext, useState } from 'react';
import apiUrl from '@config';
import { CartContext } from '../../Context/CartContext';

export const CashPayment = ({guestData}) => {
    const {cart, handleClearCart} = useContext(CartContext);
    const [orderCompleted, setOrderCompleted] = useState(false);

    const confirmCashOrder = async () => {
        try {
            const userAuthToken = localStorage.getItem("auth-token");
            const guestMode = localStorage.getItem("isGuest");
            const guestEmail = guestMode ? guestData.guestEmail: null;
            console.log("(confirmCashOrder) cart: ", cart);

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
        
                if (!response.ok) throw new Error("Failed to confirm cash order.");

                handleClearCart();
                setOrderCompleted(true);
            }

        } catch (error) {
            console.error("Error confirming cash order:", error);
            alert("An error occurred while confirming your order.");
        }
    };

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
        <button className="confirm-cash-order" onClick={() => confirmCashOrder()}>
            Confirm Order
        </button>
    </div>
  )
}

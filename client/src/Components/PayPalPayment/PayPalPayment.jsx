import React, { useContext, useEffect, useRef, useState } from 'react';
import { CartContext } from '../../Context/CartContext';
import DOMPurify from 'dompurify';
import apiUrl from '@config';

function Message({content}) {
    return <p>{content}</p>
}

export const PayPalPayment = ({ guestData }) => {

    const paypal_sdk_url = "https://www.paypal.com/sdk/js";
    const client_id = process.env.REACT_APP_PAYPAL_CLIENT_ID;
    const currency = "USD";
    const intent = "capture";
    const orderAPIUrl = `${apiUrl}/order`;
    const {cart, handleClearCart} = useContext(CartContext);
    const [loading, setLoading] = useState(true);
    const [alertMessage, setAlertMessage] = useState("");
    const contentRef = useRef(null);
    const paymentOptionsRef = useRef(null);


    useEffect(() => {
        const userAuthToken = localStorage.getItem("auth-token");
        const guestMode = localStorage.getItem("isGuest");
        let guestEmail = "";
        console.log("Guest Mode: ", guestMode)

        if(guestMode) {
             guestEmail = guestData.guestEmail;
        }

        const loadPayPalScript = async () => {
            try {
                const script = document.createElement('script');
                script.src = `${paypal_sdk_url}?client-id=${client_id}&enable-funding=venmo&currency=${currency}&intent=${intent}`;
                script.onload = () => {
                    setLoading(false);
                    waitForRefAndInit();
                };
                script.onerror = () => setAlertMessage("Failed to load PayPal script.");
                document.head.appendChild(script);
            } catch (error) {
                setAlertMessage("Error loading PayPal script.");
                console.error(error);
            }
        };

        //Set a timeout to retry loading the buttons if they fail to load on initial page opening.
        const waitForRefAndInit = () => {
            if(paymentOptionsRef.current) {
                initPayPalButtons();
            }
            else {
                setTimeout(waitForRefAndInit, 100); //Retry after 100ms if is still undefined.
            }
        }

        const initPayPalButtons = () => {
            if(!paymentOptionsRef.current) {
                console.error("Error: paymentOptionsRef.current is not defined.");
                return;
            }

            const paypalButtons = window.paypal.Buttons({
                onClick: () => {
                    // Custom logic before transaction

                },
                style: {
                    shape: 'rect',
                    color: 'gold',
                    layout: 'vertical',
                    label: 'paypal'
                },
                createOrder: async (data, actions) => {
                    try {
                        const requestBody = {
                            "intent": intent,
                            "isGuest": guestMode,
                            "guestEmail": guestEmail,
                            "cart": cart
                        }
                        const response = await fetch(`${orderAPIUrl}/create`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "auth-token": userAuthToken,
                            },
                            body: JSON.stringify(requestBody)
                        });
                        const data = await response.json();
                        console.log("Response from /api/order/create: ", data);
                        return data.id;
                    }
                    catch(error) {
                        console.error("Error in createOrder: ", error);
                    }
                },
                onApprove: (data) => {
                    const order_id = data.orderID;

                    const requestBody = {
                        "intent": intent,
                        "order_id": order_id,
                        "isGuest": guestMode,
                        "guestEmail": guestEmail,
                        "cart": cart,
                    }

                    return fetch(`${orderAPIUrl}/complete`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(requestBody)
                    })
                    .then(response => {
                        console.log("Response: ", response);
                        if(!response.ok) throw new Error('Order completion failed.');
                        return response.json();
                    })
                    .then(orderDetails => {
                        const sanitizedMessage = DOMPurify.sanitize(
                            `Thank you ${orderDetails.payer.name.given_name} ${orderDetails.payer.name.surname} for your payment of ${orderDetails.purchase_units[0].payments[intent+'s'][0].amount.value} ${orderDetails.purchase_units[0].payments[intent+'s'][0].amount.currency_code}!`
                        );
                        setAlertMessage(sanitizedMessage);
                        handleClearCart();
                        paypalButtons.close();
                    })
                    .catch(error => {
                        console.error("Payment completion error:", error);
                        setAlertMessage("An error occurred during payment completion.");
                    });
                },
                onCancel: () => {
                    setAlertMessage("Order cancelled!");
                },
                onError: (err) => {
                    console.error("PayPal error:", err);
                    setAlertMessage("An error occurred with PayPal.");
                }
            });

            paypalButtons.render(paymentOptionsRef.current);
        };

        loadPayPalScript();

        // Clean up any PayPal buttons or event listeners when component unmounts
        return () => {
            if(paymentOptionsRef.current) {
                paymentOptionsRef.current.innerHTML = "";
            }
        };
    }, [cart]);

    return (
        <div className="paypalpayment">
            <div className="ppp-content">
                <div className="ppp-content-alertmessage">
                    {alertMessage && (
                        <div id="alerts">
                            <div
                                className="ms-alert ms-action"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(alertMessage) }}
                            />
                            <span className="ms-close" onClick={() => setAlertMessage("")}>&times;</span>
                        </div>
                    )}
                </div>
                
                <div className="ppp-content-payment">
                    {loading ? (
                        <div className="spinner-container ms-div-center">
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <div ref={contentRef} id="content">
                            <div className="ms-card ms-fill">
                                <div className="ms-card-content">
                                    
                                </div>
                            </div>
                            <div ref={paymentOptionsRef} id="payment_options"></div>
                        </div>
                    )}
                </div>
                
            </div>
        </div>
    );
}

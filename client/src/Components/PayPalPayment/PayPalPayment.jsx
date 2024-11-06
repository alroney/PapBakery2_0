import React, { useEffect, useRef, useState } from 'react';
import apiUrl from '@config';
import DOMPurify from 'dompurify';

function Message({content}) {
    return <p>{content}</p>
}

export const PayPalPayment = () => {

    const paypal_sdk_url = "https://www.paypal.com/sdk/js";
    const client_id = process.env.REACT_APP_PAYPAL_CLIENT_ID;
    const userAuthToken = localStorage.getItem("auth-token");
    const guestMode = localStorage.getItem("isGuest");
    const guestEmail = localStorage.getItem("guestEmail");
    const currency = "USD";
    const intent = "capture";

    const [loading, setLoading] = useState(true);
    const [alertMessage, setAlertMessage] = useState("");
    const contentRef = useRef(null);
    const paymentOptionsRef = useRef(null);


    useEffect(() => {
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
                createOrder: async () => {
                    console.log("Create order has been called with Auth-Token of: ", userAuthToken);
                    console.log("Guest email: ", guestEmail);
                    console.log("Is Guest: ", guestMode);
                    try {
                        const requestBody = {
                            "intent": intent,
                        }

                        const response = await fetch(`${apiUrl}/create_order`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "auth-token": userAuthToken,
                            },
                            body: JSON.stringify({ requestBody })
                        });
                        const data = await response.json();
                        console.log("Response from /create_order: ", data);
                        return data.id
                    }
                    catch(error) {
                        console.error("Error in createOrder: ", error);
                    }
                    // return fetch(`${apiUrl}/create_order`, {
                    //     method: "POST",
                    //     headers: { "Content-Type": "application/json" },
                    //     body: JSON.stringify({ "intent": intent })
                    // })
                    // .then(response => {
                    //     if (!response.ok) throw new Error('Failed to create order.');
                    //     return "Response.json = " + response.json();
                    // })
                    // .then(order => order.id);
                },
                onApprove: (data) => {
                    const order_id = data.orderID;

                    const requestBody = {
                        "intent": intent,
                        "order_id": order_id,
                    }

                    return fetch(`${apiUrl}/complete_order`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(requestBody)
                    })
                    .then(response => {
                        if (!response.ok) throw new Error('Order completion failed.');
                        return response.json();
                    })
                    .then(orderDetails => {
                        const sanitizedMessage = DOMPurify.sanitize(
                            `Thank you ${orderDetails.payer.name.given_name} ${orderDetails.payer.name.surname} for your payment of ${orderDetails.purchase_units[0].payments[intent][0].amount.value} ${orderDetails.purchase_units[0].payments[intent][0].amount.currency_code}!`
                        );
                        setAlertMessage(sanitizedMessage);
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
            if (paymentOptionsRef.current) {
                paymentOptionsRef.current.innerHTML = "";
            }
        };
    }, []);

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

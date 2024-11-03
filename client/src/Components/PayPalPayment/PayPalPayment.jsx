import React, { useEffect, useRef, useState } from 'react';
import apiUrl from '@config';
import DOMPurify from 'dompurify';

function Message({content}) {
    return <p>{content}</p>
}

export const PayPalPayment = () => {

    const paypal_sdk_url = "https://www.paypal.com/sdk/js";
    const client_id = process.env.REACT_APP_PAYPAL_CLIENT_ID;
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
                    initPayPalButtons();
                };
                script.onerror = () => setAlertMessage("Failed to load PayPal script.");
                document.head.appendChild(script);
            } catch (error) {
                setAlertMessage("Error loading PayPal script.");
                console.error(error);
            }
        };

        const initPayPalButtons = () => {
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
                createOrder: (data, actions) => {
                    return fetch("http://localhost:3000/create_order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ "intent": intent })
                    })
                    .then(response => {
                        if (!response.ok) throw new Error('Failed to create order.');
                        return response.json();
                    })
                    .then(order => order.id);
                },
                onApprove: (data) => {
                    const order_id = data.orderID;
                    return fetch("http://localhost:3000/complete_order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ "intent": intent, "order_id": order_id })
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
        <div className="container">
            <div className="row">
                <div className="col-sm"></div>
                <div className="col-sm">
                    <h2 className="ms-text-center">AI-generated NFT Bored Ape</h2>
                    <div className="ms-text-center pb-2">
                        <div className="ms-label ms-large ms-action2 ms-light">$100.00 USD</div>
                    </div>
                    {alertMessage && (
                        <div id="alerts" className="ms-text-center">
                            <div
                                className="ms-alert ms-action"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(alertMessage) }}
                            />
                            <span className="ms-close" onClick={() => setAlertMessage("")}>&times;</span>
                        </div>
                    )}
                    {loading ? (
                        <div className="spinner-container ms-div-center">
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <div ref={contentRef} id="content">
                            <div className="ms-card ms-fill">
                                <div className="ms-card-content">
                                    <img
                                        src="https://cdn.discordapp.com/attachments/1060825015681028127/1076385063903694908/rauljr7_3d_e83fed6a-69aa-4a6a-b0ec-928edd57aecf.png"
                                        alt="AI-generated NFT Bored Ape"
                                        style={{ width: "400px" }}
                                    />
                                </div>
                            </div>
                            <div ref={paymentOptionsRef} id="payment_options"></div>
                        </div>
                    )}
                </div>
                <div className="col-sm"></div>
            </div>
        </div>
    );

    // const initialOptions = {
    //     "client-id": process.env.REACT_APP_PAYPAL_CLIENT_ID,
    //     "enable-funding": "venmo",
    //     "disable-funding": "",
    //     "buyer-country": "US",
    //     currency: "USD",
    //     "data-page-type": "product-details",
    //     components: "buttons",
    //     "data-sdk-integration-source": "developer-studio",
    // };

    // const [message, setMessage] = useState("");

    // return (
    //     <div className="paypalpayment">
    //         <PayPalScriptProvider options={initialOptions}>
    //             <PayPalButtons
    //                 style={{
    //                     shape: "rect",
    //                     layout: "vertical",
    //                     color: "gold",
    //                     label: "paypal",
    //                 }} 
    //                 createOrder={async () => {
    //                     try {
    //                         const response = await fetch(`${apiUrl}/api/orders`, {
    //                             method: "POST",
    //                             headers: {
    //                                 "Content-Type": "application/json",
    //                             },
    //                             // use the "body" param to optionally pass additional order information
    //                             // like product ids and quantities
    //                             body: JSON.stringify({
    //                                 cart: [
    //                                     {
    //                                         id: "YOUR_PRODUCT_ID",
    //                                         quantity: "YOUR_PRODUCT_QUANTITY",
    //                                     },
    //                                 ],
    //                             }),
    //                         });

    //                         const orderData = await response.json();

    //                         if (orderData.id) {
    //                             return orderData.id;
    //                         } else {
    //                             const errorDetail = orderData?.details?.[0];
    //                             const errorMessage = errorDetail
    //                                 ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
    //                                 : JSON.stringify(orderData);

    //                             throw new Error(errorMessage);
    //                         }
    //                     } catch (error) {
    //                         console.error(error);
    //                         setMessage(
    //                             `Could not initiate PayPal Checkout...${error}`
    //                         );
    //                     }
    //                 }} 
    //                 onApprove={async (data, actions) => {
    //                     try {
    //                         const response = await fetch(
    //                             `${apiUrl}/api/orders/${data.orderID}/capture`,
    //                             {
    //                                 method: "POST",
    //                                 headers: {
    //                                     "Content-Type": "application/json",
    //                                 },
    //                             }
    //                         );

    //                         const orderData = await response.json();
    //                         // Three cases to handle:
    //                         //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
    //                         //   (2) Other non-recoverable errors -> Show a failure message
    //                         //   (3) Successful transaction -> Show confirmation or thank you message

    //                         const errorDetail = orderData?.details?.[0];

    //                         if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
    //                             // (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
    //                             // recoverable state, per https://developer.paypal.com/docs/checkout/standard/customize/handle-funding-failures/
    //                             return actions.restart();
    //                         } else if (errorDetail) {
    //                             // (2) Other non-recoverable errors -> Show a failure message
    //                             throw new Error(
    //                                 `${errorDetail.description} (${orderData.debug_id})`
    //                             );
    //                         } else {
    //                             // (3) Successful transaction -> Show confirmation or thank you message
    //                             // Or go to another URL:  actions.redirect('thank_you.html');
    //                             const transaction =
    //                                 orderData.purchase_units[0].payments
    //                                     .captures[0];
    //                             setMessage(
    //                                 `Transaction ${transaction.status}: ${transaction.id}. See console for all available details`
    //                             );
    //                             console.log(
    //                                 "Capture result",
    //                                 orderData,
    //                                 JSON.stringify(orderData, null, 2)
    //                             );
    //                         }
    //                     } catch (error) {
    //                         console.error(error);
    //                         setMessage(
    //                             `Sorry, your transaction could not be processed...${error}`
    //                         );
    //                     }
    //                 }} 
    //             />
    //         </PayPalScriptProvider>
    //         <Message content={message} />
    //     </div>
    // );
}

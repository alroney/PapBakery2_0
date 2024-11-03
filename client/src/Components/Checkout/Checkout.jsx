import React, { useEffect, useState } from 'react';
import './Checkout.css';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import apiUrl from '@config';

const Message = ({ content }) => {
  return <p>{content}</p>;
}

export const Checkout = () => {

  const clientID = process.env.REACT_APP_PP_CLIENT_ID;


  const initialOptions = {
    "client-id": clientID,
    "enable-funding": "venmo",
    "disable-funding": "",
    currency: "USD",
    "data-page-type": "product-details",
    components: "buttons",
    "data-sdk-integration-source": "developer-studio",
  }

  const [message, setMessage] = useState("");
  return (
    <div className="checkout">
      <PayPalScriptProvider options={{initialOptions}}>
        <PayPalButtons style={{layout: "horizontal"}}/>
      </PayPalScriptProvider>
    </div>
  );
}
import React, { useState } from 'react'
import './Checkout.css'
import {
  PayPalScriptProvider,
  usePayPalCardFields,
  PayPalCardFieldsProvider,
  PayPalButtons,
  PayPalNameField,
  PayPalNumberField,
  PayPalExpiryField,
  PayPalCVVField,
} from "@paypal/paypal-js"

require('dotenv').config(); //Load environment variables.

export const Checkout = () => {

  cons [isPaying, setIsPaying] = useState(false);
  const initialOptions = {
    "client-id": process.env.PP_API_KEY,
    "enable-funding": "venmo",
    "disable-funding": "",
    currency: "USD",
    "data-page-type": "product-details",
    components: "buttons, card-fields",
    "data-sdk-integration-source": "developer-studio",
  }

  const [billingAddress, setBillingAddress] = useState({
    addressLine1: "",
    addressLine2: "",
    adminArea1: "",
    adminArea2: "",
    countryCode: "",
    postalCode: "",
  });

  function handleBillingAddressChange(field, value) {
    setBillingAddress((prev) => ({
      ...prev,
      [field]: value,
    }));
  }



  async function createOrder() {
    try {
      const response = await fetch("http://localhost:4000/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        //Use the "body" param to optionally pass additional order information like product ids and quantities.
        body: JSON.stringify({
          cart: [
            {
              id: "test",
              quantity: 2,
            },
          ],
        }),
      });

      const orderData = await response.json();

      if(orderData.id) {
        return orderData.id;
      }
      else {
        const errorDetail = orderData?.details?.[0];
        const errorMessage = errorDetail
          ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
          : JSON.stringify(orderData);

        throw new Error(errorMessage);
      }
    }
    catch(error) {
      console.log("An error occured creating order: ", error);
      return `Could not initiate PayPal Checkout...${error}`;
    }
  }



  async function onApprove(data, actions) {
    try {
      const response = await fetch(`http:localhost:4000/orders/${data.orderID}/capture`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const orderData = await response.json();
      /**Three cases to handle:
       * (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart().
       * (2) Other non-recoverable errors -> Show a failure message
       * (3) Successful transaction -> Show confirmation or thank you message.
       */

      const transaction = 
        orderData?.purchase_units?.[0]?.payments?.captures?.[0]
        ||
        orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
      
      const errorDetail = orderData?.details?.[0];

      if(errorDetail || !transaction | transaction.status === "DECLINED") {
        //(2)
        let errorMessage;
        if(transaction) {
          errorMessage = `Transaction ${transaction.status}: ${transaction.id}`;
        }
        else if(errorDetail) {
          errorMessage = `${errorDetail.description} (${orderData.debug_id})`;
        }
        else {
          errorMessage = JSON.stringify(orderData);
        }

        throw new Error(errorMessage);
      }
      else {
        //(3)
        console.log("Capture result", orderData, JSON.stringify(orderData, null, 2));
        return `Transaction ${transaction.status}: ${transaction.id}. See console for all available details.`;
      }

    }
    catch(error) {
      console.log("An error occured in onApprove: ", error);
      return `Sorry, your transaction could not be processed... ${error}`;
    }
  }

  function onError(error) {
    //Do somehting with the error from the SDK.
  }

  return (
    <div className="checkout">
      <PayPalScriptProvider options={initialOptions}>
            <PayPalButtons
                createOrder={createOrder}
                onApprove={onApprove}
                onError={onError}
                style={{
                    shape: "rect",
                    layout: "vertical",
                    color: "gold",
                    label: "paypal",
                }} 
            />
            
            <PayPalCardFieldsProvider
                createOrder={createOrder}
                onApprove={onApprove}
                style={{
                    input: {
                        "font-size": "16px",
                        "font-family": "courier, monospace",
                        "font-weight": "lighter",
                        color: "#ccc",
                    },
                    ".invalid": { color: "purple" },
                }}
            >
                <PayPalNameField
                    style={{
                        input: { color: "blue" },
                        ".invalid": { color: "purple" },
                    }}
                />
                <PayPalNumberField />
                <PayPalExpiryField />
                <PayPalCVVField />
                
                <input
                    type="text"
                    id="card-billing-address-line-2"
                    name="card-billing-address-line-2"
                    placeholder="Address line 1"
                    onChange={(e) =>
                        handleBillingAddressChange(
                            "addressLine1",
                            e.target.value
                        )
                    }
                />
                <input
                    type="text"
                    id="card-billing-address-line-2"
                    name="card-billing-address-line-2"
                    placeholder="Address line 2"
                    onChange={(e) =>
                        handleBillingAddressChange(
                            "addressLine2",
                            e.target.value
                        )
                    }
                />
                <input
                    type="text"
                    id="card-billing-address-admin-area-line-1"
                    name="card-billing-address-admin-area-line-1"
                    placeholder="Admin area line 1"
                    onChange={(e) =>
                        handleBillingAddressChange("adminArea1", e.target.value)
                    }
                />
                <input
                    type="text"
                    id="card-billing-address-admin-area-line-2"
                    name="card-billing-address-admin-area-line-2"
                    placeholder="Admin area line 2"
                    onChange={(e) =>
                        handleBillingAddressChange("adminArea2", e.target.value)
                    }
                />
                <input
                    type="text"
                    id="card-billing-address-country-code"
                    name="card-billing-address-country-code"
                    placeholder="Country code"
                    onChange={(e) =>
                        handleBillingAddressChange(
                            "countryCode",
                            e.target.value
                        )
                    }
                />
                <input
                    type="text"
                    id="card-billing-address-postal-code"
                    name="card-billing-address-postal-code"
                    placeholder="Postal/zip code"
                    onChange={(e) =>
                        handleBillingAddressChange("postalCode", e.target.value)
                    }
                />
                
                {/* Custom client component to handle card fields submission */}
                <SubmitPayment
                    isPaying={isPaying}
                    setIsPaying={setIsPaying}
                    billingAddress={
                        billingAddress
                    } 
                />
            </PayPalCardFieldsProvider>
            
        </PayPalScriptProvider>
    </div>
  )
}

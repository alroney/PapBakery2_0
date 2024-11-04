import React, { useEffect, useState } from 'react';
import './Checkout.css';
import { PayPalPayment } from '../PayPalPayment/PayPalPayment'

export const Checkout = () => {
  return (
    <div className="checkout">
      <PayPalPayment/>
    </div>
  );
}
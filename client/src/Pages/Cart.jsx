import React from 'react'
import { CartItems } from '../Components/CartItems/CartItems'
import { Checkout } from '../Components/Checkout/Checkout'

export const Cart = () => {
  console.log("==(Cart.jsx) Page Loaded.==");

  return (
    <div>
      <CartItems/>
      <Checkout/>
    </div>
  )
}

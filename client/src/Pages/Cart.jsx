import React from 'react'
import { CartItems } from '../Components/CartItems/CartItems'
import { Checkout } from '../Components/Checkout/Checkout'

export const Cart = () => {
  return (
    <div>
      <CartItems/>
      <Checkout/>
    </div>
  )
}

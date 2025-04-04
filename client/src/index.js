import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ProductProvider } from './Context/ProductContext';
import { UserProvider } from './Context/UserContext';
import { CartProvider } from './Context/CartContext';




const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
    <UserProvider>
      <ProductProvider>
          <CartProvider>
            <App/>
          </CartProvider>
      </ProductProvider>
    </UserProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

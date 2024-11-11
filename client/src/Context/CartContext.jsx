import React, { createContext, useEffect, useState } from 'react';
import apiUrl from '@config';

export const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        const storedCart = localStorage.getItem("cartData");
        return storedCart ? JSON.parse(storedCart) : {};
    });

    //Function: Add an item to the cart.
    const addToCart = (itemId) => {
        setCartItems((prev) => {
            const updatedCart = { ...prev, [itemId]: (prev[itemId] || 0) + 1};
            if(!localStorage.getItem("auth-token")) {
                localStorage.setItem("cartData", JSON.stringify(updatedCart));
            }
            return updatedCart;
        });

        if(localStorage.getItem('auth-token')) {
            fetch(`${apiUrl}/cart/add`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'auth-token': localStorage.getItem('auth-token'),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ "itemId": itemId })
            });
        }
    };

    //Function: Remove an item from the cart.
    const removeFromCart =(itemId) => {
        setCartItems((prev) => {
            const updatedCart = { ...prev, [itemId]: (prev[itemId] || 0) - 1};
            if(!localStorage.getItem("auth-token")) {
                localStorage.setItem("cartData", JSON.stringify(updatedCart));
            }
            return updatedCart;
        });

        if(localStorage.getItem('auth-token')) {
            fetch(`${apiUrl}/cart/remove`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'auth-token': localStorage.getItem('auth-token'),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ "itemId": itemId })
            });
        }
    };


    //Function: Calculate the total cart amount.
    const getTotalCartAmount = (allProducts) => {
        return Object.entries(cartItems).reduce((total, [itemId, quantity]) => {
            const itemInfo = allProducts.find((product) => product.id === Number(itemId));
            return itemInfo ? total + itemInfo.price * quantity : total;
        }, 0);
    };

    //Function: Count the number of items inside of the cart.
    const getTotalCartItems = () => {
        let totalItems = 0;
        for(const item in cartItems){
            if(cartItems[item] > 0) {
                totalItems += cartItems[item];
            }
        }
        return totalItems;
    }

    const contextValue = {
        cartItems,
        addToCart,
        removeFromCart,
        getTotalCartAmount,
        getTotalCartItems
    }

    return (
        <CartContext.Provider value={contextValue}>
            {children}
        </CartContext.Provider>
    );
};
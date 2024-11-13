import React, { createContext, useEffect, useState } from 'react';
import apiUrl from '@config';

export const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState({});
    

    useEffect(() => {
        const guestCart = localStorage.getItem("guestCart");
        //If user is logged in, load the user's cart from the backend.
        if(localStorage.getItem('auth-token')) {
            clearGuestCart();
            fetch(`${apiUrl}/cart/get`, {
                method: 'POST',
                headers: {
                    Accept: 'application/form-data',
                    'auth-token': `${localStorage.getItem('auth-token')}`,
                    'Content-Type': 'application/json',
                },
                body: "",
            })
            .then((response) => response.json())
            .then((data) => setCartItems(data));
            
        }
        else if(!localStorage.getItem("auth-token") && guestCart) {
            setCartItems(JSON.parse(guestCart));
        }
    }, []) //Load only once per mount.


    const addToCart = (itemId) => {
        setCartItems((prev) => {
            const updatedCart = { ...prev, [itemId]: (prev[itemId] || 0) + 1}; //Increment.

            //Save to localStorage if user is a guest.
            if(!localStorage.getItem("auth-token")) {
                localStorage.setItem("guestCart", JSON.stringify(updatedCart));
            }
            return updatedCart;
        });

        //If user is logged in, update the backend cart.
        if(localStorage.getItem('auth-token')){
            fetch(`${apiUrl}/cart/add`, {
                method: 'POST',
                headers: {
                    Accept: 'application/form-data',
                    'auth-token': `${localStorage.getItem('auth-token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({"itemId": itemId})
            })
            .then((response) => response.json())
            .then((data) => setCartItems(data));
        }
    }

    

    const removeFromCart = (itemId) => {
        setCartItems((prev) => {
            const updatedCart = { ...prev, [itemId]: (prev[itemId] || 1) - 1}; //Decrement.

            //Remove item if quantity reaches 0.
            if(updatedCart[itemId] <= 0) delete updatedCart[itemId];
            //Update localStorage for guests.
            if(!localStorage.getItem("auth-token")) {
                localStorage.setItem("guestCart", JSON.stringify(updatedCart));
            }
            return updatedCart;
        });
        
        //If user logged in, update the backend cart.
        if(localStorage.getItem('auth-token')) {
            fetch(`${apiUrl}/cart/remove`, {
                method: 'POST',
                headers: {
                    Accept: 'application/form-data',
                    'auth-token': `${localStorage.getItem('auth-token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({"itemId": itemId})
            })
            .then((response) => response.json())
            .then((data) => setCartItems(data));
        }
    }


    //Function: Calculate the total cart amount.
    const calculateSubtotal = (allProducts) => {
        return allProducts.reduce((sum, product) => {
            const quantity = cartItems[product.id] || 0;
            return sum + product.price * quantity;
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

    const clearGuestCart = () => {
        setCartItems({});
        localStorage.removeItem("guestCart")
    }

    const contextValue = {
        cartItems,
        addToCart,
        removeFromCart,
        calculateSubtotal,
        getTotalCartItems
    }

    return (
        <CartContext.Provider value={contextValue}>
            {children}
        </CartContext.Provider>
    );
};
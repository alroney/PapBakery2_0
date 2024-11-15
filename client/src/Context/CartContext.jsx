import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getCart, addToCart, updateCartItem, clearCart } from '../services/cartService';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([]);

    // Fetch the cart from the backend when the component mounts
    useEffect(() => {
        try {
            const loadCart = async () => {
                const lastFetched = localStorage.getItem('cartLastFetch');
                const now = Date.now();
                if(!lastFetched || now - lastFetched > 5 * 60 * 1000) { //5 minutes
                    if (localStorage.getItem('auth-token')) {
                        const cartData = await getCart();
                        setCart(Array.isArray(cartData.items) ? cartData.items : []);
                    } 
                    else {
                        const guestCart = JSON.parse(localStorage.getItem('guestCart')) || [];
                        setCart(guestCart);
                    }
                    localStorage.setItem('cartLastFetched', now);
                }
                else {
                    const guestCart = JSON.parse(localStorage.getItem('guestCart')) || [];
                    setCart(guestCart);
                }
            };
            loadCart();
        } 
        catch (error) {
            console.log("Error in initial cart loading: ", error);
        }
        
    }, []);

    // Add item to the cart (auth or guest)
    const handleAddToCart = useCallback(async (product) => {
        try {
            if (localStorage.getItem('auth-token')) {
                const updatedCart = await addToCart(product.id, 1);
                setCart(updatedCart.items);
            } else {
                const guestCart = [...cart];
                const itemIndex = guestCart.findIndex((item) => item.productId === product.id);
                if (itemIndex > -1) {
                    guestCart[itemIndex].quantity += 1;
                } else {
                    guestCart.push({ productId: product.id, name: product.name, price: product.price, quantity: 1 });
                }
                setCart(guestCart);
                localStorage.setItem('guestCart', JSON.stringify(guestCart));
            }
        } 
        catch (error) {
            console.log("Error adding to cart: ", error);
        }
        
    }, [cart]);

    // Update item quantity in the cart
    const handleUpdateCartItem = useCallback(async (itemId, quantity) => {
        try {
            if (localStorage.getItem('auth-token')) {
                const updatedCart = await updateCartItem(itemId, quantity);
                setCart(updatedCart.items);
            } else {
                const guestCart = cart.map((item) =>
                    item.productId === itemId ? { ...item, quantity } : item
                );
                setCart(guestCart);
                localStorage.setItem('guestCart', JSON.stringify(guestCart));
            }
        } 
        catch (error) {
            console.log("Error in handleUpdateCartItem: ", error);
        }
        
    }, [cart]);

    // Clear the cart (auth or guest)
    const handleClearCart = useCallback(async () => {
        try {
            if (localStorage.getItem('auth-token')) {
                await clearCart();
                setCart([]);
            } else {
                setCart([]);
                localStorage.removeItem('guestCart');
            }
        } 
        catch (error) {
            console.log("Error in handleClearCart: ", error);
        }
        
    }, []);

    //Calculate total quantity of items in the cart
    const getTotalCartItems = useCallback(() => {
        return Array.isArray(cart) ? cart.reduce((total, item) => total + item.quantity, 0) : 0;
    }, [cart]);

    return (
        <CartContext.Provider
            value={{
                cart,
                handleAddToCart,
                handleUpdateCartItem,
                handleClearCart,
                getTotalCartItems,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getCart, addToCart, updateCartItem, clearCart } from '../services/cartService';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
    console.log("(CartContext.jsx) -> (CartProvider) Component Loaded.");

    const [cart, setCart] = useState([]);

    // Fetch the cart from the backend when the component mounts
    useEffect(() => {
        try {
            const loadCart = async () => {
                const lastFetched = localStorage.getItem('cartLastFetch');
                const now = Date.now();
                if(!lastFetched || now - lastFetched > 5 * 60 * 1000) { //5 minutes
                    if(localStorage.getItem('auth-token')) {
                        const cartData = await getCart();
                        setCart(cartData.items || []);
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
            if(localStorage.getItem('auth-token')) {
                const updatedCart = await addToCart(product._id, 1);
                setCart(updatedCart.items);
            } 
            else {
                const updatedGuestCart = [...cart];
                const itemIndex = updatedGuestCart.findIndex((item) => item.productId === product._id);
                if(itemIndex > -1) {
                    updatedGuestCart[itemIndex].quantity += 1;
                } 
                else {
                    updatedGuestCart.push({ productId: product._id, name: product.name, price: product.price, quantity: 1, image: product.image });
                }
                setCart(updatedGuestCart);
                localStorage.setItem('guestCart', JSON.stringify(updatedGuestCart));
            }
        } 
        catch (error) {
            console.log("Error adding to cart: ", error);
        }
        
    }, [cart]);

    // Update item quantity in the cart
    const handleUpdateCartItem = useCallback(async (itemId, quantity) => {
        try {
            if(localStorage.getItem('auth-token')) {
                const updatedCart = await updateCartItem(itemId, quantity);
                setCart(updatedCart.items);
            } 
            else {
                //For guest users, modify the local cart.
                const updatedGuestCart = cart.map((item) =>
                    item.productId === itemId ? { ...item, quantity } : item
                )
                .filter((item) => item.quantity > 0); //Remove items with quantity 0.
                
                setCart(updatedGuestCart);
                localStorage.setItem('guestCart', JSON.stringify(updatedGuestCart));
            }
        } 
        catch (error) {
            console.log("Error in handleUpdateCartItem: ", error);
        }
        
    }, [cart]);

    // Clear the cart (auth or guest)
    const handleClearCart = useCallback(async () => {
        try {
            if(localStorage.getItem('auth-token')) {
                await clearCart();
                setCart([]);
            } 
            else {
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

    const calculateSubtotal = useCallback(() => {
        const subtotal = cart.reduce((price, item) => price + item.price * item.quantity, 0) || 0;
        return subtotal;
    })

    return (
        <CartContext.Provider
            value={{
                cart,
                handleAddToCart,
                handleUpdateCartItem,
                handleClearCart,
                getTotalCartItems,
                calculateSubtotal,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

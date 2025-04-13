import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
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
                //Function updater pattern to avoid the dependency on cart.
                setCart(currentCart => {
                    const updatedGuestCart = [...currentCart];
                    const itemIndex = updatedGuestCart.findIndex((item) => item.productId === product._id);
                    if(itemIndex > -1) {
                        updatedGuestCart[itemIndex].quantity += 1;
                    } 
                    else {
                        updatedGuestCart.push({ productId: product._id, name: product.name, price: product.price, quantity: 1, image: product.images });
                    }

                    localStorage.setItem('guestCart', JSON.stringify(updatedGuestCart));
                    return updatedGuestCart;
                })
            }
        } 
        catch (error) {
            console.log("Error adding to cart: ", error);
        }
        
    }, []);

    // Update item quantity in the cart
    const handleUpdateCartItem = useCallback(async (itemId, quantity) => {
        try {
            if(localStorage.getItem('auth-token')) {
                const updatedCart = await updateCartItem(itemId, quantity);
                setCart(updatedCart.items);
            } 
            else {
                setCart(currentCart => {
                    const updatedGuestCart = currentCart.map((item) => item.productId === itemId ? { ...item, quantity } : item).filter((item) => item.quantity > 0); //Remove items with quantity 0.

                    localStorage.setItem('guestCart', JSON.stringify(updatedGuestCart));
                    return updatedGuestCart;
                });
            }
        } 
        catch (error) {
            console.log("Error in handleUpdateCartItem: ", error);
        }
        
    }, []);

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

    const totalCartItems = useMemo(() => {
        if(!Array.isArray(cart) || cart.length === 0) return 0;
        return cart.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
    }, [cart]);

    const subtotal = useMemo(() => {
        console.log("(CartContext.jsx) -> (subtotal) Calculating subtotal with cart: ", cart);
        if(!Array.isArray(cart) || cart.length === 0) return 0;
        return cart.reduce((total, item) => {
            const itemPrice = parseFloat(item.price) || 0;
            const itemQuantity = parseInt(item.quantity) || 0;
            return total + (itemPrice * itemQuantity);
        }, 0).toFixed(2);
    }, [cart]);

    const value = useMemo(() => ({
        cart,
        handleAddToCart,
        handleUpdateCartItem,
        handleClearCart,
        getTotalCartItems: () => totalCartItems,
        calculateSubtotal: () => subtotal,
    }), [cart, handleAddToCart, handleUpdateCartItem, handleClearCart, totalCartItems, subtotal]);

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getCart, addToCart, updateCartItem, clearCart } from '../services/cartService';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
    console.log("(CartContext.jsx) -> (CartProvider) Component Loaded.");

    const [cart, setCart] = useState([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    

    // Fetch the cart from the backend when the component mounts
    useEffect(() => {
        //Check if user is authenticated.
        const authToken = localStorage.getItem('auth-token');
        setIsAuthenticated(!!authToken); //Boolean conversion. If token exists, user is authenticated. So instead of setting 'isAuthenticated' to the value of 'authToken', we set it to true or false.

        const loadCart = async () => {
            const lastFetched = localStorage.getItem('cartLastFetched');
            const now = new Date().getTime();

            if(!lastFetched || now - lastFetched > 5 * 60 * 1000) { //5 minutes in milliseconds.
                if(authToken) {
                    try {
                        const cartData = await getCart();
                        setCart(cartData.items);
                    }
                    catch(error) {
                        console.error("Error fetching cart: ", error);
                        setCart([]); //Set cart to empty array if error occurs.
                    }
                }
                else {
                    const guestCart = JSON.parse(localStorage.getItem('guestCart')) || [];
                    setCart(guestCart);
                }
                localStorage.setItem('cartLastFetched', now); //Update last fetched time.
            }
            else {
                if(!authToken) {
                    const guestCart = JSON.parse(localStorage.getItem('guestCart')) || [];
                    setCart(guestCart);
                }
            }
        }

        loadCart();
    }, []);

    

    //Object: Contains the different cart manipulation functions.
    const cartOperations = {
        //Function Property: Add to cart - handles both guest and authenticated users.
        addItem: useCallback(async (product) => {
        
            console.log("Product being added to cart: ", product);
            try {
                if(isAuthenticated) {
                    const updatedCart = await addToCart(product._id, 1);
                    setCart(updatedCart.items);
                }
                // For guest users, ensure we have complete product data
                // If product data is incomplete, we should fetch the complete product
                if (!product.images || !Array.isArray(product.images) || !product.subcategory) {
                    // We could add a product fetch here to get complete data
                    console.warn("Incomplete product data when adding to cart:", product);
                    // Potential solution: Fetch complete product data when missing
                    // const completeProduct = await fetchProductById(product._id);
                    // product = completeProduct;
                }
                
                // Create a consistent product name
                const productName = product.size && product.shape && product.flavor ? 
                    `${product.size} ${product.shape} ${product.flavor} ${product.subcategory || ''} ${product.category}` : 
                    product.name || '';
                
                // Get a consistent image path
                const productImage = Array.isArray(product.images) && product.images.length > 0 ? 
                    product.images[0]?.imgName : 
                    product.image; // Assuming the first image is the main one
                    
                setCart(currentCart => {
                    const updatedGuestCart = [...currentCart];
                    const itemIndex = updatedGuestCart.findIndex(item => item.productId === product._id);
                    
                    if(itemIndex > -1) {
                        updatedGuestCart[itemIndex].quantity += 1;
                    }
                    else {
                        updatedGuestCart.push({
                            productId: product._id,
                            name: productName,
                            price: product.price,
                            image: productImage,
                            quantity: 1
                        });
                    }

                    console.log("productImage: ", productImage);
                    localStorage.setItem('guestCart', JSON.stringify(updatedGuestCart)); //Update guest cart in local storage.
                    return updatedGuestCart;
                });
            }
            catch(error) {
                console.error("Error adding item to cart: ", error);
            }

        }, [isAuthenticated]),
        //Function Property: Update cart item - handles both guest and authenticated users.
        updateItem: useCallback(async (itemId, quantity) => {
            try {
                if(isAuthenticated) {
                    const updatedCart = await updateCartItem(itemId, quantity);
                    setCart(updatedCart.items);
                }
                else { //Guest user.
                    setCart(currentCart => {
                        const updatedGuestCart = [...currentCart];
                        const itemIndex = updatedGuestCart.findIndex(item => item.productId === itemId);
                        
                        if(itemIndex > -1) {
                            if (quantity <= 0) {
                                //Remove the item if quantity is 0 or less.
                                updatedGuestCart.splice(itemIndex, 1);
                            } 
                            else {
                                updatedGuestCart[itemIndex].quantity = quantity;
                            }
                            localStorage.setItem('guestCart', JSON.stringify(updatedGuestCart)); //Update guest cart in local storage.
                        }
                        return updatedGuestCart;
                    });
                } //End of 'isAuthnenticated' check.
            }
            catch(error) {
                console.error("Error updating item in cart: ", error);
            }
        }, [isAuthenticated]),
        //Function Property: Clear cart - handles both guest and authenticated users.
        clear: useCallback(async () => {
            try {
                if(isAuthenticated) {
                    await clearCart();
                }
                setCart([]);
                if(!isAuthenticated) {
                    localStorage.removeItem('guestCart'); //Clear guest cart from local storage.
                }
            }
            catch(error) {
                console.error("Error clearing cart: ", error);
            }
        }, [isAuthenticated]),
    } //End of cartOperations object.



    //Cart Calculations.
    const totalCartItems = useMemo(() => {
        if(!Array.isArray(cart) || cart.length === 0) return 0;
        return cart.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
    }, [cart]);

    const subtotal = useMemo(() => {
        if(!Array.isArray(cart) || cart.length === 0) return 0;
        return cart.reduce((total, item) => {
            const itemPrice = parseFloat(item.price) || 0;
            const itemQuantity = parseInt(item.quantity) || 0;
            return total + (itemPrice * itemQuantity);
        }, 0).toFixed(2);
    }, [cart]);



    const value = {
        cart,
        addToCart: cartOperations.addItem,
        updateCartItem: cartOperations.updateItem,
        clearCart: cartOperations.clear,
        getTotalCartItems: () => totalCartItems,
        calculateSubtotal: () => subtotal,
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};

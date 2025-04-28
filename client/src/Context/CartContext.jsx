import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getCart, addToCart, updateCartItem, clearCart } from '../services/cartService';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
    console.log("(CartContext.jsx) -> (CartProvider) Component Loaded.");

    const [cart, setCart] = useState([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true); //Loading state to show loading spinner or message.
    

    //Fetch the cart from the backend when the component mounts.
    useEffect(() => {
        //Check if user is authenticated.
        const authToken = localStorage.getItem('auth-token');
        setIsAuthenticated(!!authToken); //Boolean conversion. If token exists, user is authenticated. So instead of setting 'isAuthenticated' to the value of 'authToken', we set it to true or false.

        const loadCart = async () => {
            setIsLoading(true);
            try {
                if(authToken) {
                    //Always fetch fresh cart data for authenticated users.
                    const cartData = await getCart();
                    setCart(cartData.items);
                    localStorage.setItem('cartLastFetched', new Date().getTime()); //Store the last fetched time in local storage.
                }
                else {
                    //For guest users, check if the cart is already in local storage.
                    const guestCart = JSON.parse(localStorage.getItem('guestCart')) || []; //Get the guest cart from local storage.
                    setCart(guestCart);
                }
            }
            catch(error) {
                console.error("Error fetching cart: ", error);
                if(!authToken) { //If user is not authenticated, we can assume they are a guest user.
                    //Fallback to guest cart if API fails
                    const guestCart = JSON.parse(localStorage.getItem('guestCart')) || [];
                    setCart(guestCart);
                }
                else {
                    setCart([]); //Set cart to empty if error occurs.
                }
            }
            finally {
                setIsLoading(false);
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
                //Get the quantity from the product, defaulting to 1 if not provided.
                const quantity = product.quantity || 1;
                
                //Check if user is authenticated.
                if(isAuthenticated) {
                    const updatedCart = await addToCart(product._id, quantity);
                    setCart(updatedCart.items);
                    return; //Prevent from continuing to guest cart logic.
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
                    product.images[0]?.imgName : product.image; // Assuming the first image is the main one
                    
                setCart(currentCart => {
                    const updatedGuestCart = [...currentCart];
                    const itemIndex = updatedGuestCart.findIndex(item => item.productId === product._id);
                    
                    if(itemIndex > -1) {
                        updatedGuestCart[itemIndex].quantity += quantity;
                    }
                    else {
                        updatedGuestCart.push({
                            productId: product._id,
                            sku: product.sku,
                            name: productName,
                            price: product.price,
                            image: productImage,
                            flour: product.flour,
                            quantity: quantity,
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



    //Function: Cart Calculations.
    const totalCartItems = useMemo(() => {
        if(!Array.isArray(cart) || cart.length === 0) return 0;
        return cart.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
    }, [cart]);


    //Function: Calculate subtotal of the cart.
    const subtotal = useMemo(() => {
        if(!Array.isArray(cart) || cart.length === 0) return 0;
        return cart.reduce((total, item) => {
            const itemPrice = parseFloat(item.price) || 0;
            const itemQuantity = parseInt(item.quantity) || 0;
            return total + (itemPrice * itemQuantity);
        }, 0).toFixed(2);
    }, [cart]);


    //Function: Group cart items by size and shape.
    const groupedCartItems = useMemo(() => {
        if(!Array.isArray(cart) || cart.length === 0) return [];

        const groupedItems = {};

        cart.forEach(item => {
            //Extract shape and size from the name.
            const nameParts = item.name.split(' ');
            const size = nameParts[0]; //Assuming size is the first part of the name.
            const shape = nameParts[1]; //Assuming shape is the second part of the name.
            const subcategory = nameParts[3]; //Assuming subcategory is the fourth part of the name.
            const category = nameParts.slice(4).join(' '); //Category may contain multiple words

            //Create a unique key for each item based on size and shape.
            const groupKey = `${size}${shape}${subcategory}${category}`; //Unique key for grouping.

            if(!groupedItems[groupKey]) {
                groupedItems[groupKey] = {
                    baseItem: {
                        productId: `group-${groupKey}`,
                        name: `${size} ${subcategory} ${shape} ${category}`,
                        image: item.image,
                        variants: []
                    },
                    totalPrice: 0,
                    totalQuantity: 0
                };
            }

            const flavor = nameParts.length > 2 ? nameParts[2] : ''; //Assuming flavor is the third part of the name.

            //Add item as a variant.
            groupedItems[groupKey].baseItem.variants.push({
                productId: item.productId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                flavor: flavor,
                flour: item.flour,
                sku: item.sku,
            });

            //Update total price and quantity for the group.
            groupedItems[groupKey].totalPrice += parseFloat(item.price) * parseInt(item.quantity);
            groupedItems[groupKey].totalQuantity += parseInt(item.quantity);
        });

        return Object.values(groupedItems).map(group => ({
            ...group.baseItem,
            totalPrice: group.totalPrice.toFixed(2),
            totalQuantity: group.totalQuantity,
        }));
    }, [cart])


    //Object: Value to be provided to the context.
    const value = {
        cart,
        groupedCartItems,
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

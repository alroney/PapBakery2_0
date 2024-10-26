/**
 * ShoContext.js
 * THis file defines a React context for managing shop-related data, including products and cart items.
 */

import React, { createContext, useEffect, useState } from "react";

//Create a Context for the Shop
export const ShopContext = createContext(null);

/** getDefaultCart
 * 
 * @returns {Object} A default cart object where each product ID is mapped to a quantity of 0.
 * This function initializes an empty cart with a quantity of 0 for 301 products (IDs from 0 to 300).
 */
const getDefaultCart = () => {
    let cart = {}; //Inititialize an empty object to hold the cart data.

    //Add all the products into the cart with a quantity of 0 per item.
    for (let i = 0; i <= 300 + 1; i++) {
        cart[i] = 0; //Set quantity of each product to 0.
    }

    return cart;
}


/** ShopContextProvider
 * 
 * @param {Object} props - The props passed down to the component, including children components. 
 * @returns {React.Element} The ShopContext.Provider wrapping around children components to share shop data.
 * This component provides the shop context, managing products and cart items.
 */
const ShopContextProvider = (props) => {
    //State to store all products fetched from the server.
    const [all_product, setAll_Product] = useState([]);

    //State to store cart items, initialized using getDefaultCart().
    const [cartItems, setCartItems] = useState(getDefaultCart());
    
    
    //Asynchronously fetches all products from the server and updates the state.
    const fetchProducts = async () => {
        try {
            const response = await fetch('http://localhost:4000/allproducts');
            const data = await response.json();
            setAll_Product(data);
        }
        catch(error) {
            console.error("Failed to fetch products: ", error);
        }
    }

    //useEffect hook to fetch products and load cart items on component mount.
    useEffect(() => {
        fetchProducts();

        //If user is logged in, load the user's cart from the backend.
        if(localStorage.getItem('auth-token')) {
            fetch('http://localhost:4000/getcart', {
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
    }, []) //The empty dependency array ensures this runs only once when the component is mounted.
    
    /** addToCart
     * 
     * @param {number} itemId - The id of the item to be added to the cart.
     * Adds a product to the cart by increasing its quantity by 1.
     * If the user is logged in, it also sends a request to update the cart in the backend.
     */
    const addToCart = (itemId) => {
        /** setCartItems() Explanation.
         * The line below create a new state for `cartItems` by copying the previous state `(prev)`.
         * The spread operator (`...prev`) ensures that all previous entries in the cart remain intact.
         * While `[itemId]: prev[itemId] + 1` updates only the specified item.
         */
        setCartItems((prev) => ({...prev, [itemId]:prev[itemId] + 1})) //'prev[itemId]' will provide the key for that item. Then increment the quantity of the specified item.
        
        //If user is logged in, update the backend cart.
        if(localStorage.getItem('auth-token')){
            fetch('http://localhost:4000/addtocart', {
                method: 'POST',
                headers: {
                    Accept: 'application/form-data',
                    'auth-token': `${localStorage.getItem('auth-token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({"itemId": itemId})
            })
            .then((response) => response.json())
            .then((data) => console.log(data));
        }
    }

    /** removeFromCart
     * 
     * @param {number} itemId - The ID of the item to be removed from the cart.
     * Removes a product from the cart by decreasing its quantity by 1.
     * If the user is logged in, it also sends a request to update the cart in the backend.
     */
    const removeFromCart = (itemId) => {
        setCartItems((prev) => ({...prev, [itemId]:prev[itemId] - 1})); //Decrement the quantity of the specified item
        
        //If user logged in, update the backend cart.
        if(localStorage.getItem('auth-token')) {
            fetch('http://localhost:4000/removefromcart', {
                method: 'POST',
                headers: {
                    Accept: 'application/form-data',
                    'auth-token': `${localStorage.getItem('auth-token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({"itemId": itemId})
            })
            .then((response) => response.json())
            .then((data) => console.log(data));

            console.log("Product removed from cart db");
        }
    }

    /** getTotalCartAmount
     * 
     * @returns {number} The total cost of all items in the cart.
     * Calculate the total cost by iterating through each item in the cart and adding the cost (price * quantity).
     */
    const getTotalCartAmount = () => {
        let totalAmount = 0;
        for( const item in cartItems) {
            if(cartItems[item] > 0){
                let itemInfo = all_product.find((product) => product.id===Number(item));
                totalAmount += itemInfo.price * cartItems[item];
            }
        }
        return totalAmount;
    }
    
    /** getTotalCartItems
     * 
     * @returns {number} The total number of items in the cart.
     * Calculates the total number of items in the cart by summing up the quantities of all items.
     */
    const getTotalCartItems = () => {
        let totalItems = 0;
        for(const item in cartItems){
            if(cartItems[item] > 0) {
                totalItems += cartItems[item];
            }
        }
        return totalItems;
    }

    //Context value that will be available to all child components.
    const contextValue = {
        getTotalCartItems,
        getTotalCartAmount,
        all_product, cartItems,
        addToCart,
        removeFromCart,
        fetchProducts
    };

    //Return the Provider component, passing the context value down to children components.
    return (
        <ShopContext.Provider value={contextValue}>
            {props.children}
        </ShopContext.Provider>
    )
}

export default ShopContextProvider;
import React, { createContext, useState } from "react";
import all_product from '../Components/Assets/data/all_product';

export const ShopContext = createContext(null);

const getDefaultCart = () => {
    let cart = {}; //let cart = empty object.
    //Add all the products into the cart with a quantity of 0 per item.
    for (let i = 0; i < all_product.length + 1; i++) {
        cart[i] = 0;
    }

    return cart;
}

const ShopContextProvider = (props) => {
    const [cartItems, setCartItems] = useState(getDefaultCart());
    console.log("Current Cart:", cartItems);
    
    //Add to Cart.
    const addToCart = (itemId) => {
        setCartItems((prev) => ({...prev, [itemId]:prev[itemId] + 1})) //'prev[itemId]' will provide the key for that item.
        console.log("addToCart after press: ", cartItems);
    }

    //Remove from cart.
    const removeFromCart = (itemId) => {
        setCartItems((prev) => ({...prev, [itemId]:prev[itemId] - 1}))
    }
    
    const contextValue = {all_product, cartItems, addToCart, removeFromCart};

    return (
        <ShopContext.Provider value={contextValue}>
            {props.children}
        </ShopContext.Provider>
    )
}

export default ShopContextProvider;
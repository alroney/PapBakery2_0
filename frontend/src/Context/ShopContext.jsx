import React, { createContext } from "react";
import all_product from '../Components/Assets/data/all_product';

export const ShopContext = createContext(null);

const ShopContextProvider = (props) => {
    const contextValue = {all_product}; //Store the data from all_product into contextValue

    return (
        <ShopContext.Provider value={contextValue}>
            {props.children}
        </ShopContext.Provider>
    )
}

export default ShopContextProvider;
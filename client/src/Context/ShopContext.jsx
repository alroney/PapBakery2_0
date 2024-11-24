import React, { createContext, useEffect, useState } from "react";
import apiUrl from '@config';

//Create a Context for the Shop
export const ShopContext = createContext(null);

/** ShopContextProvider
 * 
 * @param {Object} props - The props passed down to the component, including children components. 
 * @returns {React.Element} The ShopContext.Provider wrapping around children components to share shop data.
 * This component provides the shop context, managing products and cart items.
 */
const ShopContextProvider = (props) => {
    console.log("(ShopContext.jsx) -> (ShopContextProvider) Component Loaded.");

    //State to store all products fetched from the server. Default set to empty array.
    const [all_product, setAll_Product] = useState([]);
    const [loading, setLoading] = useState(true);
    
    
    //Asynchronously fetches all products from the server and updates the state.
    const fetchProducts = async () => {
        try {
            const response = await fetch(`${apiUrl}/products/all`);
            const data = await response.json(); //Get the response from the api, transform it into a JSON format then set it to data.
            setAll_Product(data);
            setLoading(false);
        }
        catch(error) {
            console.error("Failed to fetch products: ", error);
            setLoading(false);
        }
    }

    //useEffect hook to fetch products and load cart items on component mount.
    useEffect(() => {
        fetchProducts();
    }, []) //The empty dependency array ensures this runs only once when the component is mounted.
    

    //Context value that will be available to all child components.
    const contextValue = {
        all_product,
        fetchProducts, 
        loading,
    };

    //Return the Provider component, passing the context value down to children components.
    return (
        <ShopContext.Provider value={contextValue}>
            {props.children}
        </ShopContext.Provider>
    )
}

export default ShopContextProvider;
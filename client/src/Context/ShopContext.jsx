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

    //State variables to store all products, categories, subcategories and loading status.
    const [all_category, setAll_Category] = useState([]);
    const [all_subcategory, setAll_Subcategory] = useState([]);
    const [all_product, setAll_Product] = useState([]);
    const [loading, setLoading] = useState(true);
    
    
    //Function: asynchronously fetches all products from the server and updates the state.
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


    //Function: asynchronously fetches all categories from the server and updates the state.
    const fetchCategories = async () => {
        try {
            const response = await fetch(`${apiUrl}/products/allCategories`);
            const data = await response.json(); //Get the response from the api, transform it into a JSON format then set it to data.
            setAll_Category(data);
            setLoading(false);
        }
        catch(error) {
            console.error("Failed to fetch categories: ", error);
            setLoading(false);
        }
    }

    //Function: asynchronously fetches all subcategories from the server and updates the state.
    const fetchSubcategories = async () => {
        try {
            const response = await fetch(`${apiUrl}/products/allSubCategories`);
            const data = await response.json(); //Get the response from the api, transform it into a JSON format then set it to data.
            setAll_Subcategory(data);
            setLoading(false);
        }
        catch(error) {
            console.error("Failed to fetch subcategories: ", error);
            setLoading(false);
        }
    }
    

    //useEffect hook to fetch products and load cart items on component mount.
    useEffect(() => {
        fetchCategories();
        fetchSubcategories();
        fetchProducts();
    }, []) //The empty dependency array ensures this runs only once when the component is mounted.
    

    //Context value that will be available to all child components.
    const contextValue = {
        all_category,
        all_subcategory,
        all_product,
        fetchProducts,
        loading,
    };


    console.log("==(ShopContext) props: ", props);

    //Return the Provider component, passing the context value down to children components.
    return (
        <ShopContext.Provider value={contextValue}>
            {props.children}
        </ShopContext.Provider>
    )
}

export default ShopContextProvider;
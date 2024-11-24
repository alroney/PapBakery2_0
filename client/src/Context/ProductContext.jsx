/**
 * This context file (with use of `useReducer`) has the following purpose:
 *  - Store all product data (including reviews) in a centralized context.
 *  - Use `useReducer` to handle actions like adding a review or updating average ratings.
 */


import React, { createContext, useReducer, useContext, useEffect } from 'react';
import apiUrl from '@config';

//Inital state.
const initialState = {
    products: [],
    loading: true, //Add loading state to track the fetch status.
    currentUser: null,
};

//Action types.
const ADD_REVIEW = 'ADD_REVIEW';
const SET_PRODUCTS = 'SET_PRODUCTS';

//Reducer function to manage product state.
const productReducer = (state, action) => {
    switch(action.type) {
        case SET_PRODUCTS: 
            return {
                ...state,
                products: action.payload,
                loading: false,
            };

        case ADD_REVIEW:
            return {
                ...state,
                products: state.products.map((product) => {
                    console.log("(ProductContext.jsx) ADD_REVIEW -> action.payload: ", action.payload)
                    if(product._id === action.payload.productId) {
                        const updatedReviews = [...product.reviews, action.payload.review];
                        return {
                            ...product,//Get all previous values (unchanged).
                            reviews: updatedReviews,
                            rating: updatedReviews.length > 0
                                ? updatedReviews.reduce((sum, review) => sum + review.rating, 0) / updatedReviews.length
                                : 0,
                        };
                    }
                    return product;
                }),
            };

        default:
            return state;
    }
};



//Context
const ProductContext = createContext();

//Provider component
export const ProductProvider = ({ children }) => {
    console.log("(ProductContex.jsx) -> (ProductProvider) Component Loaded.");

    const [state, dispatch] = useReducer(productReducer, initialState);


    useEffect(() => {
        //Fetch all products from the backend API when the provider is mounted
        const fetchProducts = async () => {
            try {
                const response = await fetch(`${apiUrl}/products/all`);
                const data = await response.json();
                dispatch({
                    type: SET_PRODUCTS, 
                    payload: data
                });
            }
            catch(error) {
                console.error("Failed to fetch products: ", error);
            }
    }
    fetchProducts();
    }, []); //The empty dependency array ensures this runs only once when the provider mounts.

    return (
        <ProductContext.Provider value={{ state, dispatch }}>
            {children}
        </ProductContext.Provider>
    );
};

//Custom hook to use product context
export const useProduct = () => {
    console.log("(ProductContext.jsx) -> (useProduct) Hook Activated.");

    const context = useContext(ProductContext);


    if(context === undefined) {
        throw new Error('useProduct must be used within a ProductProvider');
    }
    return context;
}
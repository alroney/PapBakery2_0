/**
 * This context file (with use of `useReducer`) has the following purpose:
 *  - Store all product data (including reviews) in a centralized context.
 *  - Use `useReducer` to handle actions like adding a review or updating average ratings.
 */


import React, { createContext, useReducer, useContext } from 'react';

//Inital state.
const initialState = {
    products: [],
};

//Action types.
const ADD_REVIEW = 'ADD_REVIEW';

//Reducer function to manage product state.
const productReducer = (state, action) => {
    switch(action.type) {
        case ADD_REVIEW:
            return {
                ...state,
                products: state.products.map((product) => {
                    if(product.id === action.payload.productId) {
                        const updateReviews = [...product.reviews, action.payload.review];
                        return {
                            ...product,//Get all previous values (unchanged).
                            reviews: updatedReviews,
                            rating:
                            updatedReviews.reduce((sum, review) => sum + review.rating, 0) / updatedReviews.length,
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
    const [state, dispatch] = useReducer(productReducer, initialState);

    return (
        <ProductContext.Provider value={{ state, dispatch }}>
            {children}
        </ProductContext.Provider>
    );
};

//Custom hook to use product context
export const useProduct = () => useContext(ProductContext);
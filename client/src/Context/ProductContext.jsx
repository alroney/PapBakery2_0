/**
 * This context file provides:
 * - Centralized product data (products, categories, subcategories, etc.).
 * - Loading states for each data type.
 * - Functions for adding reviews and other product operations.
 */


import React, { createContext, useReducer, useContext, useEffect, useMemo } from 'react';
import { apiUrl } from '@config';

//Inital state.
const initialState = {
    products: [],
    categories: [],
    subcategories: [],
    productsLoading: true,
    categoriesLoading: true,
    subcategoriesLoading: true
};

//Action types.
const SET_PRODUCTS = 'SET_PRODUCTS';
const SET_CATEGORIES = 'SET_CATEGORIES';
const SET_SUBCATEGORIES = 'SET_SUBCATEGORIES';
const ADD_REVIEW = 'ADD_REVIEW';

//Reducer function to manage product state.
const productReducer = (state, action) => {
    switch(action.type) {
        case SET_PRODUCTS: 
            return {
                ...state,
                products: action.payload,
                loading: false,
            };
        
        case SET_CATEGORIES:
            return {
                ...state,
                categories: action.payload,
                categoriesLoading: false,
            };

        case SET_SUBCATEGORIES:
            return {
                ...state,
                subcategories: action.payload,
                subcategoriesLoading: false,
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


//Provider component.
export const ProductProvider = ({ children }) => {
    console.log("(ProductContext.jsx) -> (ProductProvider) Component Loaded.");

    const [state, dispatch] = useReducer(productReducer, initialState);

    //Memoization to prevent unnecessary re-renders.
    const value = useMemo(() => ({
        products: state.products,
        categories: state.categories,
        subcategories: state.subcategories,
        productsLoading: state.productsLoading,
        categoriesLoading: state.categoriesLoading,
        subcategoriesLoading: state.subcategoriesLoading,
        dispatch, //Expose dispatch to allow components to update the state.

    }), [state.products, state.categories, state.subcategories, state.productsLoading, state.categoriesLoading, state.subcategoriesLoading]);
    
    //Fetch all data when component mounts.
    useEffect(() => {
        const fetchData = async () => {
            try {
                //Use Promise.all to fetch data in parallel.
                const [productRes, categoriesRes, subcategoriesRes] = await Promise.all([
                    fetch(`${apiUrl}/products/all`),
                    fetch(`${apiUrl}/products/allCategories`),
                    fetch(`${apiUrl}/products/allSubCategories`)
                ]);

                const [products, categories, subcategories] = await Promise.all([
                    productRes.json(),
                    categoriesRes.json(),
                    subcategoriesRes.json()
                ]);

                //Update state with all fetched data.
                dispatch({ type: SET_PRODUCTS, payload: products });
                dispatch({ type: SET_CATEGORIES, payload: categories });
                dispatch({ type: SET_SUBCATEGORIES, payload: subcategories });

                console.log("(ProductContext.jsx) -> (ProductProvider) All product data fetch successfully.");
            }
            catch(error) {
                console.error("Error fetching data: ", error);
            }
        };
        fetchData();
    }, []);

    return (
        <ProductContext.Provider value={value}>
            {children}
        </ProductContext.Provider>
    )
};

export const useProduct = () => {
    const context = useContext(ProductContext);
    if(context === undefined) {
        throw new Error("useProduct must be used within a ProductProvider");
    }
    return context;
}
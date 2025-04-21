import { apiUrl } from '@config';

const authToken = localStorage.getItem('auth-token');
const headers = {
    'Content-Type': 'application/json',
    ...(authToken && { 'auth-token': authToken })
};




//Function: Fetch cart for the logged-in user.
export const getCart = async () => {
    try {
        const response = await fetch(`${apiUrl}/cart`, { headers });
        return response.json();
    } 
    catch (error) {
        console.log("Error in getCart: ", error);
    }
};



//Function: Add an item to the cart.
export const addToCart = async (itemId, quantity = 1) => {
    try {
        const response = await fetch(`${apiUrl}/cart/add`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ itemId, quantity })
        });
        return response.json();
    } 
    catch (error) {
        console.log("Error in addToCart: ", error);
    }
};



//Function: Update quantity of an item in the cart.
export const updateCartItem = async (itemId, quantity) => {
    try {
        const response = await fetch(`${apiUrl}/cart/update`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ itemId, quantity })
        });
        return response.json();
    } 
    catch (error) {
        console.log("Error in updateCartItem: ", error);
    }
};



//Function: Clear the cart.
export const clearCart = async () => {
    try {
        const response = await fetch(`${apiUrl}/cart/clear`, {
            method: 'DELETE',
            headers
        });
        return response.json();
    } 
    catch (error) {
        console.log("Error in clearCart: ", error);
    }
};



//Function: Fetches the fees for the cart based on subtotal, state, shipping cost, and coupon code.
export const fetchFees = async ({ subtotal, state, shippingCost, couponCode }) => {
    try {
        const response = await fetch(`${apiUrl}/cart/fees`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({subtotal, state, shippingCost, couponCode})
        });
        //Parse the response body as JSON.
        const data = await response.json()
        
        return data; //Returns { taxRate, shipping, discount, total }
    }
    catch(error) {
        console.error("Error fetching fees: ", error.response || error.message);
        return null;
    }
}
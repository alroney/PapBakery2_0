/** Explanation of Middleware Usage.
 * HOW THE MIDDLEWARE IS USED (authenticateUser)
 * 
 * @Purpose
 * - This middleware is used to ensure that the request is coming from an authenticated user.
 * - It validates the user's identity using the token, making sure that only authorized users can access protected routes.
 * 
 * @Usage
 * - Middleware is added to routes that require authentication.
 * - For example, in `app.post('/addtocart', authenticateUser, async (req, res) => {});`
 *      - This route will only proceed if the user is authenticated.
 *      - `authenticateUser` will run before this function.
 * 
 * @Summary
 * - The `authenticateUser` middleware ensures that users are authenticated before they can access certain routes.
 * - It extracts the token from the request header and verifies it using a secret key.
 * - If the token is valid, the user's data is attched to req.user, allowing downstream handlers to know the user's identity.
 * - If the token is missing or invalid, the user gets a 401 Unauthorized response, preventing access to the route.
 */

 /** Explanation of authenticateUser Middleware.
 * Asynchronous Middleware Function.
 * 
 * @param {*} req: Represents the request made by the client.
 * @param {*} res: Represents the response that will be sent to the client.
 * @param {*} next: A function that, when called, will pass control to the next middleware in the stack.
 * 
 * PURPOSE:
 * - To authenticate the user using the JWT token provided in the request headers.
 */

const authenticateUser = async (req,res,next) => {
    const token = req.header('auth-token'); //Extract JWT token value from the key 'auth-token' located in the 'headers' key's object value in the fetch functions object parameter -> fetch(('api_endpoint_url'), {}).
    
    if(!token) {
        req.user = null; //Set req.user to null for guest users.
        return res.status(401).send("Access Denied"); ///Proceed without user authentication.
    }

    try {
        /** Explanation of JWT verification process.
         * Verify JWT token and extract user data.
         * 
         * @Verification_Process
         * - `jwt.verify(token, process.env.JWT_SECRET)`: used to verify the token.
         *      - `token`: The JWT token extracted from the request header.
         *      - `secret_ecom`: The secret key used to verify the token's integrity.
         *          - This is the same secret that was used to sign the token when it was originally created.
         *          - If the token has been altered or is not valid, verification will fail.
         * - If the token is valid, `jwt.verify()` returns the decoded payload from the token, which in this case is assigned to the variable `data`.
         *      - `data` contains the information embedded when the token was created, specifically `{user: {id: user.id} }`
         * 
         * Extract User Data
         * - `req.user =data.user;` assigns the `user` object (from the decoded token) to `req.user`.
         * - This allows the information about the user (e.g. user ID) to be available in any subsequent route handler or middleware.
         * - For example, any route that follows this middleware can use req.user.id to know which user is making the request.
         * 
         * Call Next Middleware
         * - `next();` is called to pass control to the next middleware function in the stack.
         * - If the middleware successfully authenticates the user, the request proceeds to the next handler (e.g. a route that handles a request to add a product to a cart).
         */
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified.user;
        next();
    }
    catch (error) {
        res.status(401).send({errors: "Invalid token."});
    }
};

module.exports = authenticateUser;
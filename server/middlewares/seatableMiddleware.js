//Middleware to check if the request has a valid token.
const checkAuth = (req, res, next) => {
    const token = req.headers['authorization'];
    if(!token) {
        return res.status(401).json({ success: false, message: "No token provided." });
    }

    next();
};

module.exports = checkAuth;
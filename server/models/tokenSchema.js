const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    source: { //Company the token would be from or referring to. e.g., "SeaTable", "PayPal", etc.
        type: String,
        required: true,
    },
    keyName: { //E.g., "base_token", "dtable_uuid", "api_key" etc.
        type: String,
        unique: true,
        required: true,
    },
    keyValue: { //The value for the keyName.
        type: String,
        required: true,
    },
    expiresAt: { //Expiration date.
        type: Date,
    },
});


module.exports = mongoose.model('token', tokenSchema); //Export the model.
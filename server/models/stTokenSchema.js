const mongoose = require('mongoose');

const stTokenSchema = new mongoose.Schema({
    key: { //E.g., "base_token"
        type: String,
        unique: true,
        required: true,
    },
    value: { //The actual token value.
        type: String,
        required: true,
    },
    uuid: { //dtable_uuid if needed.
        type: String,
    },
    expiresAt: { //Expiration date.
        type: Date,
    },
});

module.exports = mongoose.model('stToken', stTokenSchema); //Export the model.
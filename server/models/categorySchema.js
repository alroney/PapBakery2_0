const Mongoose = require('mongoose');


const categorySchema = new Mongoose.Schema(
    {
        //key: object -> { key: value,}.
        categoryID: {
            type: Number,
            required: true,
            default: 0,
        },
        categoryName: {
            type: String,
            required: true,
            default: "none",
        },
    }
);

module.exports = Mongoose.model('Category', categorySchema);
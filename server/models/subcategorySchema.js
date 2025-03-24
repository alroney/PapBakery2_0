const Mongoose = require('mongoose');

const subCategorySchema = new Mongoose.Schema(
    {
        //key: object -> { key: value,}.
        subCategoryID: {
            type: Number,
            required: true,
            default: 0,
        },
        subCategoryName: {
            type: String,
            required: true,
            default: "none",
        },
        subCategoryImage: {
            type: String,
            required: true,
            default: "none",
        },
        categoryID: {
            type: Number,
            required: true,
            default: 0,
        },
    }
);

module.exports = Mongoose.model('SubCategory', subCategorySchema);
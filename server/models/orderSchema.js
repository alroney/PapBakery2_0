const orderSchema = new mongoose.Schema({
    id: {
        type: String,
        lowercase: true,
        unique: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: "users",
    },
    guest: {
        isGuest: {
            type: Boolean,
        },
        email: {
            type: String,
            lowercase: true,
        },
    },
    cart: {
        type: Object,
    },
    subtotal: {
        type: Number,
    },
    tax: {
        type: Number,
    },
    date: {
        type: Date,
        default: Date().now,
    }
});
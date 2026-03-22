let mongoose = require('mongoose');
let reservationSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        }
    }],
    totalAmount: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'cancelled'],
        default: 'pending'
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('reservation', reservationSchema);

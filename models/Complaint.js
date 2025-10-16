const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        category: { type: String, required: true, trim: true },
        subcategory: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        fileUrl: { type: String },
        status: {
            type: String,
            enum: ['Pending', 'Ongoing', 'Action Taken Soon', 'Completed'],
            default: 'Pending',
        },
    },
    { timestamps: true }
);

complaintSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_, ret) => {
        ret.id = ret._id;
        delete ret._id;
    },
});

module.exports = mongoose.model('Complaint', complaintSchema);

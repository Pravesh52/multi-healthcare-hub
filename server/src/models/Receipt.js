import mongoose from 'mongoose';

const receiptSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    receiptNo: { type: String, required: true, unique: true },
    qrData: { type: String, required: true }, // signed string scanned at reception
    pdfUrl: String,
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Receipt', receiptSchema);
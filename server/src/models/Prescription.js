import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, trim: true }, // e.g. "1-0-1"
    duration: { type: String, trim: true }, // e.g. "5 days"
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    diagnosis: { type: String, trim: true, maxlength: 500 },
    medicines: [medicineSchema],
    advice: { type: String, trim: true, maxlength: 1000 },
    followUpDate: String, // YYYY-MM-DD
  },
  { timestamps: true }
);

export default mongoose.model('Prescription', prescriptionSchema);
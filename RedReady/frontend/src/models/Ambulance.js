import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema({
  name: String,
  qty: { type: Number, default: 0 },
  required: { type: Number, default: 1 },
});

const HistorySchema = new mongoose.Schema({
  date: String,
  shift: String,
  by: String,
  time: String,
});

const AmbulanceSchema = new mongoose.Schema(
  {
    name: String,
    code: String,
    lastChecked: String,
    history: [HistorySchema],
    items: [ItemSchema],
  },
  { timestamps: true },
);

export default mongoose.models.Ambulance ||
  mongoose.model("Ambulance", AmbulanceSchema);

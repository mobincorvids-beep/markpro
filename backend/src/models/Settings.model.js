const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed }
});

const Settings = mongoose.model('Settings', settingsSchema);

// Helper to get a setting
Settings.get = async (key, defaultValue = null) => {
  const doc = await Settings.findOne({ key });
  return doc ? doc.value : defaultValue;
};

// Helper to set a setting
Settings.set = async (key, value) => {
  return Settings.findOneAndUpdate(
    { key },
    { value },
    { upsert: true, new: true }
  );
};

module.exports = Settings;

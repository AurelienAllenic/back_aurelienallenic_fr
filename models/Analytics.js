const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  visitorId: { type: String, required: true }, // ID anonymisé (Hash)
  type: { 
    type: String, 
    enum: ['PAGE_VIEW', 'CLICK', 'SECTION_VIEW', 'DURATION'], 
    required: true 
  },
  path: String,          // Ex: /portfolio ou /project/1
  label: String,         // Ex: "CV_Download", "GitHub_Icon", "Project_X"
  metadata: Object,      // Pour stocker le temps (ms) ou la catégorie de projet
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Analytics', AnalyticsSchema);
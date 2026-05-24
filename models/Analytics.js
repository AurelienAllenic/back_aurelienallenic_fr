const mongoose = require('mongoose');
const { getModelConnection } = require('../utils/getModelConnection');

const AnalyticsSchema = new mongoose.Schema({
  visitorId: { type: String, required: true },
  type: {
    type: String,
    enum: ['PAGE_VIEW', 'CLICK', 'SECTION_VIEW', 'DURATION'],
    required: true,
  },
  path: String,
  label: String,
  metadata: Object,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 604800,
  },
});

const getAnalyticsModel = async () => {
  const connection = await getModelConnection();

  if (connection.models.Analytics) {
    return connection.models.Analytics;
  }

  return connection.model('Analytics', AnalyticsSchema);
};

module.exports = getAnalyticsModel;

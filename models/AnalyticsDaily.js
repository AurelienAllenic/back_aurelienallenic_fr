const mongoose = require('mongoose');
const { getModelConnection } = require('../utils/getModelConnection');

const AnalyticsDailySchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  pageViews: {
    type: Number,
    default: 0,
  },
  clicks: {
    type: Map,
    of: Number,
    default: {},
  },
  uniqueVisitors: {
    type: Number,
    default: 0,
  },
  visitorIds: {
    type: [String],
    default: [],
  },
});

const getAnalyticsDailyModel = async () => {
  const connection = await getModelConnection();

  if (connection.models.AnalyticsDaily) {
    return connection.models.AnalyticsDaily;
  }

  return connection.model('AnalyticsDaily', AnalyticsDailySchema);
};

module.exports = getAnalyticsDailyModel;

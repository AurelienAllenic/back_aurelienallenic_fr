const mongoose = require('mongoose');
const { getModelConnection } = require('../utils/getModelConnection');

const MonthlyStatSubSchema = new mongoose.Schema({
  month: { type: Number, required: true },
  pageViews: { type: Number, default: 0 },
  clicks: { type: Map, of: Number, default: {} },
  uniqueVisitors: { type: Number, default: 0 },
  visitorIds: { type: [String], default: [] },
  dailyStats: [{
    date: { type: String, required: true },
    pageViews: { type: Number, default: 0 },
    clicks: { type: Map, of: Number, default: {} },
    uniqueVisitors: { type: Number, default: 0 },
    visitorIds: { type: [String], default: [] },
  }],
}, { _id: false });

const AnalyticsYearlySchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  pageViews: { type: Number, default: 0 },
  clicks: { type: Map, of: Number, default: {} },
  uniqueVisitors: { type: Number, default: 0 },
  visitorIds: { type: [String], default: [] },
  monthlyStats: [MonthlyStatSubSchema],
}, { timestamps: true });

const getAnalyticsYearlyModel = async () => {
  const connection = await getModelConnection();

  if (connection.models.AnalyticsYearly) {
    return connection.models.AnalyticsYearly;
  }

  return connection.model('AnalyticsYearly', AnalyticsYearlySchema);
};

module.exports = getAnalyticsYearlyModel;

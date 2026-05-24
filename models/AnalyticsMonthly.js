const mongoose = require('mongoose');
const { getModelConnection } = require('../utils/getModelConnection');

const DailyStatSubSchema = new mongoose.Schema({
  date: { type: String, required: true },
  pageViews: { type: Number, default: 0 },
  clicks: { type: Map, of: Number, default: {} },
  uniqueVisitors: { type: Number, default: 0 },
  visitorIds: { type: [String], default: [] },
}, { _id: false });

const AnalyticsMonthlySchema = new mongoose.Schema({
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  pageViews: { type: Number, default: 0 },
  clicks: { type: Map, of: Number, default: {} },
  uniqueVisitors: { type: Number, default: 0 },
  visitorIds: { type: [String], default: [] },
  dailyStats: [DailyStatSubSchema],
}, { timestamps: true });

AnalyticsMonthlySchema.index({ year: 1, month: 1 }, { unique: true });

const getAnalyticsMonthlyModel = async () => {
  const connection = await getModelConnection();

  if (connection.models.AnalyticsMonthly) {
    return connection.models.AnalyticsMonthly;
  }

  return connection.model('AnalyticsMonthly', AnalyticsMonthlySchema);
};

module.exports = getAnalyticsMonthlyModel;

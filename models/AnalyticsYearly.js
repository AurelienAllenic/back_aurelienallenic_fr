const mongoose = require('mongoose');

const AnalyticsYearlySchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
      unique: true,
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
    // optionnel : conserver tous les visiteurs uniques de l’année
    visitorIds: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AnalyticsYearly', AnalyticsYearlySchema);
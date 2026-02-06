const mongoose = require('mongoose');

const AnalyticsMonthlySchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number, // 1 à 12
      required: true,
    },
    pageViews: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Map,
      of: Number, // { "nav_linkedin": 150, "nav_github": 80, ... }
      default: {},
    },
    uniqueVisitors: {
      type: Number,
      default: 0,
    },
    // optionnel : conserver la liste des visiteurs uniques du mois
    visitorIds: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

AnalyticsMonthlySchema.index({ year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('AnalyticsMonthly', AnalyticsMonthlySchema);
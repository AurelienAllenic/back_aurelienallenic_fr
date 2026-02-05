const Analytics = require('../models/Analytics');
const AnalyticsDaily = require('../models/AnalyticsDaily');

async function aggregateDailyStats(targetDate = null) {
  try {
    const matchStage = targetDate 
      ? { createdAt: { $gte: new Date(targetDate), $lt: new Date(new Date(targetDate).setDate(new Date(targetDate).getDate() + 1)) } }
      : {};

    // Pipeline d'agrégation ultra-efficace
    const aggregated = await Analytics.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          pageViews: {
            $sum: { $cond: [{ $eq: ["$type", "PAGE_VIEW"] }, 1, 0] }
          },
          clicks: {
            $push: {
              $cond: [
                { $and: [{ $eq: ["$type", "CLICK"] }, { $ne: ["$label", null] }] },
                { k: "$label", v: 1 },
                "$$REMOVE"
              ]
            }
          },
          visitorIds: { $addToSet: "$visitorId" }
        }
      },
      {
        $project: {
          date: "$_id",
          pageViews: 1,
          clicks: { $arrayToObject: "$clicks" },
          uniqueVisitors: { $size: "$visitorIds" },
          visitorIds: 1  // on garde pour merge si besoin
        }
      }
    ]);

    const results = [];

    for (const agg of aggregated) {
      const existing = await AnalyticsDaily.findOne({ date: agg.date });

      let finalPageViews = agg.pageViews;
      let finalClicks = { ...agg.clicks };
      let finalUnique = agg.uniqueVisitors;
      let finalVisitorIds = new Set(agg.visitorIds);

      if (existing) {
        finalPageViews += existing.pageViews || 0;
        Object.entries(existing.clicks || {}).forEach(([label, count]) => {
          finalClicks[label] = (finalClicks[label] || 0) + count;
        });
        (existing.visitorIds || []).forEach(id => finalVisitorIds.add(id));
        finalUnique = finalVisitorIds.size;
      }

      await AnalyticsDaily.findOneAndUpdate(
        { date: agg.date },
        {
          pageViews: finalPageViews,
          clicks: finalClicks,
          uniqueVisitors: finalUnique,
          visitorIds: Array.from(finalVisitorIds)
        },
        { upsert: true }
      );

      results.push({
        date: agg.date,
        pageViews: finalPageViews,
        uniqueVisitors: finalUnique
      });

      console.log(`✅ Aggregated day ${agg.date}`);
    }
    
    await Analytics.deleteMany(matchStage);  // ← décommente seulement si tu veux vraiment purger

    return {
      success: true,
      daysProcessed: results.length,
      details: results
    };

  } catch (error) {
    console.error('❌ Aggregation pipeline error:', error);
    throw error;
  }
}

module.exports = { aggregateDailyStats };
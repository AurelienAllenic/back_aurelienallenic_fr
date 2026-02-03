const Analytics = require('../models/Analytics');
const AnalyticsDaily = require('../models/AnalyticsDaily');

async function aggregateDailyStats(targetDate) {
  try {
    let date;
    if (targetDate) {
      date = new Date(targetDate);
    } else {
      date = new Date();
      date.setDate(date.getDate() - 1);
    }

    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const dateString = date.toISOString().split('T')[0];
    console.log(`📊 Aggregating analytics for ${dateString}...`);

    // 1. Récupérer les événements
    const events = await Analytics.find({
      createdAt: { $gte: date, $lt: nextDay }
    });

    if (events.length === 0) {
      console.log(`ℹ️ Aucun événement pour ${dateString}`);
      return { date: dateString, eventsProcessed: 0 };
    }

    // 2. Calcul des stats
    const pageViews = events.filter(e => e.type === 'PAGE_VIEW').length;
    const clicks = {};
    const visitorIds = new Set();

    events.forEach(event => {
      visitorIds.add(event.visitorId);
      if (event.type === 'CLICK' && event.label) {
        clicks[event.label] = (clicks[event.label] || 0) + 1;
      }
    });

    // 3. Sauvegarder dans la table agrégée (Daily)
    await AnalyticsDaily.findOneAndUpdate(
      { date: dateString },
      {
        pageViews,
        clicks,
        uniqueVisitors: visitorIds.size,
        visitorIds: Array.from(visitorIds)
      },
      { upsert: true, new: true }
    );

    // 4. SUPPRESSION des données brutes
    // On utilise les mêmes filtres de date pour être sûr de ne supprimer que ce qu'on a traité
    const deleteResult = await Analytics.deleteMany({
      createdAt: { $gte: date, $lt: nextDay }
    });

    console.log(`✅ Aggregated ${events.length} events and DELETED ${deleteResult.deletedCount} raw records for ${dateString}`);

    return {
      date: dateString,
      eventsProcessed: events.length,
      deletedCount: deleteResult.deletedCount,
      pageViews,
      uniqueVisitors: visitorIds.size
    };

  } catch (error) {
    console.error('❌ Aggregation error:', error);
    throw error;
  }
}

module.exports = { aggregateDailyStats };
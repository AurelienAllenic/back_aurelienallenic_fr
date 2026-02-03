const Analytics = require('../models/Analytics');
const AnalyticsDaily = require('../models/AnalyticsDaily');

async function aggregateDailyStats(targetDate) {
  try {
    // Si aucune date fournie → on prend HIER (veille) pour le cron
    let date;
    if (targetDate) {
      date = new Date(targetDate);
    } else {
      date = new Date();               // aujourd'hui
      date.setDate(date.getDate() - 1); // → hier
    }

    // Normaliser à minuit (UTC ou local selon ton choix)
    date.setHours(0, 0, 0, 0);

    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const dateString = date.toISOString().split('T')[0]; // "2026-02-03"

    console.log(`📊 Aggregating analytics for ${dateString} (targetDate: ${targetDate ? 'fournie' : 'absente → hier'})...`);

    // Récupérer les événements de cette journée
    const events = await Analytics.find({
      createdAt: {
        $gte: date,
        $lt: nextDay
      }
    });

    if (events.length === 0) {
      console.log(`ℹ️ Aucun événement pour ${dateString}`);
      return {
        date: dateString,
        eventsProcessed: 0,
        pageViews: 0,
        uniqueVisitors: 0,
        clicks: {}
      };
    }

    // Calcul des stats (le reste reste identique)
    const pageViews = events.filter(e => e.type === 'PAGE_VIEW').length;
    const clicks = {};
    const visitorIds = new Set();

    events.forEach(event => {
      visitorIds.add(event.visitorId);
      
      if (event.type === 'CLICK' && event.label) {
        clicks[event.label] = (clicks[event.label] || 0) + 1;
      }
    });

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

    console.log(`✅ Aggregated ${events.length} events for ${dateString}`);
    console.log(`   - ${pageViews} page views`);
    console.log(`   - ${visitorIds.size} unique visitors`);
    console.log(`   - Clicks:`, clicks);

    return {
      date: dateString,
      eventsProcessed: events.length,
      pageViews,
      uniqueVisitors: visitorIds.size,
      clicks
    };
  } catch (error) {
    console.error('❌ Aggregation error:', error);
    throw error;
  }
}

module.exports = { aggregateDailyStats };
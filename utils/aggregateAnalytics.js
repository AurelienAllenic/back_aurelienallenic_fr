const Analytics = require('../models/Analytics');
const AnalyticsDaily = require('../models/AnalyticsDaily');

async function aggregateDailyStats(targetDate) {
  try {
    // Par défaut, agréger hier
    const date = targetDate || new Date();
    date.setDate(date.getDate() - 1);
    date.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const dateString = date.toISOString().split('T')[0]; // "2026-02-03"

    console.log(`📊 Aggregating analytics for ${dateString}...`);

    // Récupérer tous les événements du jour
    const events = await Analytics.find({
      createdAt: {
        $gte: date,
        $lt: nextDay
      }
    });

    if (events.length === 0) {
      console.log('ℹ️ No events to aggregate');
      return;
    }

    // Calculer les stats
    const pageViews = events.filter(e => e.type === 'PAGE_VIEW').length;
    const clicks = {};
    const visitorIds = new Set();

    events.forEach(event => {
      visitorIds.add(event.visitorId);
      
      if (event.type === 'CLICK' && event.label) {
        clicks[event.label] = (clicks[event.label] || 0) + 1;
      }
    });

    // Sauvegarder ou mettre à jour l'agrégation
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
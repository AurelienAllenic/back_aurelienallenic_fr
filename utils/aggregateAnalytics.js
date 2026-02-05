const Analytics = require('../models/Analytics');
const AnalyticsDaily = require('../models/AnalyticsDaily');

async function aggregateDailyStats() {
  try {
    // 1. Récupérer TOUS les événements non agrégés
    const events = await Analytics.find({});

    if (events.length === 0) {
      console.log('ℹ️ Aucun événement à agréger');
      return { 
        eventsProcessed: 0,
        deletedCount: 0,
        message: 'Aucune donnée à agréger'
      };
    }

    // 2. Grouper les événements par date
    const eventsByDate = {};
    
    events.forEach(event => {
      const eventDate = new Date(event.createdAt);
      const dateString = eventDate.toISOString().split('T')[0];
      
      if (!eventsByDate[dateString]) {
        eventsByDate[dateString] = [];
      }
      eventsByDate[dateString].push(event);
    });

    // 3. Agréger chaque jour séparément
    const results = [];
    
    for (const [dateString, dayEvents] of Object.entries(eventsByDate)) {
      const pageViews = dayEvents.filter(e => e.type === 'PAGE_VIEW').length;
      const clicks = {};
      const visitorIds = new Set();

      dayEvents.forEach(event => {
        visitorIds.add(event.visitorId);
        if (event.type === 'CLICK' && event.label) {
          clicks[event.label] = (clicks[event.label] || 0) + 1;
        }
      });

      // 4. Récupérer l'existant pour cette date
      const existing = await AnalyticsDaily.findOne({ date: dateString });
      
      let finalPageViews = pageViews;
      let finalClicks = { ...clicks };
      let finalVisitorIds = new Set(visitorIds);

      if (existing) {
        finalPageViews += existing.pageViews;
        
        if (existing.clicks) {
          existing.clicks.forEach((count, label) => {
            finalClicks[label] = (finalClicks[label] || 0) + count;
          });
        }
        
        (existing.visitorIds || []).forEach(id => finalVisitorIds.add(id));
      }

      // 5. Sauvegarder dans la table agrégée
      await AnalyticsDaily.findOneAndUpdate(
        { date: dateString },
        {
          pageViews: finalPageViews,
          clicks: finalClicks,
          uniqueVisitors: finalVisitorIds.size,
          visitorIds: Array.from(finalVisitorIds)
        },
        { upsert: true, new: true }
      );

      results.push({
        date: dateString,
        eventsProcessed: dayEvents.length,
        pageViews: finalPageViews,
        uniqueVisitors: finalVisitorIds.size
      });

      console.log(`✅ Aggregated ${dayEvents.length} events for ${dateString}`);
    }

    // 6. SUPPRESSION de TOUS les événements bruts
    const deleteResult = await Analytics.deleteMany({});

    console.log(`✅ Total: ${events.length} events aggregated and DELETED from ${results.length} different days`);

    return {
      eventsProcessed: events.length,
      deletedCount: deleteResult.deletedCount,
      daysAggregated: results.length,
      details: results,
      message: 'Aggregation completed successfully'
    };

  } catch (error) {
    console.error('❌ Aggregation error:', error);
    throw error;
  }
}

module.exports = { aggregateDailyStats };
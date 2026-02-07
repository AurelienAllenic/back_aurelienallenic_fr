const Analytics = require('../models/Analytics');
const AnalyticsDaily = require('../models/AnalyticsDaily');
const AnalyticsMonthly = require('../models/AnalyticsMonthly');
const AnalyticsYearly = require('../models/AnalyticsYearly');

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

async function aggregateMonthlyStats(year, month) {
  try {
    const monthString = String(month).padStart(2, '0'); // "02"
    const prefix = `${year}-${monthString}-`; // "2026-02-"

    // 1. Récupérer TOUS les jours du mois
    const days = await AnalyticsDaily.find({
      date: { $regex: `^${prefix}` },
    });

    if (days.length === 0) {
      console.log(`ℹ️ Aucun AnalyticsDaily pour ${year}-${monthString}`);
      return {
        year,
        month,
        daysCount: 0,
        deletedDays: 0,
        message: 'Aucune donnée quotidienne pour ce mois',
      };
    }

    // 2. Agréger les données
    let pageViews = 0;
    const clicks = {};
    const visitorIdsSet = new Set();

    for (const day of days) {
      pageViews += day.pageViews || 0;

      if (day.clicks) {
        // day.clicks est un Map Mongoose
        day.clicks.forEach((count, label) => {
          clicks[label] = (clicks[label] || 0) + count;
        });
      }

      (day.visitorIds || []).forEach((id) => visitorIdsSet.add(id));
    }

    const uniqueVisitors = visitorIdsSet.size;
    const visitorIds = Array.from(visitorIdsSet);

    // 3. Sauvegarder dans AnalyticsMonthly
    const doc = await AnalyticsMonthly.findOneAndUpdate(
      { year, month },
      {
        pageViews,
        clicks,
        uniqueVisitors,
        visitorIds,
      },
      { upsert: true, new: true }
    );

    // 4. SUPPRESSION de TOUS les jours agrégés
    const deleteResult = await AnalyticsDaily.deleteMany({
      date: { $regex: `^${prefix}` },
    });

    console.log(
      `✅ Agrégation mensuelle ${year}-${monthString} : ${days.length} jours, ${pageViews} vues, ${uniqueVisitors} visiteurs uniques`
    );
    console.log(`✅ ${deleteResult.deletedCount} jours supprimés de AnalyticsDaily`);

    return {
      year,
      month,
      daysCount: days.length,
      pageViews,
      uniqueVisitors,
      deletedDays: deleteResult.deletedCount,
      doc,
    };
  } catch (error) {
    console.error('❌ Erreur agrégation mensuelle :', error);
    throw error;
  }
}


async function aggregateYearlyStats(year) {
  try {
    // 1. Récupérer TOUS les mois de l'année
    const months = await AnalyticsMonthly.find({ year });

    if (months.length === 0) {
      console.log(`ℹ️ Aucun AnalyticsMonthly pour ${year}`);
      return {
        year,
        monthsCount: 0,
        deletedMonths: 0,
        message: 'Aucune donnée mensuelle pour cette année',
      };
    }

    // 2. Agréger les données
    let pageViews = 0;
    const clicks = {};
    const visitorIdsSet = new Set();

    for (const m of months) {
      pageViews += m.pageViews || 0;

      if (m.clicks) {
        m.clicks.forEach((count, label) => {
          clicks[label] = (clicks[label] || 0) + count;
        });
      }

      (m.visitorIds || []).forEach((id) => visitorIdsSet.add(id));
    }

    const uniqueVisitors = visitorIdsSet.size;
    const visitorIds = Array.from(visitorIdsSet);

    // 3. Sauvegarder dans AnalyticsYearly
    const doc = await AnalyticsYearly.findOneAndUpdate(
      { year },
      {
        pageViews,
        clicks,
        uniqueVisitors,
        visitorIds,
      },
      { upsert: true, new: true }
    );

    // 4. SUPPRESSION de TOUS les mois agrégés
    const deleteResult = await AnalyticsMonthly.deleteMany({ year });

    console.log(
      `✅ Agrégation annuelle ${year} : ${months.length} mois, ${pageViews} vues, ${uniqueVisitors} visiteurs uniques`
    );
    console.log(`✅ ${deleteResult.deletedCount} mois supprimés de AnalyticsMonthly`);

    return {
      year,
      monthsCount: months.length,
      pageViews,
      uniqueVisitors,
      deletedMonths: deleteResult.deletedCount,
      doc,
    };
  } catch (error) {
    console.error('❌ Erreur agrégation annuelle :', error);
    throw error;
  }
}


module.exports = {
  aggregateDailyStats,
  aggregateMonthlyStats,
  aggregateYearlyStats,
};
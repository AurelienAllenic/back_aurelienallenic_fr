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

    // 2. Calcul des stats des NOUVEAUX événements
    const newPageViews = events.filter(e => e.type === 'PAGE_VIEW').length;
    const newClicks = {};
    const newVisitorIds = new Set();

    events.forEach(event => {
      newVisitorIds.add(event.visitorId);
      if (event.type === 'CLICK' && event.label) {
        newClicks[event.label] = (newClicks[event.label] || 0) + 1;
      }
    });

    // 3. Récupérer les données existantes
    const existingDaily = await AnalyticsDaily.findOne({ date: dateString });

    // 4. Fusionner avec l'existant si présent
    let finalPageViews = newPageViews;
    let finalClicks = { ...newClicks };
    let finalVisitorIds = Array.from(newVisitorIds);

    if (existingDaily) {
      console.log(`🔄 Merging with existing data for ${dateString}`);
      
      // Additionner les pageViews
      finalPageViews += existingDaily.pageViews || 0;

      // Fusionner les clicks
      if (existingDaily.clicks) {
        // Convertir Map Mongoose en objet si nécessaire
        const existingClicksObj = existingDaily.clicks instanceof Map 
          ? Object.fromEntries(existingDaily.clicks) 
          : existingDaily.clicks;
        
        Object.keys(existingClicksObj).forEach(label => {
          finalClicks[label] = (finalClicks[label] || 0) + existingClicksObj[label];
        });
      }

      // Fusionner les visitorIds (éviter les doublons)
      if (existingDaily.visitorIds && Array.isArray(existingDaily.visitorIds)) {
        const combinedSet = new Set([...existingDaily.visitorIds, ...newVisitorIds]);
        finalVisitorIds = Array.from(combinedSet);
      }
    }

    // 5. Sauvegarder dans la table agrégée (Daily)
    await AnalyticsDaily.findOneAndUpdate(
      { date: dateString },
      {
        pageViews: finalPageViews,
        clicks: finalClicks,
        uniqueVisitors: finalVisitorIds.length,
        visitorIds: finalVisitorIds
      },
      { upsert: true, new: true }
    );

    // 6. SUPPRESSION des données brutes
    const deleteResult = await Analytics.deleteMany({
      createdAt: { $gte: date, $lt: nextDay }
    });

    console.log(`✅ Aggregated ${events.length} events (${existingDaily ? 'MERGED' : 'NEW'}) and DELETED ${deleteResult.deletedCount} raw records for ${dateString}`);

    return {
      date: dateString,
      eventsProcessed: events.length,
      deletedCount: deleteResult.deletedCount,
      pageViews: finalPageViews,
      uniqueVisitors: finalVisitorIds.length,
      wasMerged: !!existingDaily
    };

  } catch (error) {
    console.error('❌ Aggregation error:', error);
    throw error;
  }
}

module.exports = { aggregateDailyStats };
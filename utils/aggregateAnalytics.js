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
    console.log('🔍 Step 1: Fetching events...');
    const events = await Analytics.find({
      createdAt: { $gte: date, $lt: nextDay }
    });
    console.log(`✅ Found ${events.length} events`);

    if (events.length === 0) {
      console.log(`ℹ️ Aucun événement pour ${dateString}`);
      return { date: dateString, eventsProcessed: 0 };
    }

    // 2. Calcul des stats
    console.log('🔍 Step 2: Computing stats from events...');
    const pageViews = events.filter(e => e.type === 'PAGE_VIEW').length;
    const clicks = {};
    const visitorIds = new Set();

    events.forEach(event => {
      visitorIds.add(event.visitorId);
      if (event.type === 'CLICK' && event.label) {
        clicks[event.label] = (clicks[event.label] || 0) + 1;
      }
    });
    console.log(`✅ Computed: ${pageViews} pageViews, ${Object.keys(clicks).length} click types, ${visitorIds.size} visitors`);
    console.log('📦 New clicks object:', JSON.stringify(clicks));

    // 3. Récupérer l'existant
    console.log('🔍 Step 3: Fetching existing daily record...');
    const existing = await AnalyticsDaily.findOne({ date: dateString });
    console.log('📦 Existing found:', !!existing);
    
    if (existing) {
      console.log('📦 Existing pageViews:', existing.pageViews);
      console.log('📦 Existing clicks type:', typeof existing.clicks, existing.clicks instanceof Map);
      console.log('📦 Existing clicks keys:', existing.clicks ? Array.from(existing.clicks.keys()) : 'none');
    }

    // 4. Préparer les données finales (AJOUT et non remplacement)
    console.log('🔍 Step 4: Merging data...');
    let finalPageViews = pageViews;
    let finalClicks = { ...clicks };
    let finalVisitorIds = new Set(visitorIds);

    if (existing) {
      console.log('🔄 Merging with existing data...');
      
      // AJOUTER au lieu de remplacer
      finalPageViews += existing.pageViews;
      console.log(`✅ Merged pageViews: ${pageViews} + ${existing.pageViews} = ${finalPageViews}`);
      
      // Convertir la Map Mongoose en objet simple
      if (existing.clicks) {
        console.log('🔄 Processing existing clicks...');
        existing.clicks.forEach((count, label) => {
          console.log(`  Adding click: ${label} = ${count}`);
          finalClicks[label] = (finalClicks[label] || 0) + count;
        });
      }
      console.log('📦 Final clicks after merge:', JSON.stringify(finalClicks));
      
      (existing.visitorIds || []).forEach(id => finalVisitorIds.add(id));
      console.log(`✅ Merged visitorIds: ${finalVisitorIds.size} unique visitors`);
    }

    // 5. Sauvegarder dans la table agrégée (Daily)
    console.log('🔍 Step 5: Saving to database...');
    console.log('📦 Data to save:', {
      date: dateString,
      pageViews: finalPageViews,
      clicks: finalClicks,
      uniqueVisitors: finalVisitorIds.size,
      visitorIdsCount: Array.from(finalVisitorIds).length
    });
    
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
    console.log('✅ Saved to AnalyticsDaily');

    // 6. SUPPRESSION des données brutes
    console.log('🔍 Step 6: Deleting raw events...');
    const deleteResult = await Analytics.deleteMany({
      createdAt: { $gte: date, $lt: nextDay }
    });
    console.log(`✅ Deleted ${deleteResult.deletedCount} raw records`);

    console.log(`✅ Aggregated ${events.length} events and DELETED ${deleteResult.deletedCount} raw records for ${dateString}`);

    return {
      date: dateString,
      eventsProcessed: events.length,
      deletedCount: deleteResult.deletedCount,
      pageViews: finalPageViews,
      uniqueVisitors: finalVisitorIds.size
    };

  } catch (error) {
    console.error('❌ Aggregation error:', error);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
}

module.exports = { aggregateDailyStats };
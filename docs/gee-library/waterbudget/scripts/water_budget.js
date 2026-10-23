/*******************************************************************************
 * PROJECT: WATER BUDGET AND STORAGE-CHANGE ANALYSIS
 * PLATFORM: Google Earth Engine Code Editor
 * LANGUAGE: JavaScript
 *
 * WATER-BUDGET EQUATION
 *   P = ET + Q + dS
 *   dS_budget = P - ET - Q
 *
 * VARIABLES
 *   P          Precipitation (mm)
 *   ET         Evapotranspiration (mm)
 *   Q          Surface + subsurface runoff (mm)
 *   dS_budget  Budget-derived storage change (mm)
 *   dS_gldas   GLDAS storage change (mm)
 *   closure    Difference between the two storage estimates (mm)
 *
 * DATASETS
 *   Precipitation: CHIRPS Daily
 *   ET: MODIS MOD16A2GF or TerraClimate AET
 *   Runoff/storage: GLDAS-2.1 NOAH
 *
 * OUTPUTS
 *   Monthly/annual/climatology tables, charts, mean-annual maps,
 *   CSV exports, and a GeoTIFF export.
 *
 * HOW TO USE
 *   1. Replace the example AOI with your basin.
 *   2. Set START_YEAR, END_YEAR, and ET_SOURCE.
 *   3. Run the script and start export tasks in the Tasks panel.
 *
 * IMPORTANT
 *   Verify dataset units, temporal aggregation, and boundary-date coverage
 *   before interpreting the results scientifically.
 *
 * Author: Godwin Ebo Fosu
 ******************************************************************************/

// ============================ 1. SETTINGS ====================================

// Example AOI. Replace with your basin, or use an Earth Engine asset:
// var aoi = ee.FeatureCollection('projects/your-project/assets/basin').geometry();
var aoi = ee.Geometry.Rectangle([0.25, 6.35, 0.70, 6.85]);

var START_YEAR = 2015;
var END_YEAR   = 2020;        // GLDAS needs data through the next year boundary
var ET_SOURCE  = 'MODIS';     // 'MODIS' or 'TERRACLIMATE'
var ANALYSIS_SCALE = 1000;    // metres for basin averaging

Map.centerObject(aoi, 9);

var nYears  = END_YEAR - START_YEAR + 1;
var nMonths = nYears * 12;
var startDate = ee.Date.fromYMD(START_YEAR, 1, 1);

// ============================ 2. DATASETS ====================================

var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
  .select('precipitation');

var gldas = ee.ImageCollection('NASA/GLDAS/V021/NOAH/G025/T3H')
  .filterDate(START_YEAR + '-01-01', (END_YEAR + 1) + '-01-02');

// MODIS ET: scale factor 0.1. This converts each 8-day composite total
// into an approximate daily rate; validate the final composite duration.
var modisDaily = ee.ImageCollection('MODIS/061/MOD16A2GF')
  .filterDate(START_YEAR + '-01-01', (END_YEAR + 1) + '-01-01')
  .select('ET')
  .map(function (img) {
    var t0 = ee.Date(img.get('system:time_start'));
    var nextYear = ee.Date.fromYMD(t0.get('year').add(1), 1, 1);
    var days = ee.Number(8).min(nextYear.difference(t0, 'day'));
    return img.multiply(0.1).divide(days)
      .rename('ET_day')
      .toFloat()
      .set('system:time_start', t0.millis());
  });

var terra = ee.ImageCollection('IDAHO_EPSCOR/TERRACLIMATE')
  .select('aet');

// ============================ 3. HELPERS =====================================

// Total selected GLDAS water storage components (mm = kg/m2)
function storage(img) {
  return img.select('SoilMoi0_10cm_inst')
    .add(img.select('SoilMoi10_40cm_inst'))
    .add(img.select('SoilMoi40_100cm_inst'))
    .add(img.select('SoilMoi100_200cm_inst'))
    .add(img.select('SWE_inst'))
    .add(img.select('CanopInt_inst'))
    .rename('S')
    .toFloat();
}

// First 3-hourly GLDAS image at/after a date (00:00 UTC).
// Confirm that an image exists at the requested boundary date.
function gldasAt(date) {
  return ee.Image(gldas.filterDate(date, date.advance(3, 'hour')).first());
}

// ============================ 4. MONTHLY WATER BUDGET ========================

function monthlyBudget(i) {
  i = ee.Number(i);
  var start = startDate.advance(i, 'month');
  var end   = start.advance(1, 'month');
  var daysInMonth = end.difference(start, 'day');

  // Precipitation (mm/month)
  var P = chirps.filterDate(start, end).sum().rename('P').toFloat();

  // ET (mm/month). Confirm source-specific scale factors and aggregation.
  var ET;
  if (ET_SOURCE === 'MODIS') {
    ET = modisDaily.filterDate(start, end).mean()
      .multiply(daysInMonth).rename('ET').toFloat();
  } else {
    // TerraClimate AET is typically scaled by 0.1; verify current catalog docs.
    ET = ee.Image(terra.filterDate(start, end).first())
      .multiply(0.1).rename('ET').toFloat();
  }

  // GLDAS runoff: inspect band units and temporal accumulation semantics.
  var qSum = gldas.filterDate(start, end)
    .select(['Qs_acc', 'Qsb_acc']).sum();
  var Q = qSum.select('Qs_acc').add(qSum.select('Qsb_acc'))
    .rename('Q').toFloat();

  // Storage change between interval boundaries.
  var dSgldas = storage(gldasAt(end)).subtract(storage(gldasAt(start)))
    .rename('dS_gldas').toFloat();

  // Use ET's valid pixels for all components.
  var valid = ET.mask();
  P = P.updateMask(valid);
  Q = Q.updateMask(valid);
  dSgldas = dSgldas.updateMask(valid);

  var dSbudget = P.subtract(ET).subtract(Q).rename('dS_budget').toFloat();
  var closure  = dSbudget.subtract(dSgldas).rename('closure').toFloat();

  return ee.Image.cat([P, ET, Q, dSbudget, dSgldas, closure])
    .set({
      'system:time_start': start.millis(),
      'year': start.get('year'),
      'month': start.get('month')
    });
}

var monthlyCol = ee.ImageCollection.fromImages(
  ee.List.sequence(0, nMonths - 1).map(monthlyBudget)
);

// ============================ 5. BASIN AVERAGES ==============================

function basinMean(img) {
  return img.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: aoi,
    scale: ANALYSIS_SCALE,
    maxPixels: 1e13,
    bestEffort: true
  });
}

// Monthly table
var monthlyFC = monthlyCol.map(function (img) {
  return ee.Feature(null, basinMean(img)).set({
    'date': ee.Date(img.get('system:time_start')).format('YYYY-MM'),
    'system:time_start': img.get('system:time_start'),
    'year': img.get('year'),
    'month': img.get('month')
  });
});

// Annual table (sum of monthly image values)
var annualFC = ee.FeatureCollection(
  ee.List.sequence(START_YEAR, END_YEAR).map(function (y) {
    var img = monthlyCol.filter(ee.Filter.eq('year', y)).sum();
    return ee.Feature(null, basinMean(img))
      .set('year', ee.Number(y).format('%d'));
  })
);

// Monthly climatology (mean of each calendar month)
var climFC = ee.FeatureCollection(
  ee.List.sequence(1, 12).map(function (m) {
    var img = monthlyCol.filter(ee.Filter.eq('month', m)).mean();
    return ee.Feature(null, basinMean(img))
      .set('month', ee.Number(m).format('%02d'));
  })
);

// ============================ 6. CHARTS & PRINTS =============================

print('Basin area (km2)', aoi.area(1).divide(1e6));
print('Annual water budget (mm/yr)', annualFC);

print(ui.Chart.feature.byFeature(monthlyFC, 'date', ['P', 'ET', 'Q'])
  .setChartType('LineChart')
  .setOptions({
    title: 'Monthly P, ET and Q (basin mean)',
    vAxis: {title: 'mm / month'},
    hAxis: {title: 'Month', slantedText: true},
    lineWidth: 2,
    pointSize: 0
  }));

print(ui.Chart.feature.byFeature(annualFC, 'year', ['P', 'ET', 'Q', 'dS_budget'])
  .setChartType('ColumnChart')
  .setOptions({
    title: 'Annual water budget components',
    vAxis: {title: 'mm / year'},
    hAxis: {title: 'Year'}
  }));

print(ui.Chart.feature.byFeature(climFC, 'month', ['P', 'ET', 'Q'])
  .setChartType('ColumnChart')
  .setOptions({
    title: 'Mean monthly climatology',
    vAxis: {title: 'mm / month'},
    hAxis: {title: 'Month'}
  }));

print(ui.Chart.feature.byFeature(monthlyFC, 'date',
  ['dS_budget', 'dS_gldas', 'closure'])
  .setChartType('LineChart')
  .setOptions({
    title: 'Storage change: budget vs GLDAS and closure error',
    vAxis: {title: 'mm / month'},
    hAxis: {title: 'Month', slantedText: true},
    lineWidth: 2,
    pointSize: 0
  }));

// ============================ 7. MAPS ========================================

// Mean annual values over the analysis period (mm/year)
var meanAnnual = monthlyCol.select(['P', 'ET', 'Q', 'dS_budget'])
  .sum().divide(nYears).clip(aoi);

Map.addLayer(meanAnnual.select('P'),
  {min: 800, max: 1600,
   palette: ['#ffffd9', '#7fcdbb', '#1d91c0', '#081d58']},
  'Mean annual P (mm)');

Map.addLayer(meanAnnual.select('ET'),
  {min: 500, max: 1400,
   palette: ['#ffffe5', '#addd8e', '#31a354', '#004529']},
  'Mean annual ET (mm)', false);

Map.addLayer(meanAnnual.select('Q'),
  {min: 0, max: 400,
   palette: ['#f7fbff', '#6baed6', '#08306b']},
  'Mean annual Q (mm)', false);

Map.addLayer(meanAnnual.select('dS_budget'),
  {min: -100, max: 600,
   palette: ['#d73027', '#ffffbf', '#1a9850']},
  'Mean annual P-ET-Q (mm)', false);

Map.addLayer(ee.Image().byte().paint(aoi, 0, 2),
  {palette: 'black'}, 'AOI');

// ============================ 8. EXPORTS =====================================

Export.table.toDrive({
  collection: monthlyFC,
  description: 'WaterBudget_monthly',
  folder: 'GEE_WaterBudget',
  fileFormat: 'CSV',
  selectors: [
    'date', 'year', 'month', 'P', 'ET', 'Q',
    'dS_budget', 'dS_gldas', 'closure'
  ]
});

Export.table.toDrive({
  collection: annualFC,
  description: 'WaterBudget_annual',
  folder: 'GEE_WaterBudget',
  fileFormat: 'CSV',
  selectors: ['year', 'P', 'ET', 'Q', 'dS_budget', 'dS_gldas', 'closure']
});

Export.image.toDrive({
  image: meanAnnual.toFloat(),
  description: 'WaterBudget_mean_annual_maps',
  folder: 'GEE_WaterBudget',
  region: aoi,
  scale: 1000,
  maxPixels: 1e13
});

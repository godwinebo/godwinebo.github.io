# Water Budget and Storage-Change Analysis

<div class="gee-project-intro" markdown>

**Google Earth Engine · JavaScript · Hydrology · Remote Sensing**

A basin-scale workflow for estimating the water budget and comparing budget-derived storage change with storage change estimated from GLDAS.

[View JavaScript source](scripts/water_budget.js){ .md-button .md-button--primary }
[Explore the workflow](#1-overview){ .md-button }

</div>

## 1. Overview

The water budget describes how precipitation, evapotranspiration, runoff, and changes in water storage relate over a defined area and time interval.

The workflow calculates:

\[
\Delta S_{\text{budget}} = P - ET - Q
\]

It then compares the budget-derived storage change with an independent estimate based on changes in GLDAS storage variables:

\[
\text{Closure error} = \Delta S_{\text{budget}} - \Delta S_{\text{GLDAS}}
\]

A nonzero closure error indicates disagreement between the two estimates. It can reflect measurement uncertainty, model limitations, spatial or temporal mismatches, missing data, and omitted processes.

## 2. Datasets

| Component | Dataset | Purpose |
|---|---|---|
| Precipitation | [CHIRPS Daily](https://developers.google.com/earth-engine/datasets/catalog/UCSB-CHG_CHIRPS_DAILY) | Precipitation accumulation |
| Evapotranspiration | [MODIS MOD16A2GF](https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD16A2GF) | Gap-filled MODIS evapotranspiration |
| Alternative ET | [TerraClimate](https://developers.google.com/earth-engine/datasets/catalog/IDAHO_EPSCOR_TERRACLIMATE) | Actual evapotranspiration |
| Runoff and storage | [GLDAS-2.1 NOAH](https://developers.google.com/earth-engine/datasets/catalog/NASA_GLDAS_V021_NOAH_G025_T3H) | Surface and subsurface runoff, soil moisture, snow, and canopy water |

## 3. Workflow

1. Define the area of interest and analysis period.
2. Load and preprocess the precipitation, ET, and GLDAS datasets.
3. Aggregate the selected components to monthly intervals.
4. Estimate storage change from the water-budget equation.
5. Calculate GLDAS-based storage change and closure error.
6. Generate basin-average monthly, annual, and climatological summaries.
7. Visualize mean annual water-budget components.
8. Export summary tables and raster outputs to Google Drive.

## 4. Outputs

- Monthly water-budget table in CSV format.
- Annual water-budget summary.
- Monthly climatology.
- Time-series charts for precipitation, ET, runoff, and storage change.
- Mean annual water-budget raster layers.
- CSV and GeoTIFF export tasks.

## 5. Configuration

The supplied script uses a rectangular example study area and the 2015–2020 analysis period. Replace the example geometry with your study basin before interpreting results.

The evapotranspiration source can be set to `MODIS` or `TERRACLIMATE`.

## 6. JavaScript source code

The complete JavaScript file is available [as a separate file](scripts/water_budget.js) and is shown below. Use the copy button on the code block to copy it into the [Google Earth Engine Code Editor](https://code.earthengine.google.com/).

```javascript
--8<-- "gee-library/waterbudget/scripts/water_budget.js"
```

## 7. Important limitations

- **Spatial resolution:** CHIRPS, MODIS, TerraClimate, and GLDAS have different spatial resolutions. A common analysis scale does not make their native resolutions equivalent.
- **Temporal aggregation:** The MODIS ET conversion and monthly aggregation should be validated against the composite timing and scale factors.
- **Runoff units:** Verify the GLDAS runoff-band units and temporal accumulation semantics before interpreting monthly sums as millimetres.
- **Storage change:** Storage differences require valid observations at the intended interval boundaries. Missing or masked observations can affect the result.
- **Water-budget assumptions:** The simplified equation does not explicitly represent every possible inflow, outflow, or storage process.

Treat the outputs as model-based estimates and assess their uncertainty before using them for operational water-resource decisions.

## 8. Reproducibility

Run the script in the Google Earth Engine Code Editor after configuring the study area and analysis period. Export tasks must be started and completed in the Earth Engine Tasks panel.

---

**Author:** Godwin Ebo Fosu  
**Focus:** Geospatial Science, Hydrology, Remote Sensing, and Climate Resilience

[Back to the GEE Library](../index.md){ .md-button }

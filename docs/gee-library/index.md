# Google Earth Engine Code Library

<div class="gee-library-intro" markdown>

Explore practical Google Earth Engine workflows for hydrology, land management, and environmental monitoring. Each project includes its purpose, data sources, key assumptions, outputs, and JavaScript source code.

</div>

## Workflows

<div class="grid" markdown>

<div class="project-card" markdown>

### Water Budget and Storage Change

Estimate precipitation, evapotranspiration, runoff, and storage change, then compare the water-budget estimate with GLDAS.

`Hydrology` `CHIRPS` `MODIS` `GLDAS`

[Explore workflow](waterbudget/water-budget.md){ .md-button .md-button--primary }
</div>

<div class="project-card" markdown>

### RUSLE Soil Loss and Erosion Risk

Estimate potential annual soil loss using rainfall, soil, terrain, land-cover, and support-practice factors.

`Soil erosion` `RUSLE` `CHIRPS` `Sentinel-2`

[Explore workflow](rulse/gee-library/rusle-soil-loss.md){ .md-button .md-button--primary }
</div>

</div>

## Using the scripts

1. Open a workflow and review its datasets, settings, and limitations.
2. Open the JavaScript source link or expand the code section and copy the script.
3. Paste the code into the [Google Earth Engine Code Editor](https://code.earthengine.google.com/).
4. Configure the area of interest and other settings before running it.
5. Start any requested exports from the Earth Engine **Tasks** panel.

These scripts are starting points for analysis, not validated products. Check dataset units, parameter choices, and results against local evidence before drawing conclusions.

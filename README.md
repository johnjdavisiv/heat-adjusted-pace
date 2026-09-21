# Calculate pace adjustments for running workouts in heat and humidity

>By John J. Davis

Front-end UI and back-end calculations for estimating a "heat-adjusted pace" for marathons and long workouts (for example, long tempo runs) in hot or humid conditions.  

Heat/humidity adjustments are calculated based on a statistical model fit to marathon performances from 3,891 runners competing in 754 different marathon events reported in [Mantzios et al., Med Sci Sports Exerc. 2022;54(1):151](https://pubmed.ncbi.nlm.nih.gov/34652333/)  

[See the live app here](https://apps.runningwritings.com/heat-adjusted-pace/)

## Build and deploy

```
npm run build      # stamps this app's own css/js with today's date, then assembles dist/ (exactly the upload set)
```

Deploy = upload the contents of `dist/` to the SiteGround path the build prints. The build fails if a referenced asset is missing, if a page points at a file that is not in `dist/`, or if a `?v=dev` stamp is left. `tools/build-dist.mjs` and `tools/stamp.mjs` are byte-identical across the RW web apps; this app's file list is `rwBuild` in `package.json`.

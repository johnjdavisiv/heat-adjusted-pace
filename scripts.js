// "Load" parameters for the heat/humidity 
const tempModParams = {
  "air_temp_c": [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45],
  "humidity_pct": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
  "logspeed_adjust": [-0.0057, -0.0017, 0, -0.0001, -0.0019, -0.0032, -0.004, -0.0047, -0.0053, -0.006, -0.0057, -0.0017, 0, -0.0001, -0.0042, -0.0073, -0.0097, -0.012, -0.0143, -0.0166, -0.0057, -0.0017, 0, -0.0001, -0.0059, -0.0111, -0.0156, -0.02, -0.0243, -0.0287, -0.0057, -0.0017, 0, -0.0001, -0.0069, -0.0145, -0.0218, -0.0289, -0.0361, -0.0433, -0.0057, -0.0017, 0, -0.0001, -0.0082, -0.0181, -0.0284, -0.0386, -0.0489, -0.0591, -0.0057, -0.0017, 0, -0.0003, -0.0104, -0.0225, -0.0356, -0.0488, -0.062, -0.0752, -0.0057, -0.0017, 0, -0.0015, -0.0123, -0.027, -0.0437, -0.0608, -0.0778, -0.0948, -0.0057, -0.0017, 0, -0.0017, -0.0129, -0.031, -0.053, -0.0756, -0.0982, -0.1208, -0.0057, -0.0017, 0, -0.0017, -0.0129, -0.0346, -0.0629, -0.0921, -0.1214, -0.1507, -0.006, -0.0018, 0, -0.0017, -0.0129, -0.0382, -0.0729, -0.1089, -0.145, -0.1811, -0.008, -0.0036, -0.0001, -0.0017, -0.0129, -0.0418, -0.0828, -0.1258, -0.1687, -0.2116]
}
// (this is the coarse version, use fine for production)


// Heat index grid (different!) -- uses "NOAA 2014" scheme for heat index calculations

const heatIndexModParams = {
  "heat_index_noaa_2014": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45],
  "logspeed_adjust": [-0.0043, -0.0037, -0.003, -0.0024, -0.0018, -0.0012, -0.0007, -0.0003, -0.0001, 0, -0.0002, -0.0006, -0.0013, -0.0022, -0.0035, -0.0049, -0.0066, -0.0084, -0.0104, -0.0124, -0.0146, -0.0167, -0.0189, -0.0211, -0.0234, -0.0257, -0.028, -0.0305, -0.033, -0.0355, -0.0382, -0.0409, -0.0437, -0.0466, -0.0496, -0.0526, -0.0556, -0.0587, -0.0618, -0.0649, -0.068, -0.0711, -0.0742, -0.0773, -0.0804, -0.0835]
}



// Note this is more of a classic lookup table, like expand.grid() in R
// Will want to do an interpolation strategy

// "Simple" linear interpolation
function create1DInterpolationLookup(dataObject, opts = {}) {
  // Extract options with defaults
  const { 
    extrapolate = false,
    xKey = 'heat_index_noaa_2014', 
    yKey = 'logspeed_adjust' 
  } = opts;
  
  // Extract and validate the data arrays
  const xValues = dataObject[xKey];
  const yValues = dataObject[yKey];
  
  if (!xValues || !yValues) {
    throw new Error(`Missing required keys: ${xKey} or ${yKey}`);
  }
  
  if (xValues.length !== yValues.length) {
    throw new Error('X and Y arrays must have the same length');
  }
  
  if (xValues.length < 2) {
    throw new Error('Need at least 2 data points for interpolation');
  }
  
  // Return the lookup function with extrapolation setting baked in
  return function lookup(x) {
    const minX = xValues[0];
    const maxX = xValues[xValues.length - 1];
    
    // Check bounds if extrapolation is not allowed
    if (!extrapolate) {
      if (x < minX || x > maxX) {
        throw new Error(`Value ${x} is out of bounds [${minX}, ${maxX}]. Enable extrapolation in options to extrapolate.`);
      }
    }
    
    // Find the two points to interpolate between
    let i = 0;
    
    // Handle exact matches and find interpolation interval
    for (i = 0; i < xValues.length; i++) {
      if (x === xValues[i]) {
        return yValues[i]; // Exact match
      }
      if (x < xValues[i]) {
        break;
      }
    }
    
    // Handle edge cases for extrapolation
    if (i === 0) {
      // Extrapolate using first two points
      i = 1;
    } else if (i === xValues.length) {
      // Extrapolate using last two points
      i = xValues.length - 1;
    }
    
    // Get the two points for interpolation
    const x1 = xValues[i - 1];
    const x2 = xValues[i];
    const y1 = yValues[i - 1];
    const y2 = yValues[i];
    
    // Linear interpolation formula: y = y1 + (x - x1) * (y2 - y1) / (x2 - x1)
    const interpolatedValue = y1 + (x - x1) * (y2 - y1) / (x2 - x1);
    
    return interpolatedValue;
  };
}


/**
 * Bilinear interpolator over a rectilinear grid with renamed columns.
 * Columns:
 *  - air_temp_c[]       (x-axis)
 *  - humidity_pct[]     (y-axis, 0–100)
 *  - logspeed_adjust[]  (z value at each (air_temp_c, humidity_pct))
 *
 * @param {{air_temp_c:number[], humidity_pct:number[], logspeed_adjust:number[]}} table
 * @param {{extrapolate?: boolean}} [opts]  // default false; clamps to edges
 * @returns {(tC:number, hPct:number)=>number}
 */
function createLogspeedAdjustInterpolator(table, opts = {}) {
  const { extrapolate = false } = opts;
  const { air_temp_c, humidity_pct, logspeed_adjust } = table;

  if (
    air_temp_c.length !== humidity_pct.length ||
    air_temp_c.length !== logspeed_adjust.length
  ) throw new Error("air_temp_c, humidity_pct, logspeed_adjust must have same length.");

  const xVals = Array.from(new Set(air_temp_c)).sort((a, b) => a - b);    // temps
  const yVals = Array.from(new Set(humidity_pct)).sort((a, b) => a - b);   // humidity

  if (xVals.length < 2 || yVals.length < 2) {
    throw new Error("Need at least two unique air_temp_c and humidity_pct values.");
  }

  // Map "(x|y)" -> z
  const val = new Map();
  for (let i = 0; i < air_temp_c.length; i++) {
    val.set(`${air_temp_c[i]}|${humidity_pct[i]}`, logspeed_adjust[i]);
  }
  // Ensure full grid exists
  for (const xv of xVals) for (const yv of yVals) {
    if (!val.has(`${xv}|${yv}`)) throw new Error(`Missing value at (${xv}°C, ${yv}%).`);
  }

  const getZij = (ix, iy) => {
    const key = `${xVals[ix]}|${yVals[iy]}`;
    const v = val.get(key);
    if (v === undefined) throw new Error(`No value at (${xVals[ix]}, ${yVals[iy]}).`);
    return v;
  };

  // Return [i0, i1, t] with arr[i0] <= q <= arr[i1], t in ℝ (clamped later if needed)
  function bracket(arr, q) {
    const n = arr.length;
    if (q <= arr[0]) {
      if (!extrapolate && q < arr[0]) q = arr[0];
      return [0, 1, (q - arr[0]) / (arr[1] - arr[0])];
    }
    if (q >= arr[n - 1]) {
      if (!extrapolate && q > arr[n - 1]) q = arr[n - 1];
      return [n - 2, n - 1, (q - arr[n - 2]) / (arr[n - 1] - arr[n - 2])];
    }
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] >= q) hi = mid; else lo = mid;
    }
    const t = (q - arr[lo]) / (arr[hi] - arr[lo]);
    return [lo, hi, t];
  }

  return function interp(tC, hPct) {
    const [ix0, ix1, txRaw] = bracket(xVals, tC);
    const [iy0, iy1, tyRaw] = bracket(yVals, hPct);
    const tx = extrapolate ? txRaw : Math.max(0, Math.min(1, txRaw));
    const ty = extrapolate ? tyRaw : Math.max(0, Math.min(1, tyRaw));

    const z11 = getZij(ix0, iy0); // (x0,y0)
    const z21 = getZij(ix1, iy0); // (x1,y0)
    const z12 = getZij(ix0, iy1); // (x0,y1)
    const z22 = getZij(ix1, iy1); // (x1,y1)

    // Bilinear interpolation: first along x at each y, then along y
    const a = z11 * (1 - tx) + z21 * tx;
    const b = z12 * (1 - tx) + z22 * tx;
    return a * (1 - ty) + b * ty;
  };
}


// Testing

console.log('Testing real table')
const heatHumidityLookup = createLogspeedAdjustInterpolator(tempModParams, { extrapolate: true });
console.log(heatHumidityLookup(8, 0)); // real tests




// Create lookup function WITH extrapolation
const heatIndexLookup = create1DInterpolationLookup(heatIndexModParams, { extrapolate: true });
console.log(heatIndexLookup(25.5)); // Works - within bounds  
console.log(heatIndexLookup(50));   // Works - extrapolates beyond 45
console.log(heatIndexLookup(-5));   // Works - extrapolates below 0

console.log(heatIndexLookup(8));   // Works - extrapolates below 0


// Actual scripts 





// ----- Reading speed from digits
function readCurrentSpeed(){
  // Pace mode
  if (pace_or_speed == "pace") {
      // read mm:ss
      var minute_val = parseInt(d1.textContent)
      var sec_val = 10*parseInt(d2.textContent) + parseInt(d3.textContent)
      var dec_minutes = minute_val + sec_val/60

      const pace_units = document.querySelector('#pace-units').textContent

      if (pace_units == "/mi"){
          //Convert to m/s
          input_m_s = 1609.344/(60*dec_minutes)
      } else if (pace_units == "/km"){
          //Convert to m/s
          input_m_s = 1000/(60*dec_minutes)
      }

  // Speed mode
  } else if (pace_or_speed == "speed") {
      const speed_units = document.querySelector('#speed-units').textContent
      //speed changes
      var dec_speed = parseInt(s1.textContent) + parseInt(s2.textContent)/10

          if (speed_units == "mph"){
          //Convert to m/s
          input_m_s = dec_speed*1609.344/3600
      } else if (speed_units == "km/h"){
          //Convert to m/s
          input_m_s = dec_speed*1000/3600
      } else if (speed_units == "m/s"){
          input_m_s = dec_speed // lol
      }
  }
}

function decimal_pace_to_string(pace_decimal){
    let pace_min = Math.floor(pace_decimal)
    //Could be zero!! 
    let pace_sec = (pace_decimal - pace_min)*60
    //e.g. 9.50 --> 30 

    //Deal with e.g. 3:59.9 --> 4:00.0
    if (Math.round(pace_sec) === 60) {
        pace_sec = 0
        pace_min = pace_min+1;
    } else {
        pace_sec = Math.round(pace_sec);
    }
    //To formatted string
    res = `${pace_min}:${pace_sec.toString().padStart(2,'0')}` 
    return res
}


/// m/s output to string
let conv_dec 

const convert_dict = {
    // functions to convert m/s to [output unit, as key]
    '/mi':function (m_s){
        // to decimal minutes per mile
        conv_dec = 1609.344/(m_s*60)
        return decimal_pace_to_string(conv_dec);
    },
    '/km':function (m_s){
        // to decimal minutes per km
        conv_dec = 1000/(m_s*60)
        return decimal_pace_to_string(conv_dec);
    },
    'mph':function (m_s){
        conv_dec = m_s*2.23694
        return conv_dec.toFixed(1);
    },
    'km/h':function (m_s){
        conv_dec = m_s*3.6
        return conv_dec.toFixed(1);
    },
    'm/s':function (m_s){
        // ez mode lol
        return m_s.toFixed(2);
    }
}
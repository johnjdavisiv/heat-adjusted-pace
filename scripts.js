// John J Davis, RunningWritings.com


const RUNNER_SPEED_DEFAULT = 3.83176 // 7:00/mi
const DEFAULT_OUTPUT_SPEED_M_S = 3.915669 // fix later once you do calcs


const TEMP_MAX_VALUE_F = 120
const TEMP_MIN_VALUE_F = 10

const TEMP_MIN_VALUE_C = -10
const TEMP_MAX_VALUE_C = 48

const HUMIDITY_MIN_VALUE = 0
const HUMIDITY_MAX_VALUE = 100 //duh

const DEW_POINT_MIN_VALUE = -40
// no max value because it's dependent on the temperature!
// i.e. max dew point = current temp


const INITIAL_HEAT_INDEX_F = 75
const INITIAL_TEMP_F = 75
const INITIAL_DEWPOINT_F = 60
const INITIAL_HUMIDITY = 50


let output_speed_ms = DEFAULT_OUTPUT_SPEED_M_S
let input_m_s = RUNNER_SPEED_DEFAULT // just read it first time from pace dials
let pace_or_speed = "pace"
let units_mode = "usa"
let effort_mode = false

let temperature_mode = "F"
let heat_mode = "heat-index"

let inner_temp_c = tempFtoC(INITIAL_TEMP_F) // keep an inner temperature for lookups
let inner_humidity_pct = INITIAL_HUMIDITY
let inner_heat_index_c = tempFtoC(INITIAL_HEAT_INDEX_F) // ditto
let inner_dewpoint_c = tempFtoC(INITIAL_DEWPOINT_F)
// hmmm need to update these...


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



// Calculate RH from dewpoint and temp - Magnus approximation
function calculateRelativeHumidity(tempC, dewPointC) {
  // Input validation
  if (typeof tempC !== 'number' || typeof dewPointC !== 'number') {
    throw new Error('Temperature and dew point must be numbers');
  }
  
  if (dewPointC > tempC) {
    throw new Error('Dew point cannot be higher than temperature');
  }
  
  // Magnus formula constants (valid for -45°C to 60°C)
  const a = 17.625;
  const b = 243.04;
  
  // Helper function to calculate saturation vapor pressure
  const saturationVaporPressure = (t) => {
    const gamma = (a * t) / (b + t);
    return 6.112 * Math.exp(gamma);
  };
  
  // Calculate relative humidity
  const e_s = saturationVaporPressure(tempC);
  const e = saturationVaporPressure(dewPointC);
  const relativeHumidity = (e / e_s) * 100;
  
  // Ensure RH is within valid bounds (0-100%)
  return Math.min(100, Math.max(0, relativeHumidity));
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

const heatHumidityLookup = createLogspeedAdjustInterpolator(tempModParams, { extrapolate: true });
console.log(heatHumidityLookup(8, 0)); // real tests


// Create lookup function WITH extrapolation
const heatIndexLookup = create1DInterpolationLookup(heatIndexModParams, { extrapolate: true });


console.log(heatIndexLookup(25.5)); // Works - within bounds  
console.log(heatIndexLookup(50));   // Works - extrapolates beyond 45
console.log(heatIndexLookup(-5));   // Works - extrapolates below 0

console.log(heatIndexLookup(8));   // Works - extrapolates below 0


// Actual scripts 




// lookup table


// is inverting as easy as subtract vs add? I tink it might be...

// effort_mode is FALSE by default -- when false, we are doing reverse lookup


// In effort mode, 8:00/mi is cool-weather effort, so we straightforwardlyl ook up the value

function doHeatAdjustment(){
  let input_log_speed = Math.log(input_m_s)
  // Math.exp() to invert
  //
  
  let logspeed_adjustment
  let log_result 

  if (heat_mode == "heat-index"){
    logspeed_adjustment = heatIndexLookup(inner_heat_index_c);
  } else {
    //ok for both mode = humidity and mode = dewpoint
    // (b/c getWeather already takes care of dewpoint --> humidity adjustment)
    logspeed_adjustment = heatHumidityLookup(inner_temp_c, inner_humidity_pct);
  }

  if (effort_mode){
    log_result = input_log_speed + logspeed_adjustment
  } else if (!effort_mode){
    // for clarity, this is pace mode
    log_result = input_log_speed - logspeed_adjustment
  }
  output_speed_ms = Math.exp(log_result) // back transform to m/s

  // Now, if in pace mode (effort_mode = false), we need to SUBTRACT the adjustment!
  //b/c real;ly bad heat is like return value -0.05 from lookup for heat index (about negative 5% hit to speed)
  // EFFORT MODEL: cool weather, you **add** a negative number to input(logged), makes speed go down --> SLOWER
  // PACE MODE: you **subract** off the performance hit you are experiencing, minus a negative nmber makes logspeed go up --> faster

}





// ifelse for heat index vs not


// If effort mode is false


// If heat index mode, lookup 1D on the heat index grid using inner_heat_index_c





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



// Updates, etc


function updateResult(){
  readCurrentSpeed()
  readWeatherConditions()
  doHeatAdjustment()
  updateOutput()
  console.log('INPUT SPEED')
  console.log(input_m_s)
  console.log('OUTPUT SPEED')
  console.log(output_speed_ms)
}


function updateOutput(){
  let out_text = document.querySelector('#output-text')
  let out_units = document.querySelector('#output-units')
  let convert_text = ''

  if (!Number.isFinite(output_speed_ms) || input_m_s == 0){
      // If we get any funny business...hmm
      convert_text = '🤔' // hmm or scream
  } else {
      const convert_fxn = convert_dict[out_units.textContent]
      convert_text = convert_fxn(output_speed_ms)
  }
  out_text.textContent = convert_text

  //Update text in doc
}



// Effort vs pace toggle switch
// Attach the event listener to the checkbox input
let effortToggle = document.querySelector('#pace-post .switch input[type="checkbox"]');
effortToggle.addEventListener('change', function() {
  let effortText = document.getElementById("pace-or-effort")
  let resultPreText = document.getElementById('result-pre')
  let resultPostText = document.getElementById('result-post')
  
  // if checkbox is checked, we are in EFFORT MODE - consdider swaping>?
  if (effortToggle.checked){
    effort_mode = false;
    effortText.innerHTML = "pace"
    resultPreText.innerText = "is the same effort as"
    resultPostText.innerText = "in ideal conditions"
  } else {
    effort_mode = true;
    effortText.innerHTML = "effort"
    resultPreText.innerText = "will result in"
    resultPostText.innerText = "in the heat"
  }
  updateResult()
})




// Dials for input pace
// Dial and input controls
// --- Incrementing pace dials --- 

//First incrementor
let d1 = document.querySelector("#d1");
const d1_up = document.querySelector('#d1-up');
const d1_down = document.querySelector('#d1-down');

d1_up.addEventListener('click', () => {
  increment_minutes(d1,1);
  updateResult();
});

d1_down.addEventListener('click', () => {
  increment_minutes(d1,-1);
  updateResult();
});

//Second incrementors - a bit different
const d2_up = document.querySelector('#d2-up');
const d2_down = document.querySelector('#d2-down');

d2_up.addEventListener('click', () => {
  increment_sec_digit(d2,6,1);
  updateResult();
});

d2_down.addEventListener('click', () => {
  increment_sec_digit(d2,6,-1);
  updateResult();
});

// 3rd digit is limit 10
const d3_up = document.querySelector('#d3-up');
const d3_down = document.querySelector('#d3-down');

d3_up.addEventListener('click', () => {
  increment_sec_digit(d3,10,1);
  updateResult();
});

d3_down.addEventListener('click', () => {
  increment_sec_digit(d3,10,-1,5); //floor of 5
  updateResult();
});


// incremntor functions
function increment_sec_digit(digit_object, digit_limit, change){
  let digit_val = parseInt(digit_object.textContent);
  // mod ops to circularize
  if (change === 1) {
    digit_val = (digit_val + 1) % digit_limit;
  }
  if (change === -1) {
    digit_val = (digit_val - 1 + digit_limit) % digit_limit;
  }
  // DEAL WITH 0:00 SOMEHOW...
  digit_object.textContent = digit_val;
}

function increment_minutes(digit_object,change){
  let digit_val = parseInt(digit_object.textContent);
  //Disallow > 60
  if (change > 0 && digit_val < 60) {
    digit_object.textContent = digit_val + change
  }
  //Disallow < 0
  if (digit_val > 0 && change < 0) {
    digit_object.textContent = digit_val + change
  }
}

// --- icnrementing speed

//First incrementor
let s1 = document.querySelector("#s1");
const s1_up = document.querySelector('#s1-up');
const s1_down = document.querySelector('#s1-down');

s1_up.addEventListener('click', () => {
  increment_minutes(s1,1);
  updateResult();
});

s1_down.addEventListener('click', () => {
  increment_minutes(s1,-1);
  updateResult();
});

//Second incrementors - a bit different
const s2_up = document.querySelector('#s2-up');
const s2_down = document.querySelector('#s2-down');

s2_up.addEventListener('click', () => {
  increment_sec_digit(s2,10,1);
  updateResult();
});

s2_down.addEventListener('click', () => {
  increment_sec_digit(s2,10,-1);
  updateResult();
});


// Unit selection


// Input unit selector
const pace_buttons = document.querySelectorAll('.pace-toggle');

pace_buttons.forEach(button => {
  button.addEventListener('click', (e) => {
    // Remove active class from all buttons
    pace_buttons.forEach(btn => btn.classList.remove('active'));
    // Toggle the active state of the clicked button
    e.target.classList.toggle('active');
    setPaceText(button);
  });
});

// Output unit selector
const output_buttons = document.querySelectorAll('.wind-toggle');

output_buttons.forEach(button => {
  button.addEventListener('click', (e) => {
    // Remove active class from all buttons
    output_buttons.forEach(btn => btn.classList.remove('active'));
    // Toggle the active state of the clicked button
    e.target.classList.toggle('active');
    setWindUnits(button);
    //setOutputText(button);
    updateResult();
  });
});


const speed_dials = document.querySelector('#speed-dials')
const pace_dials = document.querySelector('#pace-dials')

function setMode(dial_mode) {
  if (dial_mode == "pace") {
    // set global var, swap hidden states
    pace_or_speed = "pace"
    speed_dials.classList.add('hidden');
    pace_dials.classList.remove('hidden');
    
  }
  if (dial_mode == "speed") {
    // set global var, swap hidden states
    pace_or_speed = "speed"
    pace_dials.classList.add('hidden');
    speed_dials.classList.remove('hidden');
    
  }
}


//Change display text by pace
function setPaceText(button){
  //4 things can happen here: mi, km, mph, kmh.
  let pace_units = document.querySelector('#pace-units')
  let speed_units = document.querySelector('#speed-units')
  
  // [/mi] 
  if (button.textContent == "/mi" || button.textContent == "/km") {
    setMode("pace");        
    pace_units.textContent = button.textContent;
    // function like pass_pace_to_speed()
  }
  if (button.textContent == "mph" || button.textContent == "km/h" || button.textContent == "m/s") {
    setMode("speed");
    speed_units.textContent = button.textContent;
    // function like pass_speed_to_pace() 
  }
  
  setOutputText(button)
  
  updateResult();
}

var output_text = document.querySelector('#output-text')
// Use this to change otuput text directly

//easy once you get inoptu as m/s and output as m/s

// Make output match input
function setOutputText(button){
  let output_units = document.querySelector('#output-units')
  // [/mi] 
  output_units.textContent = button.textContent;
}


// C vs F toggle


/** Convert Fahrenheit to Celsius, respecting limits */
function tempFtoC(f) {
  let proposed_c = (f - 32)*5/9;
  if (proposed_c < TEMP_MIN_VALUE_C){
    proposed_c = TEMP_MIN_VALUE_C
  }
  
  if (proposed_c > TEMP_MAX_VALUE_C){
    proposed_c = TEMP_MAX_VALUE_C
  }
  return proposed_c;
}

/** Convert Celsius to Fahrenheit */
function tempCtoF(c) {
  let proposed_f = (c * 9 / 5) + 32;
  if (proposed_f < TEMP_MIN_VALUE_F) {
    proposed_f = TEMP_MIN_VALUE_F;
  }
  if (proposed_f > TEMP_MAX_VALUE_F) {
    proposed_f = TEMP_MAX_VALUE_F;
  }
  return proposed_f;
}


// Heat mode

const heat_mode_buttons = document.querySelectorAll('.heat-toggle');

heat_mode_buttons.forEach(button => {
  button.addEventListener('click', (e) => {
    // Remove active class from all buttons
    heat_mode_buttons.forEach(btn => btn.classList.remove('active'));
    // Toggle the active state of the clicked button
    e.currentTarget.classList.toggle('active');
    setHeatMode(button);
    updateResult();
  });
});


const heat_index_box = document.querySelector('#heat-index-input')
const temperature_box = document.querySelector('#temperature-input')
const humidity_box = document.querySelector('#humidity-input')
const dewpoint_box = document.querySelector('#dewpoint-input')
const and_box = document.querySelector('#and-box')

function setHeatMode(button){
  if (button.id == "mode-heat-index"){
    heat_mode = "heat-index"
    // In heat index mode, heat index is the only box we have
    heat_index_box.classList.remove('hidden')
    temperature_box.classList.add('hidden')
    humidity_box.classList.add('hidden')
    dewpoint_box.classList.add('hidden')
    and_box.classList.add('hidden')
    
  } else if (button.id == "mode-humidity") {
    heat_mode = "humidity"
    // In humidity mode we need air temp and humidity pct
    heat_index_box.classList.add('hidden')
    temperature_box.classList.remove('hidden')
    humidity_box.classList.remove('hidden')
    dewpoint_box.classList.add('hidden')
    and_box.classList.remove('hidden')
  } else if (button.id == "mode-dewpoint") {
    heat_mode = "dewpoint"
    // In dewpoint mode we need air temp and dewpoint
    heat_index_box.classList.add('hidden')
    temperature_box.classList.remove('hidden')
    humidity_box.classList.add('hidden')
    dewpoint_box.classList.remove('hidden')
    and_box.classList.remove('hidden')
  } 
}



const temp_mode_buttons = document.querySelectorAll('.temp-toggle');

temp_mode_buttons.forEach(button => {
  button.addEventListener('click', (e) => {
    // Remove active class from all buttons
    temp_mode_buttons.forEach(btn => btn.classList.remove('active'));
    // Toggle the active state of the clicked button
    e.currentTarget.classList.toggle('active');
    setTempMode(button);
    updateResult();
  });
});


function setTempMode(button){
  // Useful in case I need to tweak standards
  if (button.id == "temp-f") {
    // Only switch if a switch is needed!
    if (temperature_mode == "C") {
      switchTemps("F")      
    }
    temperature_mode = "F"
  } else if (button.id == "temp-c") {
    if (temperature_mode == "F") {
      switchTemps("C");
    }
    temperature_mode = "C"
  }
  switchTemps();
}




function switchTemps(switch_to_what){
  if (switch_to_what == "F"){
    temperature_units.textContent = "F"
    dewpoint_units.textContent = "F"
    heat_index_units.textContent = "F"
    
    heat_index_value = tempCtoF(heat_index_value)
    temperature_value = tempCtoF(temperature_value)
    dewpoint_value = tempCtoF(dewpoint_value)
    
    // Added dewpoint fix
    if (dewpoint_value > temperature_value){
      dewpoint_value = temperature_value
    }
    
  } else if (switch_to_what == "C"){
    temperature_units.textContent = "C"
    dewpoint_units.textContent = "C"
    heat_index_units.textContent = "C"
    heat_index_value = tempFtoC(heat_index_value)
    temperature_value = tempFtoC(temperature_value)
    dewpoint_value = tempFtoC(dewpoint_value)
    
    if (dewpoint_value > temperature_value){
      dewpoint_value = temperature_value
    }
  }
  
  //Must update the actual display text too
  heat_index_text.textContent = heat_index_value.toFixed(0)
  temperature_text.textContent = temperature_value.toFixed(0)
  dewpoint_text.textContent = dewpoint_value.toFixed(0)
}   

// Query Select our Temp / Humidty/ etc values

// Heat index control
let heat_index_text = document.querySelector("#heat-index-digit")
let heat_index_units = document.querySelector("#heat-index-units") // C or F
let heat_index_value = parseFloat(heat_index_text.textContent)

// Air temp
let temperature_text = document.querySelector("#temperature-digit")
let temperature_units = document.querySelector("#temperature-units") // C or F
let temperature_value = parseFloat(temperature_text.textContent)

// Humidity
let humidity_text = document.querySelector("#humidity-digit")
let humidity_units = document.querySelector("#humidity-units") // C or F
let humidity_value = parseFloat(humidity_text.textContent)


// Dew point
let dewpoint_text = document.querySelector("#dewpoint-digit")
let dewpoint_units = document.querySelector("#dewpoint-units") // C or F
let dewpoint_value = parseFloat(dewpoint_text.textContent)





function readWeatherConditions(){
  if (temperature_mode == "F"){
    inner_heat_index_c = tempFtoC(heat_index_value)
    inner_temp_c = tempFtoC(temperature_value)
    inner_dewpoint_c = tempFtoC(dewpoint_value)
  } else {
    inner_heat_index_c = heat_index_value
    inner_temp_c = temperature_value
    inner_dewpoint_c = dewpoint_value
  }
  
  // Use Magnus eqn to calculate humidty if input is dewpoint
  if (heat_mode == "dewpoint") {
    inner_humidity_pct = calculateRelativeHumidity(inner_temp_c, inner_dewpoint_c);
  } else {
    inner_humidity_pct = humidity_value // maybe not necessary but will avoid any weird bugs
  }
}




// Heat index buttons
// In order left to right...
const heat_index_m5 = document.querySelector("#heat-index-m5")
heat_index_m5.addEventListener('click', () => {
  increment_heat_index(-5) // I think we can set up this function for humidity too?
})
const heat_index_m1 = document.querySelector("#heat-index-m1")
heat_index_m1.addEventListener('click', () => {
  increment_heat_index(-1)
})
const heat_index_p1 = document.querySelector("#heat-index-p1")
heat_index_p1.addEventListener('click', () => {
  increment_heat_index(1)
})
const heat_index_p5 = document.querySelector("#heat-index-p5")
heat_index_p5.addEventListener('click', () => {
  increment_heat_index(5)
})

// Temperature buttons
const temperature_m5 = document.querySelector("#temperature-m5")
temperature_m5.addEventListener('click', () => {
  increment_temperature(-5) // I think we can set upt his function for humidity too?
})
const temperature_m1 = document.querySelector("#temperature-m1")
temperature_m1.addEventListener('click', () => {
  increment_temperature(-1)
})
const temperature_p1 = document.querySelector("#temperature-p1")
temperature_p1.addEventListener('click', () => {
  increment_temperature(1)
})
const temperature_p5 = document.querySelector("#temperature-p5")
temperature_p5.addEventListener('click', () => {
  increment_temperature(5)
})

// Humidity buttons
const humidity_m5 = document.querySelector("#humidity-m5")
humidity_m5.addEventListener('click', () => {
  increment_humidity(-5) // I think we can set up this function for humidity too?
})
const humidity_m1 = document.querySelector("#humidity-m1")
humidity_m1.addEventListener('click', () => {
  increment_humidity(-1)
})
const humidity_p1 = document.querySelector("#humidity-p1")
humidity_p1.addEventListener('click', () => {
  increment_humidity(1)
})
const humidity_p5 = document.querySelector("#humidity-p5")
humidity_p5.addEventListener('click', () => {
  increment_humidity(5)
})


// Dewpoint buttons
const dewpoint_m5 = document.querySelector("#dewpoint-m5")
dewpoint_m5.addEventListener('click', () => {
  increment_dewpoint(-5) // we can set up this function for dewpoint too
})
const dewpoint_m1 = document.querySelector("#dewpoint-m1")
dewpoint_m1.addEventListener('click', () => {
  increment_dewpoint(-1)
})
const dewpoint_p1 = document.querySelector("#dewpoint-p1")
dewpoint_p1.addEventListener('click', () => {
  increment_dewpoint(1)
})
const dewpoint_p5 = document.querySelector("#dewpoint-p5")
dewpoint_p5.addEventListener('click', () => {
  increment_dewpoint(5)
})





// Maybe easuest to do separately for each,, slightly non DRY but simpler

function increment_heat_index(change){
  let proposed_val = heat_index_value + change
  // UGH need to ifelse the units
  if (temperature_mode == "F"){
    if (proposed_val <= TEMP_MAX_VALUE_F && proposed_val >= TEMP_MIN_VALUE_F) {
      //change is allowed
      heat_index_value = proposed_val
      heat_index_text.textContent = heat_index_value.toFixed(0)
    }
  }
  if (temperature_mode == "C"){
    if (proposed_val <= TEMP_MAX_VALUE_C && proposed_val >= TEMP_MIN_VALUE_C) {
      //change is allowed
      heat_index_value = proposed_val
      heat_index_text.textContent = heat_index_value.toFixed(0)
    }
  }
  updateResult();
}

// also need to police dewpoints here
function increment_temperature(change){
  let proposed_val = temperature_value + change
  // UGH need to ifelse the units
  if (temperature_mode == "F"){
    if (proposed_val <= TEMP_MAX_VALUE_F && proposed_val >= TEMP_MIN_VALUE_F) {
      //change is allowed
      temperature_value = proposed_val
      temperature_text.textContent = temperature_value.toFixed(0)
    }
  }
  if (temperature_mode == "C"){
    if (proposed_val <= TEMP_MAX_VALUE_C && proposed_val >= TEMP_MIN_VALUE_C) {
      //change is allowed
      temperature_value = proposed_val
      temperature_text.textContent = temperature_value.toFixed(0)
    }
  }
  
  // need to enforce dewpoints
  if (dewpoint_value > temperature_value) {
    dewpoint_value = temperature_value
    dewpoint_text.textContent = dewpoint_value.toFixed(0)
  }
  
  updateResult();
}


function increment_humidity(change){
  let proposed_val = humidity_value + change
  // UGH need to ifelse the units
  if (proposed_val <= HUMIDITY_MAX_VALUE && proposed_val >= HUMIDITY_MIN_VALUE) {
    //change is allowed
    humidity_value = proposed_val
    humidity_text.textContent = humidity_value.toFixed(0)
  }
  updateResult();
}


function increment_dewpoint(change){
  let proposed_val = dewpoint_value + change
  // No need to ifelse the units, BUT note we are dynamically using temperature value to set ceiling!
  if (proposed_val <= temperature_value && proposed_val >= DEW_POINT_MIN_VALUE) {
    //change is allowed
    dewpoint_value = proposed_val
    dewpoint_text.textContent = dewpoint_value.toFixed(0)
  }
  updateResult();
}
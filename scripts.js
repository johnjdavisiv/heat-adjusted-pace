// "Load" parameters for the heat/humidity 
const tempModParams = {
  "air_temp_c": [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45],
  "humidity_pct": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
  "logspeed_adjust": [-0.0057, -0.0017, 0, -0.0001, -0.0019, -0.0032, -0.004, -0.0047, -0.0053, -0.006, -0.0057, -0.0017, 0, -0.0001, -0.0042, -0.0073, -0.0097, -0.012, -0.0143, -0.0166, -0.0057, -0.0017, 0, -0.0001, -0.0059, -0.0111, -0.0156, -0.02, -0.0243, -0.0287, -0.0057, -0.0017, 0, -0.0001, -0.0069, -0.0145, -0.0218, -0.0289, -0.0361, -0.0433, -0.0057, -0.0017, 0, -0.0001, -0.0082, -0.0181, -0.0284, -0.0386, -0.0489, -0.0591, -0.0057, -0.0017, 0, -0.0003, -0.0104, -0.0225, -0.0356, -0.0488, -0.062, -0.0752, -0.0057, -0.0017, 0, -0.0015, -0.0123, -0.027, -0.0437, -0.0608, -0.0778, -0.0948, -0.0057, -0.0017, 0, -0.0017, -0.0129, -0.031, -0.053, -0.0756, -0.0982, -0.1208, -0.0057, -0.0017, 0, -0.0017, -0.0129, -0.0346, -0.0629, -0.0921, -0.1214, -0.1507, -0.006, -0.0018, 0, -0.0017, -0.0129, -0.0382, -0.0729, -0.1089, -0.145, -0.1811, -0.008, -0.0036, -0.0001, -0.0017, -0.0129, -0.0418, -0.0828, -0.1258, -0.1687, -0.2116]
}
// (this is the coarse version, use fine for production)


// Note this is more of a classic lookup table, like expand.grid() in R
// Will want to do an interpolation strategy

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

// --- Example ---
const table = {
  air_temp_c:     [0,10,20, 0,10,20, 0,10,20],
  humidity_pct:   [20,20,20, 50,50,50, 80,80,80],
  logspeed_adjust:[-0.1,0.0,0.1, -0.05,0.05,0.15, -0.02,0.08,0.2]
};

const logspeed_lookup = createLogspeedAdjustInterpolator(table, { extrapolate: true });
console.log(logspeed_lookup(12.5, 65)); // interpolated logspeed_adjust at 12.5°C, 65% RH






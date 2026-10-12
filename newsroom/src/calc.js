// Personal-impact numbers are always calculated here, never written by the AI.

function emi(principal, annualRatePct, years) {
  const r = annualRatePct / 1200;
  const n = years * 12;
  if (r === 0) return principal / n;
  const f = Math.pow(1 + r, n);
  return (principal * r * f) / (f - 1);
}

const inr = (x) => '₹' + Math.round(x).toLocaleString('en-IN');

function lakhs(p) {
  return p >= 1e7 ? `₹${+(p / 1e7).toFixed(2)} crore` : `₹${+(p / 1e5).toFixed(2)}L`;
}

// Default example borrower; the app replaces these with the reader's own loan (kept on their phone).
const DEFAULT_LOAN = { principal: 3000000, years: 20, baseRate: 8.5 };

// calc: { type: 'emi', change } where change is the policy rate move in percentage points (for example -0.25).
// Assumes the bank passes the full change on to a floating-rate loan; the poster prints that assumption.
function impactFigure(calc, loan = DEFAULT_LOAN) {
  if (!calc || calc.type !== 'emi') throw new Error('unsupported calculation');
  if (typeof calc.change !== 'number' || !isFinite(calc.change) || calc.change === 0 || Math.abs(calc.change) > 2) {
    throw new Error('calc.change must be a non-zero rate change of at most 2 percentage points');
  }
  const { principal, years, baseRate } = loan;
  const oldRate = baseRate;
  const newRate = Math.round((baseRate + calc.change) * 100) / 100;
  for (const [k, v] of Object.entries({ principal, years, oldRate, newRate })) {
    if (typeof v !== 'number' || !isFinite(v) || v <= 0) throw new Error(`calc.${k} must be a positive number`);
  }
  const diff = emi(principal, oldRate, years) - emi(principal, newRate, years);
  return {
    figure: inr(Math.abs(diff)),
    unit: diff >= 0 ? 'less/mo' : 'more/mo',
    assumptions: `EMI on ${lakhs(principal)}, ${years} yrs, if your bank moves ${oldRate}% → ${newRate}%`,
  };
}

module.exports = { emi, impactFigure, DEFAULT_LOAN };

/* ═══════════════════════════════════════════════════
   StayType — app.js
   NYC Airbnb Room Type Predictor
   Talks to FastAPI backend at /predict
═══════════════════════════════════════════════════ */

'use strict';

/* ── Config ─────────────────────────────────────── */
const API_BASE = 'http://127.0.0.1:8000';

/* ── Room type meta ─────────────────────────────── */
const ROOM_META = {
  'Entire home/apt': {
    icon: '🏠',
    desc: 'The entire property is yours — full privacy, kitchen, living space. Great for families or longer stays.',
    color: '#c9836a',
  },
  'Private room': {
    icon: '🛏️',
    desc: 'A private bedroom in a shared home. Common areas are shared with the host or other guests.',
    color: '#5b8dee',
  },
  'Shared room': {
    icon: '🛋️',
    desc: 'A shared sleeping space — most affordable option, perfect for solo budget travellers.',
    color: '#9b72e8',
  },
  'Hotel room': {
    icon: '🏨',
    desc: 'A professional hotel or boutique property listed on Airbnb with hotel-style amenities.',
    color: '#4caf85',
  },
};

const DEFAULT_META = { icon: '🏡', desc: 'A unique NYC listing.', color: '#c9836a' };

/* ── DOM refs ───────────────────────────────────── */
const form         = document.getElementById('form');
const formCard     = document.getElementById('form-card');
const resultPanel  = document.getElementById('result-panel');
const loadingState = document.getElementById('loading-state');
const resultState  = document.getElementById('result-state');
const progFill     = document.getElementById('prog');
const progLabel    = document.getElementById('prog-label');
const btnPredict   = document.getElementById('btn-predict');
const btnReset     = document.getElementById('btn-reset');
const btnBack      = document.getElementById('btn-back');
const toast        = document.getElementById('toast');
const toastMsg     = document.getElementById('toast-msg');
const dot          = document.getElementById('dot');
const apiStatus    = document.getElementById('api-status');
const availRange   = document.getElementById('avail-range');
const availInput   = document.getElementById('availability_365');
const availDisplay = document.getElementById('avail-display');

/* ── All required fields ────────────────────────── */
const FIELDS = [
  'neighbourhood_group',
  'neighbourhood',
  'latitude',
  'longitude',
  'price',
  'minimum_nights',
  'number_of_reviews',
  'reviews_per_month',
  'calculated_host_listings_count',
  'availability_365',
];

/* ════════════════════════════════════════════════
   API HEALTH CHECK
════════════════════════════════════════════════ */
async function checkAPI() {
  try {
    const res = await fetch(`${API_BASE}/home`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      dot.className = 'dot online';
      apiStatus.textContent = 'API Online';
    } else {
      throw new Error();
    }
  } catch {
    dot.className = 'dot offline';
    apiStatus.textContent = 'API Offline';
  }
}

/* ════════════════════════════════════════════════
   PROGRESS BAR
════════════════════════════════════════════════ */
function updateProgress() {
  let filled = 0;
  FIELDS.forEach(name => {
    const el = document.getElementById(name) || document.querySelector(`[name="${name}"]`);
    if (el && el.value.trim() !== '') filled++;
  });
  const pct = Math.round((filled / FIELDS.length) * 100);
  progFill.style.width = pct + '%';
  progLabel.textContent = `${filled} of ${FIELDS.length} fields filled`;
}

/* ════════════════════════════════════════════════
   VALIDATION
════════════════════════════════════════════════ */
const VALIDATORS = {
  neighbourhood_group: v => v ? null : 'Please select a borough',
  neighbourhood:       v => v.trim().length >= 1 ? null : 'Neighbourhood is required',
  latitude:            v => v !== '' && +v >= -90  && +v <= 90   ? null : 'Must be between -90 and 90',
  longitude:           v => v !== '' && +v >= -180 && +v <= 180  ? null : 'Must be between -180 and 180',
  price:               v => v !== '' && +v > 0 ? null : 'Price must be greater than 0',
  minimum_nights:      v => v !== '' && +v >= 1 && +v <= 365 ? null : 'Must be between 1 and 365',
  number_of_reviews:   v => v !== '' && +v >= 0 ? null : 'Cannot be negative',
  reviews_per_month:   v => v !== '' && +v >= 0 ? null : 'Cannot be negative',
  calculated_host_listings_count: v => v !== '' && +v >= 0 ? null : 'Cannot be negative',
  availability_365:    v => v !== '' && +v >= 0 && +v <= 365 ? null : 'Must be between 0 and 365',
};

function validateField(name) {
  const el  = document.getElementById(name) || document.querySelector(`[name="${name}"]`);
  const err = document.getElementById(`e-${name}`);
  if (!el || !err) return true;

  const val = el.value;
  const msg = VALIDATORS[name] ? VALIDATORS[name](val) : null;

  if (msg) {
    err.textContent = msg;
    el.classList.add('invalid');
    el.classList.remove('valid');
    return false;
  } else {
    err.textContent = '';
    el.classList.remove('invalid');
    if (val.trim() !== '') el.classList.add('valid');
    return true;
  }
}

function validateAll() {
  let ok = true;
  FIELDS.forEach(name => { if (!validateField(name)) ok = false; });
  return ok;
}

/* ════════════════════════════════════════════════
   COLLECT FORM DATA
════════════════════════════════════════════════ */
function collectData() {
  return {
    neighbourhood_group:             document.getElementById('neighbourhood_group').value,
    neighbourhood:                   document.getElementById('neighbourhood').value.trim(),
    latitude:                        parseFloat(document.getElementById('latitude').value),
    longitude:                       parseFloat(document.getElementById('longitude').value),
    price:                           parseFloat(document.getElementById('price').value),
    minimum_nights:                  parseInt(document.getElementById('minimum_nights').value),
    number_of_reviews:               parseInt(document.getElementById('number_of_reviews').value),
    reviews_per_month:               parseFloat(document.getElementById('reviews_per_month').value),
    calculated_host_listings_count:  parseInt(document.getElementById('calculated_host_listings_count').value),
    availability_365:                parseInt(document.getElementById('availability_365').value),
  };
}

/* ════════════════════════════════════════════════
   LOADING ANIMATION
════════════════════════════════════════════════ */
function animateLoadingSteps() {
  const steps = ['ls1', 'ls2', 'ls3'];
  let i = 0;

  // Reset
  steps.forEach(id => {
    const el = document.getElementById(id);
    el.className = 'lstep';
  });

  const interval = setInterval(() => {
    if (i > 0) {
      document.getElementById(steps[i-1]).className = 'lstep done';
    }
    if (i < steps.length) {
      document.getElementById(steps[i]).className = 'lstep active';
      i++;
    } else {
      clearInterval(interval);
    }
  }, 600);

  return interval;
}

/* ════════════════════════════════════════════════
   SHOW RESULT
════════════════════════════════════════════════ */
function showResult(prediction, probabilities) {
  // Hide loading, show result
  loadingState.classList.add('hidden');
  resultState.classList.remove('hidden');

  const roomType = Array.isArray(prediction) ? prediction[0] : prediction;
  const meta = ROOM_META[roomType] || DEFAULT_META;

  // Icon & type
  document.getElementById('res-icon').textContent = meta.icon;
  document.getElementById('res-type').textContent = roomType;
  document.getElementById('res-desc').textContent = meta.desc;
  document.getElementById('res-type').style.color = meta.color;

  // Confidence bars
  const barsEl = document.getElementById('conf-bars');
  barsEl.innerHTML = '';

  // Build class → probability pairs
  let probPairs = [];
  if (Array.isArray(probabilities) && probabilities.length > 0) {
    const probs = Array.isArray(probabilities[0]) ? probabilities[0] : probabilities;
    const classes = ['Entire home/apt', 'Private room', 'Shared room'];

    // Match probabilities to classes
    probs.forEach((p, idx) => {
      const label = classes[idx] || `Class ${idx}`;
      probPairs.push({ label, prob: p });
    });

    // Sort by probability descending
    probPairs.sort((a, b) => b.prob - a.prob);
  }

  // Render bars with staggered animation
  probPairs.forEach((pair, idx) => {
    const pct = (pair.prob * 100).toFixed(1);
    const isTop = idx === 0;
    const item = document.createElement('div');
    item.className = 'conf-bar-item';
    item.innerHTML = `
      <div class="conf-bar-header">
        <span class="conf-bar-name">${pair.label}</span>
        <span class="conf-bar-pct">${pct}%</span>
      </div>
      <div class="conf-bar-track">
        <div class="conf-bar-fill ${isTop ? 'top' : ''}" style="width:0%" data-width="${pct}%"></div>
      </div>
    `;
    barsEl.appendChild(item);

    // Animate bar after paint
    setTimeout(() => {
      item.querySelector('.conf-bar-fill').style.width = pct + '%';
    }, 100 + idx * 120);
  });
}

/* ════════════════════════════════════════════════
   SHOW TOAST
════════════════════════════════════════════════ */
function showToast(msg) {
  toastMsg.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 4500);
}

/* ════════════════════════════════════════════════
   PREDICT — MAIN API CALL
════════════════════════════════════════════════ */
async function predict(data) {
  // Show result panel in loading state
  formCard.style.opacity = '0.5';
  formCard.style.pointerEvents = 'none';
  resultPanel.classList.remove('hidden');
  loadingState.classList.remove('hidden');
  resultState.classList.add('hidden');

  // Scroll to result
  setTimeout(() => resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

  btnPredict.classList.add('loading');
  btnPredict.querySelector('span').textContent = 'Predicting…';

  const interval = animateLoadingSteps();

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error: ${res.status}`);
    }

    const json = await res.json();
    clearInterval(interval);

    // Mark all steps done
    ['ls1','ls2','ls3'].forEach(id => {
      document.getElementById(id).className = 'lstep done';
    });

    // Short pause for UX feel
    await new Promise(r => setTimeout(r, 400));

    showResult(json['prediction'] || json['Pridicted Room'], 
           json['probability'] || json['Probability']);

  } catch (err) {
    clearInterval(interval);
    resultPanel.classList.add('hidden');
    formCard.style.opacity = '1';
    formCard.style.pointerEvents = 'auto';
    showToast(err.message || 'Could not reach the API. Is FastAPI running?');
  } finally {
    btnPredict.classList.remove('loading');
    btnPredict.querySelector('span').textContent = 'Predict Room Type';
  }
}

/* ════════════════════════════════════════════════
   RESET
════════════════════════════════════════════════ */
function resetAll() {
  form.reset();
  availRange.value = 180;
  availDisplay.textContent = '180';

  FIELDS.forEach(name => {
    const el = document.getElementById(name) || document.querySelector(`[name="${name}"]`);
    const err = document.getElementById(`e-${name}`);
    if (el) { el.classList.remove('valid', 'invalid'); }
    if (err) { err.textContent = ''; }
  });

  progFill.style.width = '0%';
  progLabel.textContent = '0 of 10 fields filled';
  resultPanel.classList.add('hidden');
  formCard.style.opacity = '1';
  formCard.style.pointerEvents = 'auto';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ════════════════════════════════════════════════
   EVENT WIRING
════════════════════════════════════════════════ */

// Form submit
// javascript
form.addEventListener('submit', function(e) {
  e.preventDefault();
  e.stopPropagation();
  if (!validateAll()) {
    showToast('Please fix the errors above before predicting.');
    return;
  }
  predict(collectData());
});

// Reset
btnReset.addEventListener('click', resetAll);

// Back from result
btnBack.addEventListener('click', () => {
  resultPanel.classList.add('hidden');
  formCard.style.opacity = '1';
  formCard.style.pointerEvents = 'auto';
  formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Live validation on blur
FIELDS.forEach(name => {
  const el = document.getElementById(name) || document.querySelector(`[name="${name}"]`);
  if (!el) return;
  el.addEventListener('blur',  () => validateField(name));
  el.addEventListener('input', () => {
    updateProgress();
    if (el.classList.contains('invalid')) validateField(name);
  });
  el.addEventListener('change', () => {
    updateProgress();
    validateField(name);
  });
});

// Availability slider ↔ input sync
availRange.addEventListener('input', () => {
  availInput.value = availRange.value;
  availDisplay.textContent = availRange.value;
  updateProgress();
  validateField('availability_365');
});
availInput.addEventListener('input', () => {
  const v = Math.min(365, Math.max(0, parseInt(availInput.value) || 0));
  availRange.value = v;
  availDisplay.textContent = v;
});

/* ════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════ */
checkAPI();
setInterval(checkAPI, 30000); // re-check every 30s




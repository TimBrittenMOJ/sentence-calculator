
// app.js

const sentenceTabs = Array.from(document.querySelectorAll('.sentence-tab'));
const sentenceTypeInput = document.getElementById('sentenceType');

function setSentenceType(t) {
  if (!t || !sentenceTypeInput) return;
  sentenceTypeInput.value = t;
  sentenceTabs.forEach(btn => {
    const isActive = btn.dataset.type === t;
    btn.classList.toggle('sentence-tab--active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.setAttribute('tabindex', isActive ? '0' : '-1');
  });
  ['life','determinate','aggregate','suspended'].forEach(key => {
    const panel = document.getElementById(`${key}Inputs`);
    if (!panel) return;
    const isActive = key === t;
    panel.style.display = isActive ? '' : 'none';
    panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });
}

sentenceTabs.forEach(btn => {
  btn.addEventListener('click', () => setSentenceType(btn.dataset.type));
});
setSentenceType(sentenceTypeInput ? (sentenceTypeInput.value || 'life') : 'life');

document.getElementById('isActivated').addEventListener('change', function() {
  document.getElementById('activationDateBlock').style.display = this.checked ? '' : 'none';
});

// Aggregate rows
document.getElementById('addComponentBtn').addEventListener('click', function() {
  const tr = document.createElement('tr');
  tr.className = 'govuk-table__row';
  tr.innerHTML = `
    <td class="govuk-table__cell">
      <select class="govuk-select comp-relation">
        <option value="consecutive">Consecutive</option>
        <option value="concurrent">Concurrent</option>
      </select>
    </td>
    <td class="govuk-table__cell">
      <input class="govuk-input govuk-input--width-5 comp-group" type="number" min="0" step="1" placeholder="e.g. 1">
    </td>
    <td class="govuk-table__cell"><input class="govuk-input govuk-input--width-3 comp-years"  type="number" min="0" step="1" value="0"></td>
    <td class="govuk-table__cell"><input class="govuk-input govuk-input--width-2 comp-months" type="number" min="0" max="11" step="1" value="0"></td>
    <td class="govuk-table__cell"><input class="govuk-input govuk-input--width-2 comp-weeks"  type="number" min="0" step="1" value="0"></td>
    <td class="govuk-table__cell"><input class="govuk-input govuk-input--width-2 comp-days"   type="number" min="0" step="1" value="0"></td>
    <td class="govuk-table__cell">
      <button class="govuk-button govuk-button--secondary comp-remove" type="button">Remove</button>
    </td>
  `;
  document.getElementById('componentsBody').appendChild(tr);
  tr.querySelector('.comp-remove').addEventListener('click', () => tr.remove());
});

// Examples
document.getElementById('testLifeBtn').addEventListener('click', (e) => {
  e.preventDefault();
  setSentenceType('life');
  document.getElementById('dateOfSentence').value = '2020-01-01';
  document.getElementById('minYears').value = 15;
  document.getElementById('minMonths').value = 0;
  document.getElementById('minWeeks').value = 0;
  document.getElementById('minDays').value = 0;
  document.getElementById('remandDays').value = 157;
  document.getElementById('taggedBailDays').value = 0;
});
document.getElementById('testDeterminateBtn').addEventListener('click', (e) => {
  e.preventDefault();
  setSentenceType('determinate');
  document.getElementById('dateOfSentence').value = '2020-08-08';
  document.getElementById('detYears').value = 0;
  document.getElementById('detMonths').value = 9;
  document.getElementById('detWeeks').value = 0;
  document.getElementById('detDays').value = 0;
  document.getElementById('releaseFraction').value = '0.5';
  document.getElementById('remandDays').value = 30;
  document.getElementById('taggedBailDays').value = 10;
});
document.getElementById('testAggregateBtn').addEventListener('click', (e) => {
  e.preventDefault();
  setSentenceType('aggregate');
  document.getElementById('dateOfSentence').value = '2020-01-01';
  const tbody = document.getElementById('componentsBody'); tbody.innerHTML = '';
  document.getElementById('addComponentBtn').click(); // consecutive 1y
  const r1 = tbody.querySelector('tr:last-child');
  r1.querySelector('.comp-relation').value = 'consecutive';
  r1.querySelector('.comp-years').value = '1';
  document.getElementById('addComponentBtn').click(); // group 1 concurrent 6m
  const r2 = tbody.querySelector('tr:last-child');
  r2.querySelector('.comp-relation').value = 'concurrent';
  r2.querySelector('.comp-group').value = '1';
  r2.querySelector('.comp-months').value = '6';
  document.getElementById('aggReleaseFraction').value = '0.5';
  document.getElementById('remandDays').value = 0;
  document.getElementById('taggedBailDays').value = 0;
});
document.getElementById('testSuspendedBtn').addEventListener('click', (e) => {
  e.preventDefault();
  setSentenceType('suspended');
  document.getElementById('dateOfSentence').value = '2021-02-15';
  document.getElementById('susYears').value = 1;
  document.getElementById('susMonths').value = 0;
  document.getElementById('susWeeks').value = 0;
  document.getElementById('susDays').value = 0;
  document.getElementById('isActivated').checked = true;
  document.getElementById('activationDateBlock').style.display = '';
  document.getElementById('activationDate').value = '2022-04-01';
  document.getElementById('susReleaseFraction').value = '0.5';
  document.getElementById('remandDays').value = 10;
  document.getElementById('taggedBailDays').value = 0;
});

// Clear
document.getElementById('clearFormBtn').addEventListener('click', function() {
  [
    'dateOfSentence','minYears','minMonths','minWeeks','minDays',
    'detYears','detMonths','detWeeks','detDays',
    'remandDays','taggedBailDays',
    'susYears','susMonths','susWeeks','susDays','activationDate'
  ].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('isActivated').checked = false;
  document.getElementById('activationDateBlock').style.display = 'none';
  document.getElementById('componentsBody').innerHTML = '';
  ['totalDays','periodYMWD','periodYearsDays','calendarVariance',
   'remandCredit','taggedCredit','totalCredit'
  ].forEach(id => { document.getElementById(id).textContent = '-'; });
  document.getElementById('printSummaryBtn').disabled = true;
  document.getElementById('error-summary').innerHTML = '';
});

// Validate + calculate
document.getElementById('calcBtn').addEventListener('click', function() {
  let errors = [];
  const dateStr = document.getElementById('dateOfSentence').value;
  if (!dateStr || isNaN(Date.parse(dateStr))) errors.push({ field: 'dateOfSentence', text: 'Enter a valid sentence date' });

  const t = document.getElementById('sentenceType').value;
  function valNum(id, min=0) {
    const el = document.getElementById(id);
    if (!el) return;
    const v = Number(el.value);
    if (isNaN(v) || v < min) errors.push({ field: id, text: `Enter a valid number for ${id}` });
  }

  if (t === 'life') {
    ['minYears','minMonths','minWeeks','minDays'].forEach(id => valNum(id, 0));
  } else if (t === 'determinate') {
    ['detYears','detMonths','detWeeks','detDays'].forEach(id => valNum(id, 0));
  } else if (t === 'aggregate') {
    const rows = Array.from(document.querySelectorAll('#componentsBody tr'));
    if (rows.length === 0) errors.push({ field: 'components', text: 'Add at least one component term' });
  } else if (t === 'suspended') {
    ['susYears','susMonths','susWeeks','susDays'].forEach(id => valNum(id, 0));
    const activated = document.getElementById('isActivated').checked;
    if (activated) {
      const act = document.getElementById('activationDate').value;
      if (!act || isNaN(Date.parse(act))) errors.push({ field: 'activationDate', text: 'Enter a valid activation date' });
    }
  }

  ['remandDays','taggedBailDays'].forEach(id => valNum(id, 0));

  if (errors.length) {
    const ul = errors.map(e => `<li>${e.text}</li>`).join('');
    document.getElementById('error-summary').innerHTML = `
      <div class="govuk-error-summary" role="alert" aria-labelledby="error-summary-title" data-module="govuk-error-summary" tabindex="-1">
        <h2 class="govuk-error-summary__title" id="error-summary-title">There is a problem</h2>
        <div class="govuk-error-summary__body">
          <ul class="govuk-list govuk-error-summary__list">${ul}</ul>
        </div>
      </div>`;
    document.getElementById('error-summary').focus();
    return;
  }

  const payload = buildPayloadFromUI();
  const result = window.calculateSentence(payload);
  renderResult(result);
});

// Build payload
function buildPayloadFromUI() {
  const type = document.getElementById('sentenceType').value;
  const dateOfSentence = document.getElementById('dateOfSentence').value;
  const remandDays = Number(document.getElementById('remandDays').value) || 0;
  const taggedBailDays = Number(document.getElementById('taggedBailDays').value) || 0;

  const common = { type, dateOfSentence, remandDays, taggedBailDays };

  if (type === 'life') {
    return Object.assign(common, {
      term: {
        years:  Number(document.getElementById('minYears').value)  || 0,
        months: Number(document.getElementById('minMonths').value) || 0,
        weeks:  Number(document.getElementById('minWeeks').value)  || 0,
        days:   Number(document.getElementById('minDays').value)   || 0
      }
    });
  }
  if (type === 'determinate') {
    return Object.assign(common, {
      term: {
        years:  Number(document.getElementById('detYears').value)  || 0,
        months: Number(document.getElementById('detMonths').value) || 0,
        weeks:  Number(document.getElementById('detWeeks').value)  || 0,
        days:   Number(document.getElementById('detDays').value)   || 0
      },
      releaseFraction: Number(document.getElementById('releaseFraction').value)
    });
  }
  if (type === 'aggregate') {
    const rows = Array.from(document.querySelectorAll('#componentsBody tr')).map(tr => ({
      relation: tr.querySelector('.comp-relation').value,
      groupId:  Number(tr.querySelector('.comp-group').value) || null,
      years:    Number(tr.querySelector('.comp-years').value)  || 0,
      months:   Number(tr.querySelector('.comp-months').value) || 0,
      weeks:    Number(tr.querySelector('.comp-weeks').value)  || 0,
      days:     Number(tr.querySelector('.comp-days').value)   || 0
    }));
    return Object.assign(common, {
      components: rows,
      releaseFraction: Number(document.getElementById('aggReleaseFraction').value)
    });
  }
  if (type === 'suspended') {
    const isActivated = document.getElementById('isActivated').checked;
    return Object.assign(common, {
      isActivated,
      activationDate: document.getElementById('activationDate').value || null,
      term: {
        years:  Number(document.getElementById('susYears').value)  || 0,
        months: Number(document.getElementById('susMonths').value) || 0,
        weeks:  Number(document.getElementById('susWeeks').value)  || 0,
        days:   Number(document.getElementById('susDays').value)   || 0
      },
      releaseFraction: Number(document.getElementById('susReleaseFraction').value)
    });
  }
  return common;
}

// Render results
function renderResult(result) {
  function fmtNum(n) {
    if (typeof n !== 'number' || isNaN(n)) return '-';
    return n.toLocaleString('en-GB');
  }

  document.getElementById('totalDays').textContent   = fmtNum(result.totalDaysInclusive);

  document.getElementById('periodYMWD').textContent  = result.periodStr || '-';
  document.getElementById('periodYearsDays').textContent = result.periodYearsDaysStr || '-';

  const cv = result.calendarVariance || {};
  const varianceStr = (cv.totalAdjustment === undefined)
    ? '-'
    : `${cv.totalAdjustment >= 0 ? '+' : ''}${cv.totalAdjustment} days (leap days: ${cv.leapDays}, months adj: ${cv.monthAdjustment} from real month lengths vs 30-day months)`;
  document.getElementById('calendarVariance').textContent = varianceStr;

  const remandCredit = Number(result.remandDays || 0);
  const taggedCredit = Math.ceil(Number(result.taggedBailDays || 0) * 0.5);
  const totalCredit  = remandCredit + taggedCredit;
  document.getElementById('remandCredit').textContent = fmtNum(remandCredit);
  document.getElementById('taggedCredit').textContent = fmtNum(taggedCredit);
  document.getElementById('totalCredit').textContent  = fmtNum(totalCredit);

  document.getElementById('printSummaryBtn').disabled = false;
}

window.renderResult = renderResult;

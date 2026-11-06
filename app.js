
// Hipotecalia - Interactive Financial Engine (Pure Client-side, High Performance)
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('mortgage-form');
  const amortForm = document.getElementById('amort-form');

  // Elements
  const loanAmountInput = document.getElementById('loanAmount');
  const interestRateInput = document.getElementById('interestRate');
  const loanTermInput = document.getElementById('loanTerm');
  
  // Results Elements
  const resMonthlyPayment = document.getElementById('resMonthlyPayment');
  const resTotalInterest = document.getElementById('resTotalInterest');
  const resTotalCost = document.getElementById('resTotalCost');
  const amortTableBody = document.querySelector('#amortTable tbody');

  // Amortization comparison elements
  const amortExtraInput = document.getElementById('amortExtra');
  const amortTypeSelect = document.getElementById('amortType');
  const amortSavingsEl = document.getElementById('amortSavings');
  const amortNewValEl = document.getElementById('amortNewVal');

  // Purchase costs elements
  const propertyPriceInput = document.getElementById('propertyPrice');
  const propertyTypeSelect = document.getElementById('propertyType');
  const costsTaxEl = document.getElementById('costsTax');
  const costsNotaryEl = document.getElementById('costsNotary');
  const costsRegistryEl = document.getElementById('costsRegistry');
  const costsTotalEl = document.getElementById('costsTotal');

  function formatEur(val) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(val);
  }

  function calculateMortgage() {
    const P = parseFloat(loanAmountInput.value) || 0;
    const annualRate = parseFloat(interestRateInput.value) || 0;
    const years = parseInt(loanTermInput.value) || 0;

    if (P <= 0 || annualRate <= 0 || years <= 0) return;

    const r = (annualRate / 100) / 12;
    const n = years * 12;

    // French amortization system formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
    const monthlyPayment = (P * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
    const totalPaid = monthlyPayment * n;
    const totalInterest = totalPaid - P;

    resMonthlyPayment.textContent = formatEur(monthlyPayment);
    resTotalInterest.textContent = formatEur(totalInterest);
    resTotalCost.textContent = formatEur(totalPaid);

    // Generate annual amortization schedule
    let balance = P;
    let scheduleRows = '';
    let cumCapital = 0;
    let cumInterest = 0;

    for (let year = 1; year <= years; year++) {
      let yearInterest = 0;
      let yearCapital = 0;

      for (let m = 1; m <= 12; m++) {
        const interestForMonth = balance * r;
        const capitalForMonth = monthlyPayment - interestForMonth;
        yearInterest += interestForMonth;
        yearCapital += capitalForMonth;
        balance -= capitalForMonth;
        if (balance < 0) balance = 0;
      }

      cumCapital += yearCapital;
      cumInterest += yearInterest;

      scheduleRows += `<tr>
        <td><strong>Año ${year}</strong></td>
        <td>${formatEur(monthlyPayment * 12)}</td>
        <td>${formatEur(yearCapital)}</td>
        <td>${formatEur(yearInterest)}</td>
        <td>${formatEur(balance)}</td>
      </tr>`;
    }

    if (amortTableBody) {
      amortTableBody.innerHTML = scheduleRows;
    }

    // Stress Test Euribor (+1% and +2% scenarios)
    const stressBody = document.getElementById('stressTestBody');
    if (stressBody) {
      const scenarios = [
        { label: 'Escenario Actual', badge: 'badge-base', rate: annualRate },
        { label: 'Tensión Moderada (+1,00%)', badge: 'badge-mod', rate: annualRate + 1.0 },
        { label: 'Tensión Severa (+2,00%)', badge: 'badge-sev', rate: annualRate + 2.0 }
      ];
      stressBody.innerHTML = scenarios.map(sc => {
        const sr = (sc.rate / 100) / 12;
        const sm = (P * (sr * Math.pow(1 + sr, n))) / (Math.pow(1 + sr, n) - 1);
        const diff = sm - monthlyPayment;
        const minNetSalary = sm / 0.35;
        return `<tr>
          <td><span class="badge-scenario ${sc.badge}">${sc.label}</span></td>
          <td><strong>${sc.rate.toFixed(2)}%</strong></td>
          <td><strong>${formatEur(sm)}/mes</strong></td>
          <td>${diff > 0 ? '+' + formatEur(diff) + '/mes' : 'Base'}</td>
          <td>${formatEur(minNetSalary)}/mes netos</td>
        </tr>`;
      }).join('');
    }

    calculateAmortizationComparison(P, annualRate, years, monthlyPayment, totalInterest);
    if (window.enterpriseTrack) {
      window.enterpriseTrack('mortgage_calculated', { amount: P, rate: annualRate, years: years });
    }
  }

  function calculateAmortizationComparison(P, annualRate, years, currentM, currentTotalInt) {
    const extra = parseFloat(amortExtraInput.value) || 0;
    const type = amortTypeSelect.value;
    const r = (annualRate / 100) / 12;

    if (extra <= 0 || extra >= P) {
      amortSavingsEl.textContent = '0,00 €';
      amortNewValEl.textContent = 'Indica un importe';
      return;
    }

    const newP = P - extra;

    if (type === 'cuota') {
      const n = years * 12;
      const newM = (newP * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
      const newTotalPaid = (newM * n) + extra;
      const newTotalInt = newTotalPaid - P;
      const savings = Math.max(0, currentTotalInt - newTotalInt);

      amortSavingsEl.textContent = formatEur(savings);
      amortNewValEl.textContent = `${formatEur(newM)} / mes (ahorras ${formatEur(currentM - newM)}/mes)`;
    } else {
      // Reduce term (keeping current monthly payment)
      // n_new = - ln(1 - (r * newP / currentM)) / ln(1 + r)
      const ratio = (r * newP) / currentM;
      if (ratio < 1) {
        const newN = -Math.log(1 - ratio) / Math.log(1 + r);
        const totalNewMonths = Math.round(newN);
        const newYears = Math.floor(totalNewMonths / 12);
        const newMonths = totalNewMonths % 12;
        const newTotalPaid = (currentM * newN) + extra;
        const newTotalInt = newTotalPaid - P;
        const savings = Math.max(0, currentTotalInt - newTotalInt);

        amortSavingsEl.textContent = formatEur(savings);
        const savedMonths = (years * 12) - Math.round(newN);
        const savedYears = Math.floor(savedMonths / 12);
        const remMonths = savedMonths % 12;
        amortNewValEl.textContent = `${newYears} años y ${newMonths} meses (acortas ${savedYears} a. y ${remMonths} m.)`;
      }
    }
  }

  function calculatePurchaseCosts() {
    const price = parseFloat(propertyPriceInput.value) || 0;
    const type = propertyTypeSelect.value; // nueva (IVA 10% + AJD 1%) vs usada (ITP medio 8%)
    
    if (price <= 0) return;

    let tax = 0;
    if (type === 'nueva') {
      tax = price * 0.11; // 10% IVA + ~1% AJD
    } else {
      tax = price * 0.08; // 8% ITP medio en España
    }

    const notary = 600 + (price * 0.001);
    const registry = 400 + (price * 0.0006);
    const gestoria = 350;
    const totalCosts = tax + notary + registry + gestoria;

    costsTaxEl.textContent = formatEur(tax);
    costsNotaryEl.textContent = formatEur(notary);
    costsRegistryEl.textContent = formatEur(registry);
    costsTotalEl.textContent = formatEur(totalCosts);
  }

  // Event Listeners
  [loanAmountInput, interestRateInput, loanTermInput].forEach(el => {
    el.addEventListener('input', calculateMortgage);
  });

  [amortExtraInput, amortTypeSelect].forEach(el => {
    el.addEventListener('input', calculateMortgage);
  });

  [propertyPriceInput, propertyTypeSelect].forEach(el => {
    el.addEventListener('input', calculatePurchaseCosts);
  });

  // Initial calculation run
  calculateMortgage();
  calculatePurchaseCosts();
});

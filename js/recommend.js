function findAvailableStaff(date, type) {
  return getStaffByType(type).filter(s => !s.bookedDates.includes(date));
}

function generateAllCombos(date) {
  const emcees = findAvailableStaff(date, STAFF_TYPES.EMCEE);
  const photographers = findAvailableStaff(date, STAFF_TYPES.PHOTOGRAPHER);
  const cameramen = findAvailableStaff(date, STAFF_TYPES.CAMERAMAN);
  const makeups = findAvailableStaff(date, STAFF_TYPES.MAKEUP);

  if (emcees.length === 0 || photographers.length === 0 ||
      cameramen.length === 0 || makeups.length === 0) {
    return { combos: [], missing: {
      emcee: emcees.length === 0,
      photographer: photographers.length === 0,
      cameraman: cameramen.length === 0,
      makeup: makeups.length === 0
    }};
  }

  const combos = [];
  for (const e of emcees) {
    for (const p of photographers) {
      for (const c of cameramen) {
        for (const m of makeups) {
          const total = e.price + p.price + c.price + m.price;
          combos.push({
            emcee: e,
            photographer: p,
            cameraman: c,
            makeup: m,
            totalPrice: total
          });
        }
      }
    }
  }
  return { combos, missing: null };
}

function sortCombosByBudget(combos, budgetTarget, budgetMin, budgetMax) {
  const filtered = combos.filter(c =>
    c.totalPrice >= (budgetMin || 0) &&
    c.totalPrice <= (budgetMax || Infinity)
  );

  const withDiff = filtered.map(c => ({
    ...c,
    budgetDiff: Math.abs(c.totalPrice - budgetTarget)
  }));

  withDiff.sort((a, b) => a.budgetDiff - b.budgetDiff);

  if (withDiff.length === 0) {
    const allWithDiff = combos.map(c => ({
      ...c,
      budgetDiff: Math.abs(c.totalPrice - budgetTarget)
    }));
    allWithDiff.sort((a, b) => a.budgetDiff - b.budgetDiff);
    return allWithDiff.slice(0, 20);
  }

  return withDiff.slice(0, 20);
}

function getBudgetMatchClass(totalPrice, budgetTarget) {
  const diff = totalPrice - budgetTarget;
  const ratio = Math.abs(diff) / budgetTarget;
  if (ratio <= 0.05) return { class: 'perfect', text: '✨ 完美匹配预算'};
  if (ratio <= 0.15) return { class: 'good', text: diff > 0 ? `超出预算 ${formatCurrency(diff)}` : `低于预算 ${formatCurrency(Math.abs(diff))}`};
  return { class: 'over', text: diff > 0 ? `超出预算 ${formatCurrency(diff)}` : `低于预算 ${formatCurrency(Math.abs(diff))}`};
}

function getReplaceCandidates(currentCombo, replaceType, budgetTarget, date) {
  const current = currentCombo[replaceType];
  const available = findAvailableStaff(date, replaceType).filter(s => s.id !== current.id);

  const othersTotal = currentCombo.totalPrice - current.price;

  return available.map(s => {
    const newTotal = othersTotal + s.price;
    return {
      staff: s,
      newTotalPrice: newTotal,
      priceDiff: s.price - current.price,
      budgetDiff: Math.abs(newTotal - budgetTarget)
    };
  }).sort((a, b) => a.budgetDiff - b.budgetDiff);
}

function getMissingTypesText(missing) {
  const types = [];
  if (missing.emcee) types.push('司仪');
  if (missing.photographer) types.push('摄影');
  if (missing.cameraman) types.push('摄像');
  if (missing.makeup) types.push('化妆');
  return types.join('、');
}

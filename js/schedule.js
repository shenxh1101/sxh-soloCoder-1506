function checkStaffConflict(staffId, date) {
  const staff = getStaffById(staffId);
  if (!staff) {
    return { hasConflict: false };
  }
  if (staff.bookedDates.includes(date)) {
    return {
      hasConflict: true,
      conflictInfo: `${TYPE_LABELS[staff.type].icon} ${staff.name} 在 ${date} 已有预订安排`
    };
  }
  return { hasConflict: false };
}

function checkComboConflict(combo, date) {
  const conflicts = [];
  ['emcee', 'photographer', 'cameraman', 'makeup'].forEach(type => {
    const staff = combo[type];
    if (staff && staff.bookedDates.includes(date)) {
      conflicts.push(`${TYPE_LABELS[type].icon} ${staff.name} 在 ${date} 已有预订`);
    }
  });
  return { hasConflict: conflicts.length > 0, conflicts };
}

function getUnbookedDatesForStaff(staffId, startDate, endDate) {
  const staff = getStaffById(staffId);
  if (!staff) return [];

  const unbooked = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDate(d);
    if (!staff.bookedDates.includes(dateStr)) {
      unbooked.push(dateStr);
    }
  }
  return unbooked;
}

function getUnbookedSchedule(startDate, endDate, types) {
  const results = [];
  const staffList = getStaffList();

  staffList.forEach(staff => {
    if (types && types.length > 0 && !types.includes(staff.type)) return;

    const unbookedDates = getUnbookedDatesForStaff(staff.id, startDate, endDate);
    unbookedDates.forEach(date => {
      results.push({
        date: date,
        weekday: getWeekday(date),
        staffId: staff.id,
        staffName: staff.name,
        staffType: staff.type,
        staffTypeLabel: TYPE_LABELS[staff.type].label,
        staffTypeIcon: TYPE_LABELS[staff.type].icon,
        stars: staff.stars,
        price: staff.price,
        priceFormatted: formatCurrency(staff.price)
      });
    });
  });

  results.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.staffType !== b.staffType) return a.staffType.localeCompare(b.staffType);
    return a.staffName.localeCompare(b.staffName);
  });

  return results;
}

function getWeekday(dateStr) {
  const d = new Date(dateStr);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekdays[d.getDay()];
}

function getStaffStatusOnDate(date) {
  return getStaffList().map(s => ({
    ...s,
    available: !s.bookedDates.includes(date)
  }));
}

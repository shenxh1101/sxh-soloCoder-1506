const STAFF_TYPES = {
  EMCEE: 'emcee',
  PHOTOGRAPHER: 'photographer',
  CAMERAMAN: 'cameraman',
  MAKEUP: 'makeup'
};

const TYPE_LABELS = {
  emcee: { label: '司仪', icon: '🎤' },
  photographer: { label: '摄影师', icon: '📷' },
  cameraman: { label: '摄像师', icon: '🎥' },
  makeup: { label: '化妆师', icon: '💄' }
};

const CONTRACT_STATUS = {
  NOT_GENERATED: 'not_generated',
  DRAFT: 'draft',
  PRINTED: 'printed',
  SIGNED: 'signed',
  CANCELLED: 'cancelled'
};

const CONTRACT_STATUS_LABELS = {
  not_generated: { label: '未生成', icon: '⚪', color: '#A0896C' },
  draft: { label: '草稿', icon: '📝', color: '#2D6A4F' },
  printed: { label: '已打印', icon: '🖨️', color: '#B8956A' },
  signed: { label: '已签约', icon: '✅', color: '#2D6A4F' },
  cancelled: { label: '已取消', icon: '❌', color: '#C92A2A' }
};

const BALANCE_STATUS = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid'
};

const BALANCE_STATUS_LABELS = {
  unpaid: { label: '未付款', icon: '💸', color: '#C92A2A' },
  partial: { label: '部分付款', icon: '💰', color: '#B8956A' },
  paid: { label: '已结清', icon: '✅', color: '#2D6A4F' }
};

const STORAGE_KEYS = {
  STAFF: 'wedding_staff_list',
  BOOKINGS: 'wedding_bookings',
  INIT_FLAG: 'wedding_data_initialized'
};

const EMCEE_NAMES = [
  '王志远', '李婉清', '张博文', '陈思雅',
  '刘浩然', '赵雨萱', '孙明辉', '周梦琪'
];

const PHOTOGRAPHER_NAMES = [
  '林子墨', '黄诗涵', '吴俊杰', '郑雅文',
  '冯若曦', '钱宇航', '褚瑾瑜', '卫婉仪'
];

const CAMERAMAN_NAMES = [
  '蒋天宇', '沈佳琪', '韩梓轩', '杨紫薇',
  '杨逸辰', '朱雅婷', '秦浩然', '许若琳'
];

const MAKEUP_NAMES = [
  '何丽娜', '吕梦涵', '施雨彤', '张梓萱',
  '孔婉君', '曹思远', '严瑾瑜', '华雅琴'
];

const AVATAR_EMCEE = ['🎙️', '👔', '🎤', '🎭', '🗣️', '📢', '🎪', '👨‍💼'];
const AVATAR_PHOTOGRAPHER = ['📷', '📸', '🎬', '📹', '🖼️', '🎞️', '📽️', '🎥'];
const AVATAR_CAMERAMAN = ['🎥', '📹', '🎬', '📽️', '🎞️', '📼', '📺', '🎦'];
const AVATAR_MAKEUP = ['💄', '💅', '💋', '👄', '🌺', '🌸', '✨', '💫'];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomDates(count, startDaysFromNow, endDaysFromNow) {
  const dates = [];
  const today = new Date();
  const usedDates = new Set();
  let attempts = 0;
  while (dates.length < count && attempts < count * 3) {
    const daysAhead = randomInt(startDaysFromNow, endDaysFromNow);
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    const dateStr = formatDate(d);
    if (!usedDates.has(dateStr)) {
      usedDates.add(dateStr);
      dates.push(dateStr);
    }
    attempts++;
  }
  return dates.sort();
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getToday() {
  return formatDate(new Date());
}

function getDateAfter(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

function formatCurrency(n) {
  return '¥' + n.toLocaleString('zh-CN');
}

function generateStaffList() {
  const list = [];
  const typeConfig = [
    { type: STAFF_TYPES.EMCEE, names: EMCEE_NAMES, avatars: AVATAR_EMCEE, priceMin: 3000, priceMax: 12000 },
    { type: STAFF_TYPES.PHOTOGRAPHER, names: PHOTOGRAPHER_NAMES, avatars: AVATAR_PHOTOGRAPHER, priceMin: 4000, priceMax: 15000 },
    { type: STAFF_TYPES.CAMERAMAN, names: CAMERAMAN_NAMES, avatars: AVATAR_CAMERAMAN, priceMin: 5000, priceMax: 18000 },
    { type: STAFF_TYPES.MAKEUP, names: MAKEUP_NAMES, avatars: AVATAR_MAKEUP, priceMin: 2000, priceMax: 10000 }
  ];

  typeConfig.forEach(cfg => {
    cfg.names.forEach((name, idx) => {
      const priceBase = cfg.priceMin + Math.round((cfg.priceMax - cfg.priceMin) * (idx / 7));
      const price = Math.round(priceBase / 500) * 500;
      list.push({
        id: `${cfg.type}_${String(idx + 1).padStart(2, '0')}`,
        type: cfg.type,
        name: name,
        avatar: cfg.avatars[idx % cfg.avatars.length],
        stars: randomInt(3, 5),
        price: price,
        bookedDates: generateRandomDates(randomInt(3, 7), 3, 120)
      });
    });
  });

  return list;
}

let staffCache = null;
let bookingsCache = null;

function initMockData() {
  if (!localStorage.getItem(STORAGE_KEYS.INIT_FLAG)) {
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(generateStaffList()));
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INIT_FLAG, '1');
  }
  staffCache = null;
  bookingsCache = null;
  try {
    const rawStaff = localStorage.getItem(STORAGE_KEYS.STAFF);
    staffCache = rawStaff ? JSON.parse(rawStaff) : [];
    const rawBookings = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    bookingsCache = rawBookings ? JSON.parse(rawBookings) : [];
  } catch (e) {
    console.warn('[initMockData] 缓存预热失败，将延迟加载:', e);
  }
}

function getStaffList() {
  if (staffCache) {
    return staffCache;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STAFF);
    staffCache = raw ? JSON.parse(raw) : [];
  } catch (e) {
    staffCache = [];
  }
  return staffCache;
}

function saveStaffList(list) {
  staffCache = list;
  localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(list));
}

function getStaffById(id) {
  const list = getStaffList() || [];
  return list.find(s => s.id === id);
}

function getStaffByType(type) {
  const list = getStaffList() || [];
  return list.filter(s => s.type === type);
}

function updateStaffBookedDates(staffId, date, add = true) {
  const list = getStaffList();
  const staff = list.find(s => s.id === staffId);
  if (!staff) return false;
  if (add) {
    if (!staff.bookedDates.includes(date)) {
      staff.bookedDates.push(date);
      staff.bookedDates.sort();
    }
  } else {
    staff.bookedDates = staff.bookedDates.filter(d => d !== date);
  }
  saveStaffList(list);
  return true;
}

function isStaffAvailable(staffId, date) {
  const staff = getStaffById(staffId);
  if (!staff) return false;
  return !staff.bookedDates.includes(date);
}

function getBookings(filters = {}) {
  if (!bookingsCache) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      bookingsCache = raw ? JSON.parse(raw) : [];
    } catch (e) {
      bookingsCache = [];
    }
  }
  let result = bookingsCache;
  if (filters.date) {
    result = result.filter(b => b.date === filters.date);
  }
  if (filters.customerName) {
    const keyword = filters.customerName.toLowerCase();
    result = result.filter(b => b.customerName && b.customerName.toLowerCase().includes(keyword));
  }
  if (filters.contractStatus) {
    result = result.filter(b => b.contractStatus === filters.contractStatus);
  }
  if (filters.staffType) {
    if (filters.staffType === 'full_package') {
      result = result.filter(b => !b.singleType && b.emceeId && b.photographerId && b.cameramanId && b.makeupId);
    } else {
      result = result.filter(b => b.singleType === filters.staffType);
    }
  }
  if (filters.staffId) {
    const sid = filters.staffId;
    result = result.filter(b => 
      b.emceeId === sid || b.photographerId === sid || b.cameramanId === sid || b.makeupId === sid
    );
  }
  return result;
}

function getBookingById(id) {
  return getBookings().find(b => b.id === id) || null;
}

function saveBookings(list) {
  bookingsCache = list;
  localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(list));
}

function addBooking(booking) {
  const list = getBookings();
  booking.id = 'BK' + Date.now();
  booking.createdAt = new Date().toISOString();
  if (!booking.remark) booking.remark = '';
  if (!booking.contractNo) booking.contractNo = '';
  if (!booking.contractStatus) booking.contractStatus = CONTRACT_STATUS.NOT_GENERATED;
  if (!booking.weddingVenue) booking.weddingVenue = '';
  if (!booking.salesPerson) booking.salesPerson = '';
  if (!booking.depositAmount) booking.depositAmount = 0;
  if (!booking.balanceStatus) booking.balanceStatus = BALANCE_STATUS.UNPAID;
  list.push(booking);
  saveBookings(list);
  if (booking.emceeId) updateStaffBookedDates(booking.emceeId, booking.date, true);
  if (booking.photographerId) updateStaffBookedDates(booking.photographerId, booking.date, true);
  if (booking.cameramanId) updateStaffBookedDates(booking.cameramanId, booking.date, true);
  if (booking.makeupId) updateStaffBookedDates(booking.makeupId, booking.date, true);
  return booking;
}

function deleteBooking(bookingId) {
  const list = getBookings();
  const idx = list.findIndex(b => b.id === bookingId);
  if (idx === -1) return false;
  const booking = list[idx];
  if (booking.emceeId) updateStaffBookedDates(booking.emceeId, booking.date, false);
  if (booking.photographerId) updateStaffBookedDates(booking.photographerId, booking.date, false);
  if (booking.cameramanId) updateStaffBookedDates(booking.cameramanId, booking.date, false);
  if (booking.makeupId) updateStaffBookedDates(booking.makeupId, booking.date, false);
  list.splice(idx, 1);
  saveBookings(list);
  return true;
}

function updateBooking(bookingId, updates) {
  const list = getBookings();
  const idx = list.findIndex(b => b.id === bookingId);
  if (idx === -1) return { success: false, message: '预订记录不存在' };

  const oldBooking = { ...list[idx] };
  const newBooking = { ...oldBooking, ...updates };

  if (updates.date && updates.date !== oldBooking.date) {
    const staffIds = [];
    if (oldBooking.emceeId) staffIds.push(oldBooking.emceeId);
    if (oldBooking.photographerId) staffIds.push(oldBooking.photographerId);
    if (oldBooking.cameramanId) staffIds.push(oldBooking.cameramanId);
    if (oldBooking.makeupId) staffIds.push(oldBooking.makeupId);

    for (const sid of staffIds) {
      const conflict = checkStaffConflict(sid, updates.date);
      if (conflict.hasConflict) {
        const staff = getStaffById(sid);
        return { 
          success: false, 
          message: `${staff ? staff.name : '该人员'} 在 ${updates.date} 已有预订，无法修改日期` 
        };
      }
    }

    if (oldBooking.emceeId) {
      updateStaffBookedDates(oldBooking.emceeId, oldBooking.date, false);
      updateStaffBookedDates(oldBooking.emceeId, updates.date, true);
    }
    if (oldBooking.photographerId) {
      updateStaffBookedDates(oldBooking.photographerId, oldBooking.date, false);
      updateStaffBookedDates(oldBooking.photographerId, updates.date, true);
    }
    if (oldBooking.cameramanId) {
      updateStaffBookedDates(oldBooking.cameramanId, oldBooking.date, false);
      updateStaffBookedDates(oldBooking.cameramanId, updates.date, true);
    }
    if (oldBooking.makeupId) {
      updateStaffBookedDates(oldBooking.makeupId, oldBooking.date, false);
      updateStaffBookedDates(oldBooking.makeupId, updates.date, true);
    }
  }

  list[idx] = newBooking;
  saveBookings(list);
  return { success: true, booking: newBooking };
}

function addSingleBooking(type, staffId, date, customerName, customerPhone, remark, contractNo, extraData = {}) {
  const staff = getStaffById(staffId);
  if (!staff) return { success: false, message: '人员不存在' };
  if (staff.bookedDates.includes(date)) {
    return { success: false, message: `${staff.name} 在 ${date} 已有预订` };
  }
  const list = getBookings();
  const booking = {
    id: 'BK' + Date.now(),
    date: date,
    customerName: customerName || '',
    customerPhone: customerPhone || '',
    remark: remark || '',
    contractNo: contractNo || '',
    contractStatus: CONTRACT_STATUS.NOT_GENERATED,
    weddingVenue: extraData.weddingVenue || '',
    salesPerson: extraData.salesPerson || '',
    depositAmount: extraData.depositAmount || 0,
    balanceStatus: extraData.balanceStatus || BALANCE_STATUS.UNPAID,
    emceeId: type === STAFF_TYPES.EMCEE ? staffId : null,
    photographerId: type === STAFF_TYPES.PHOTOGRAPHER ? staffId : null,
    cameramanId: type === STAFF_TYPES.CAMERAMAN ? staffId : null,
    makeupId: type === STAFF_TYPES.MAKEUP ? staffId : null,
    totalPrice: staff.price,
    singleType: type,
    createdAt: new Date().toISOString()
  };
  list.push(booking);
  saveBookings(list);
  updateStaffBookedDates(staffId, date, true);
  return { success: true, booking };
}

function updateContractStatus(bookingId, newStatus) {
  const result = updateBooking(bookingId, { contractStatus: newStatus });
  if (result.success) {
    bookingsCache = null;
  }
  return result;
}

function resetAllData() {
  localStorage.removeItem(STORAGE_KEYS.STAFF);
  localStorage.removeItem(STORAGE_KEYS.BOOKINGS);
  localStorage.removeItem(STORAGE_KEYS.INIT_FLAG);
  staffCache = null;
  bookingsCache = null;
  initMockData();
}

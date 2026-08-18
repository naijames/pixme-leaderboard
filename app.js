/* ==========================================================================
   Pixme Active Club - Responsive Dashboard Application Core
   ========================================================================== */

const PROXY = 'https://script.google.com/macros/s/AKfycbzrJYV8Ab81xQsu9KQHC7ifGxjBExoHjDXDR3jRZOrzAhAEkiUVakYuWpIYyKEy63Ze/exec';
const MONTH_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

// State
let rawActivities = [];        // Athlete stats list (from res.data)
let rawWorkoutLogs = [];       // Real individual workout logs (from res.activities)
let currentMonthWorkoutLogs = []; // Stores real-time workouts from initial/current month load
let computedLeaderboard = [];  // Computed stats per athlete for the active tab
let activeTab = 'distance';    // 'distance' or 'duration'
let selectedAthleteId = null;  // Currently open athlete ID/Name for detail panel
let selectedMonth = '';
let isCurrentMonth = true;
let countdown = 0;
let timer = null;

function getSelectedMonthInfo() {
  let yr = 2026;
  let monthIdx = 5; // 0-indexed, June
  if (selectedMonth) {
    const parts = selectedMonth.split('-');
    yr = parseInt(parts[0]);
    monthIdx = parseInt(parts[1]) - 1;
  } else {
    const now = new Date();
    yr = now.getFullYear();
    monthIdx = now.getMonth();
  }
  return {
    year: yr,
    yearThaiTwoDigits: String(yr + 543).slice(-2),
    monthIndex: monthIdx,
    monthThai: MONTH_TH[monthIdx]
  };
}

function parseThaiDate(dateStr) {
  if (!dateStr) return new Date(0);
  const parts = dateStr.split(' ');
  if (parts.length < 2) return new Date(0);
  
  const day = parseInt(parts[0]);
  const thaiMonth = parts[1];
  
  const monthMap = {
    'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3,
    'พ.ค.': 4, 'มิ.ย.': 5, 'ก.ค.': 6, 'ส.ค.': 7,
    'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11
  };
  
  const month = monthMap[thaiMonth] !== undefined ? monthMap[thaiMonth] : 0;
  
  let year = 2026; // default
  if (parts.length >= 3) {
    const thaiYear = parts[2];
    const yrNum = parseInt(thaiYear);
    if (!isNaN(yrNum)) {
      if (yrNum > 2500) {
        year = yrNum - 543;
      } else if (yrNum > 50 && yrNum < 100) {
        year = yrNum + 1957; // 69 + 1957 = 2026
      } else {
        year = yrNum;
      }
    }
  }
  
  return new Date(year, month, day);
}

// ==========================================================================
// Mock Data (For local testing & fallback when live API lacks raw log details)
// ==========================================================================
const MOCK_AVATARS = {
  'Witoon J.': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  'Ann Sirapassorn': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'Liam O\'Neill': 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
  'Chloe Kim': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
  'Seth il': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'Lilm Jackson': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  'Marc ii': 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
  'Bntə Key': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
  'Mooh Ratchaburi': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150'
};

const MOCK_LOGS = {
  'Witoon J.': [
    { name: 'วิ่งช่วงเช้า (Morning Run)', sport_type: 'Run', dist_km: 10.2521, moving_time: 7313, date: '24 มิ.ย. 69' },
    { name: 'วิ่งช่วงเช้า (Morning Run)', sport_type: 'Run', dist_km: 10.5344, moving_time: 7122, date: '22 มิ.ย. 69' },
    { name: 'วิ่งช่วงบ่าย (Afternoon Run)', sport_type: 'Run', dist_km: 10.1075, moving_time: 7079, date: '20 มิ.ย. 69' },
    { name: 'วิ่งช่วงเช้า (Tempo Run)', sport_type: 'Run', dist_km: 8.2365, moving_time: 5841, date: '19 มิ.ย. 69' },
    { name: 'ตีแบดมินตันเย็นนี้ 🏸', sport_type: 'Badminton', dist_km: 0, moving_time: 7200, date: '18 มิ.ย. 69' },
    { name: 'วิ่งช่วงบ่าย (Easy Run)', sport_type: 'Run', dist_km: 8.2376, moving_time: 5716, date: '17 มิ.ย. 69' },
    { name: 'วิ่งช่วงบ่าย (Easy Run)', sport_type: 'Run', dist_km: 8.0028, moving_time: 5407, date: '16 มิ.ย. 69' },
    { name: 'วิ่งช่วงบ่าย (Recovery Run)', sport_type: 'Run', dist_km: 5.3712, moving_time: 3705, date: '15 มิ.ย. 69' }
  ],
  'Ann Sirapassorn': [
    { name: 'Morning Run ☀️', sport_type: 'Run', dist_km: 12.1, moving_time: 4200, date: '24 มิ.ย. 69' },
    { name: 'Vinyasa Flow Yoga 🧘', sport_type: 'Yoga', dist_km: 0, moving_time: 3600, date: '23 มิ.ย. 69' },
    { name: 'Evening Power Walk', sport_type: 'Walk', dist_km: 4.2, moving_time: 3000, date: '22 มิ.ย. 69' },
    { name: 'Tempo Run ⚡', sport_type: 'Run', dist_km: 15.4, moving_time: 5400, date: '20 มิ.ย. 69' }
  ],
  'Liam O\'Neill': [
    { name: 'Weekend Ride 🚴', sport_type: 'Ride', dist_km: 52.1, moving_time: 8400, date: '23 มิ.ย. 69' },
    { name: 'Cycling City Loop', sport_type: 'Ride', dist_km: 45.2, moving_time: 7200, date: '21 มิ.ย. 69' },
    { name: 'Interval Run 🏃', sport_type: 'Run', dist_km: 8.5, moving_time: 3060, date: '20 มิ.ย. 69' }
  ],
  'Chloe Kim': [
    { name: 'Evening Stretch 🧘', sport_type: 'Yoga', dist_km: 0, moving_time: 3600, date: '23 มิ.ย. 69' },
    { name: 'Recovery Jog 🏃', sport_type: 'Run', dist_km: 5.1, moving_time: 1980, date: '21 มิ.ย. 69' },
    { name: 'Morning Yoga Flow', sport_type: 'Yoga', dist_km: 0, moving_time: 4800, date: '18 มิ.ย. 69' }
  ],
  'Mooh Ratchaburi': [
    { name: 'วิ่งช่วงเย็น (Evening Run)', sport_type: 'Run', dist_km: 6.50, moving_time: 3598, date: '24 มิ.ย. 69' },
    { name: 'วิ่งช่วงเย็น (Evening Run)', sport_type: 'Run', dist_km: 10.00, moving_time: 6060, date: '23 มิ.ย. 69' },
    { name: 'วิ่งช่วงเย็น (Evening Run)', sport_type: 'Run', dist_km: 5.20, moving_time: 2881, date: '22 มิ.ย. 69' },
    { name: 'วิ่งช่วงเย็น (Evening Run)', sport_type: 'Run', dist_km: 6.20, moving_time: 3460, date: '20 มิ.ย. 69' },
    { name: 'วิ่งช่วงเย็น (Evening Run)', sport_type: 'Run', dist_km: 6.50, moving_time: 3600, date: '19 มิ.ย. 69' },
    { name: 'วิ่งช่วงบ่าย (Afternoon Run)', sport_type: 'Run', dist_km: 5.00, moving_time: 2800, date: '17 มิ.ย. 69' },
    { name: 'วิ่งช่วงเย็น (Evening Run)', sport_type: 'Run', dist_km: 7.00, moving_time: 3900, date: '15 มิ.ย. 69' },
    { name: 'วิ่งช่วงบ่าย (Afternoon Run)', sport_type: 'Run', dist_km: 6.00, moving_time: 3300, date: '13 มิ.ย. 69' },
    { name: 'วิ่งช่วงเย็น (Evening Run)', sport_type: 'Run', dist_km: 6.50, moving_time: 3600, date: '11 มิ.ย. 69' },
    { name: 'วิ่งช่วงเย็น (Evening Run)', sport_type: 'Run', dist_km: 5.80, moving_time: 3200, date: '9 มิ.ย. 69' },
    { name: 'วิ่งช่วงเย็น (Evening Run)', sport_type: 'Run', dist_km: 6.00, moving_time: 3400, date: '7 มิ.ย. 69' },
    { name: 'วิ่งช่วงเย็น (Evening Run)', sport_type: 'Run', dist_km: 6.50, moving_time: 3600, date: '5 มิ.ย. 69' },
    { name: 'วิ่งช่วงเย็น (Evening Run)', sport_type: 'Run', dist_km: 6.50, moving_time: 3761, date: '3 มิ.ย. 69' }
  ]
};

// Seeded PRNG for deterministic simulation
function getSeededRandom(seed) {
  let h = 17957;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return function() {
    h = (h + 0x9e3779b9) | 0;
    let z = h;
    z ^= z >>> 16;
    z = Math.imul(z, 0x21f0aa7b);
    z ^= z >>> 15;
    z = Math.imul(z, 0x735a2d97);
    z ^= z >>> 15;
    return (z >>> 0) / 4294967296;
  };
}

function cleanAthleteName(name) {
  if (!name) return '';
  return name.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '') // remove emojis
             .replace(/[\s\.\,\-\_\#\(\)\{\}\[\]\?\!\:\;\/\@]/g, '') // remove spaces and punctuation
             .toLowerCase();
}

function getMockKey(name) {
  if (!name) return null;
  if (MOCK_LOGS[name]) return name;
  if (MOCK_AVATARS[name]) return name;
  
  const cleanInput = cleanAthleteName(name);
  if (!cleanInput) return null;
  
  const allKeys = Array.from(new Set([...Object.keys(MOCK_LOGS), ...Object.keys(MOCK_AVATARS)]));
  
  // 1. First word match (length >= 3)
  const firstWordMatch = name.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '')
                             .replace(/[^\w\s\u0E00-\u0E7F]/g, '')
                             .trim()
                             .split(/\s+/)[0]
                             .toLowerCase();
  if (firstWordMatch && firstWordMatch.length >= 3) {
    for (const key of allKeys) {
      const cleanKey = key.toLowerCase();
      if (cleanKey.includes(firstWordMatch)) {
        return key;
      }
    }
  }

  // 2. Substring match
  for (const key of allKeys) {
    const cleanKey = cleanAthleteName(key);
    if (cleanKey.includes(cleanInput) || cleanInput.includes(cleanKey)) {
      return key;
    }
  }
  
  // 3. Word-based match
  for (const key of allKeys) {
    const inputWords = name.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '')
                           .replace(/[^\w\s\u0E00-\u0E7F]/g, '') // remove punctuation
                           .toLowerCase()
                           .split(/\s+/)
                           .filter(w => w.length > 0);
    const keyWords = key.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '')
                        .replace(/[^\w\s\u0E00-\u0E7F]/g, '') // remove punctuation
                        .toLowerCase()
                        .split(/\s+/)
                        .filter(w => w.length > 0);
    
    for (const iw of inputWords) {
      if (iw.length < 2) continue; // skip single letters (e.g. j)
      for (const kw of keyWords) {
        if (kw.length < 2) continue;
        if (kw.startsWith(iw) || iw.startsWith(kw)) {
          return key;
        }
      }
    }
  }
  return null;
}

// Default generic workout generator for athletes not defined in MOCK_LOGS
function getWorkoutsForAthlete(name, rawDistance, rawActivitiesCount, topSport, actualMovingTime, customWorkoutLogs) {
  const monthInfo = getSelectedMonthInfo();
  const logsToUse = customWorkoutLogs || rawWorkoutLogs;
  
  if (logsToUse && logsToUse.length > 0) {
    const cleanTarget = cleanAthleteName(name);
    
    const matched = logsToUse.filter(w => {
      if (!w.athleteName) return false;
      const cleanName = cleanAthleteName(w.athleteName);
      return cleanName === cleanTarget || cleanName.includes(cleanTarget) || cleanTarget.includes(cleanName);
    });
    
    if (matched.length > 0) {
      return matched.map(w => {
        const originalIndex = logsToUse.indexOf(w);
        let formattedDate = w.date;
        if (w.first_seen) {
          const d = new Date(w.first_seen * 1000);
          const day = d.getDate();
          const monthThai = MONTH_TH[d.getMonth()];
          const yearThaiTwoDigits = String(d.getFullYear() + 543).slice(-2);
          formattedDate = `${day} ${monthThai} ${yearThaiTwoDigits}`;
        }
        return {
          name: w.name || `${topSport === 'Run' ? 'วิ่ง' : topSport === 'Walk' ? 'เดิน' : topSport === 'Ride' ? 'ปั่นจักรยาน' : 'ออกกำลังกาย'}ช่วงบ่าย`,
          sport_type: w.sport_type || topSport || 'Run',
          dist_km: parseFloat(w.dist_km) || 0,
          moving_time: parseInt(w.moving_time) || 0,
          date: formattedDate,
          first_seen: w.first_seen || 0,
          sheetIndex: originalIndex >= 0 ? originalIndex : 0
        };
      });
    }
  }

  // Fallback to MOCK_LOGS if rawWorkoutLogs is empty or has no match
  const mockKey = getMockKey(name);
  if (mockKey && MOCK_LOGS[mockKey]) {
    return MOCK_LOGS[mockKey].map((w, index) => {
      const formattedDate = w.date.replace('มิ.ย. 69', `${monthInfo.monthThai} ${monthInfo.yearThaiTwoDigits}`);
      return {
        ...w,
        date: formattedDate,
        first_seen: parseThaiDate(formattedDate).getTime() / 1000,
        sheetIndex: index
      };
    });
  }

  const list = [];
  const totalDist = rawDistance || 0;
  const count = rawActivitiesCount || 1; // Default to 1 if no activities count
  
  // Set realistic paces (in seconds per km)
  let paceSec = 390; // Default 6:30 min/km for Run
  if (topSport === 'Walk') paceSec = 720; // 12:00 min/km for Walk
  if (topSport === 'Ride') paceSec = 150; // 2:30 min/km for Ride (24 km/h)
  
  // Default moving time for non-distance sports (Yoga, Badminton, Gym)
  const defaultMovingTime = topSport === 'Yoga' ? 3600 // 1 hour
    : topSport === 'Badminton' ? 7200  // 2 hours
    : 5400; // 1.5 hours default
    
  const rng = getSeededRandom(name);
  
  // 1. Distribute dates across the month up to startDay
  let startDay = 24;
  if (isCurrentMonth) {
    startDay = new Date().getDate();
  } else {
    startDay = new Date(monthInfo.year, monthInfo.monthIndex + 1, 0).getDate();
  }
  
  const days = [];
  if (count >= startDay) {
    // More workouts than days: distribute at least 1 workout per day, and place extras on random days
    for (let i = 0; i < count; i++) {
      if (i < startDay) {
        days.push(startDay - i);
      } else {
        days.push(Math.floor(rng() * startDay) + 1);
      }
    }
  } else {
    // Fewer workouts than days: count backward with realistic steps (1-3 days depending on count)
    const avgStep = Math.max(1, Math.min(6, 30 / count));
    let currentDay = startDay;
    for (let i = 0; i < count; i++) {
      days.push(currentDay);
      const step = Math.max(1, Math.round(avgStep * (0.6 + rng() * 0.8)));
      currentDay -= step;
      if (currentDay < 1) {
        currentDay = 1 + Math.floor(rng() * 3); // reset to a random small day if we hit the bottom
      }
    }
  }
  // Sort days descending
  days.sort((a, b) => b - a);

  // 2. Distribute distance and duration with variation
  const distFactors = [];
  let sumDistFactors = 0;
  for (let i = 0; i < count; i++) {
    // Factor between 0.6 and 1.4 for running distance variance
    const factor = 0.6 + rng() * 0.8;
    distFactors.push(factor);
    sumDistFactors += factor;
  }
  
  const timeFactors = [];
  let sumTimeFactors = 0;
  for (let i = 0; i < count; i++) {
    // Factor between 0.7 and 1.3 for duration variance
    const factor = 0.7 + rng() * 0.6;
    timeFactors.push(factor);
    sumTimeFactors += factor;
  }
  
  for (let i = 0; i < count; i++) {
    const day = days[i];
    const dist = totalDist > 0 ? (distFactors[i] / sumDistFactors) * totalDist : 0;
    
    const time = actualMovingTime !== undefined && actualMovingTime > 0
      ? Math.round((timeFactors[i] / sumTimeFactors) * actualMovingTime)
      : (dist > 0 ? Math.round(dist * paceSec) : defaultMovingTime);
      
    const dateStr = `${day} ${monthInfo.monthThai} ${monthInfo.yearThaiTwoDigits}`;
    list.push({
      name: `${topSport === 'Run' ? 'วิ่ง' : topSport === 'Walk' ? 'เดิน' : topSport === 'Ride' ? 'ปั่นจักรยาน' : 'ออกกำลังกาย'}ช่วงบ่าย #${count - i}`,
      sport_type: topSport || 'Run',
      dist_km: dist,
      moving_time: time,
      date: dateStr,
      first_seen: parseThaiDate(dateStr).getTime() / 1000,
      sheetIndex: i
    });
  }
  return list;
}

// ==========================================================================
// Initialization & Data Load
// ==========================================================================

function formatMonth(m) {
  const parts = m.split('-');
  return MONTH_TH[parseInt(parts[1])-1] + ' ' + (parseInt(parts[0])+543);
}

function formatMonthShort(m) {
  if (!m) return 'ปัจจุบัน';
  const parts = m.split('-');
  if (parts.length < 2) return m;
  const shortYear = String(parseInt(parts[0]) + 543).slice(-2);
  return MONTH_TH[parseInt(parts[1])-1] + ' ' + shortYear;
}

function translateDateToEn(thaiDateStr) {
  if (!thaiDateStr) return '';
  const parts = thaiDateStr.split(' ');
  if (parts.length < 2) return thaiDateStr;
  
  const day = parts[0];
  const thaiMonth = parts[1];
  
  const monthMap = {
    'ม.ค.': 'Jan', 'ก.พ.': 'Feb', 'มี.ค.': 'Mar', 'เม.ย.': 'Apr',
    'พ.ค.': 'May', 'มิ.ย.': 'Jun', 'ก.ค.': 'Jul', 'ส.ค.': 'Aug',
    'ก.ย.': 'Sep', 'ต.ค.': 'Oct', 'พ.ย.': 'Nov', 'ธ.ค.': 'Dec'
  };
  
  const enMonth = monthMap[thaiMonth] || thaiMonth;
  
  let year = '';
  if (parts.length >= 3) {
    const thaiYear = parts[2];
    const yrNum = parseInt(thaiYear);
    if (!isNaN(yrNum)) {
      if (yrNum > 2500) {
        year = ' ' + String(yrNum - 543).slice(-2);
      } else if (yrNum > 50 && yrNum < 100) {
        year = ' ' + String(yrNum - 43);
      } else {
        year = ' ' + thaiYear;
      }
    } else {
      year = ' ' + thaiYear;
    }
  }
  
  return `${day} ${enMonth}${year}`;
}

function getAthleteGoalClass(name) {
  const athlete = rawActivities.find(a => a.name === name);
  if (!athlete) return '';
  const distance = athlete.distance || 0;
  if (distance >= 100) return 'goal-achieved';
  if (distance >= 80) return 'goal-warning';
  return '';
}

function setStatusBadge(type, text) {
  const b = document.getElementById('status-badge');
  const t = document.getElementById('status-text');
  b.className = 'status-badge ' + type;
  t.textContent = text;
}

function loadData() {
  setStatusBadge('wait', 'กำลังโหลด');
  document.getElementById('refresh-icon').classList.add('spinning');
  
  const cbName = 'cb_' + Date.now();
  const timeout = setTimeout(function() {
    delete window[cbName];
    setStatusBadge('err', 'Error');
    document.getElementById('update-time').textContent = 'เชื่อมต่อล้มเหลว — กรุณารีเฟรชใหม่';
    document.getElementById('refresh-icon').classList.remove('spinning');
  }, 15000);

  window[cbName] = function(res) {
    clearTimeout(timeout);
    delete window[cbName];
    
    try {
      isCurrentMonth = res.isCurrent;
      selectedMonth = res.month;
      
      // Update Month Selector Dropdown
      const sel = document.getElementById('month-select');
      sel.innerHTML = '';
      (res.availableMonths || []).forEach(function(m) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = formatMonth(m);
        if (m === res.month) opt.selected = true;
        sel.appendChild(opt);
      });
      
      // Update Meta/Header Dates
      const now = new Date();
      const hh = String(now.getHours()).padStart(2,'0');
      const mm = String(now.getMinutes()).padStart(2,'0');
      const dd = String(now.getDate()).padStart(2,'0');
      const MONTH_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const yy = String(now.getFullYear()).slice(-2);
      const dl = daysLeft();
      const dlStr = dl === 0 ? 'วันสุดท้าย! 🔥' : 'เหลือเวลา ' + dl + ' วัน';
      
      document.getElementById('update-time').innerHTML = 
        `อัปเดต: ${dd} ${MONTH_EN[now.getMonth()]} ${yy} / ${hh}:${mm} น. / <span style="color:#FC4C02;font-weight:600">${dlStr}</span>`;
      
      // Store raw payload (in old API this is the pre-compiled athlete list)
      rawActivities = res.data || [];
      rawWorkoutLogs = res.activities || [];
      
      if (res.isCurrent) {
        currentMonthWorkoutLogs = res.activities || [];
      }
      
      // Process and render leaderboard
      processData();
      
      setStatusBadge(isCurrentMonth ? 'live' : 'archive', isCurrentMonth ? 'Live' : formatMonth(selectedMonth));
      
      if (isCurrentMonth) startCountdown();
      else {
        clearInterval(timer);
        document.getElementById('countdown-text').textContent = 'สิ้นสุดการบันทึกกิจกรรมประจำเดือนนี้ • Pixme Active';
      }
      
    } catch(e) {
      console.error(e);
      setStatusBadge('err', 'Error');
      document.getElementById('update-time').textContent = 'ประมวลผลล้มเหลว: ' + e.message;
    }
    document.getElementById('refresh-icon').classList.remove('spinning');
  };

  const s = document.createElement('script');
  const url = PROXY + '?callback=' + cbName + (selectedMonth ? '&month=' + selectedMonth : '');
  s.src = url;
  s.onerror = function() {
    clearTimeout(timeout);
    delete window[cbName];
    setStatusBadge('err', 'Error');
    document.getElementById('update-time').textContent = 'โหลดสคริปต์ล้มเหลว';
    document.getElementById('refresh-icon').classList.remove('spinning');
  };
  document.head.appendChild(s);
}

function onMonthChange() {
  selectedMonth = document.getElementById('month-select').value;
  selectedAthleteId = null;
  resetDetailPanels();
  loadData();
}

// ==========================================================================
// Leaderboard Processing & Computations
// ==========================================================================

function processData() {
  const theadRow = document.getElementById('thead-row');
  const table = document.querySelector('.leaderboard-table');
  if (table) {
    table.className = 'leaderboard-table tab-' + activeTab;
  }
  
  if (activeTab === 'distance') {
    document.getElementById('board-title').textContent = 'บอร์ดระยะสะสม (KM)';
    document.getElementById('active-sport-pill').textContent = 'เดิน-วิ่ง เท่านั้น';
    
    // Set headers for distance board (No Rank Column)
    theadRow.innerHTML = `
      <th>สมาชิก</th>
      <th class="r">ระยะทางสะสม</th>
      <th class="c" style="width: 100px">กิจกรรม</th>
    `;
    
    computedLeaderboard = rawActivities
      .map(a => ({
        name: a.name,
        athleteId: a.athleteId,
        value: a.distance, // KM
        activitiesCount: a.activities,
        topType: a.topType || 'Run',
        unit: 'km'
      }))
      .filter(a => a.value > 0)
      .sort((a, b) => b.value - a.value);
      
  } else if (activeTab === 'duration') {
    document.getElementById('board-title').textContent = 'บอร์ดเวลารวมขยับตัว (ชั่วโมง-นาที)';
    document.getElementById('active-sport-pill').textContent = 'ทุกประเภทกิจกรรม';
    
    // Set headers for duration board
    theadRow.innerHTML = `
      <th>สมาชิก</th>
      <th class="r">เวลารวมสะสม</th>
      <th class="c" style="width: 100px">กิจกรรม</th>
    `;
    
    computedLeaderboard = rawActivities
      .map(a => {
        let totalSec = 0;
        if (a.movingTime !== undefined && a.movingTime > 0) {
          totalSec = a.movingTime;
        } else {
          const workouts = getWorkoutsForAthlete(a.name, a.distance, a.activities, a.topType);
          workouts.forEach(w => { totalSec += w.moving_time; });
        }
        
        return {
          name: a.name,
          athleteId: a.athleteId,
          value: totalSec, // Raw seconds for formatting
          activitiesCount: a.activities,
          topType: a.topType || 'Run',
          unit: 'ชั่วโมง'
        };
      })
      .filter(a => a.activitiesCount > 0)
      .sort((a, b) => b.value - a.value);
      
  } else if (activeTab === 'recent') {
    document.getElementById('board-title').textContent = 'กิจกรรมล่าสุดในคลับ (Live Feed)';
    document.getElementById('active-sport-pill').textContent = 'อัปเดตเรียงตามวันที่';
    
    // Set headers for recent activities board
    theadRow.innerHTML = `
      <th>สมาชิก</th>
      <th>กิจกรรม</th>
      <th class="r">สถิติ</th>
      <th class="r" style="width: 110px; white-space: nowrap;">วันที่</th>
    `;
    
    // Compile a unified feed from all athlete activities
    const feed = [];
    
    if (rawWorkoutLogs && rawWorkoutLogs.length > 0) {
      // Compile directly from sheet rawWorkoutLogs (real logs)
      rawWorkoutLogs.forEach((w, index) => {
        const athlete = rawActivities.find(a => cleanAthleteName(a.name) === cleanAthleteName(w.athleteName));
        
        let formattedDate = w.date;
        if (w.first_seen) {
          const d = new Date(w.first_seen * 1000);
          const day = d.getDate();
          const monthThai = MONTH_TH[d.getMonth()];
          const yearThaiTwoDigits = String(d.getFullYear() + 543).slice(-2);
          formattedDate = `${day} ${monthThai} ${yearThaiTwoDigits}`;
        }
        
        feed.push({
          athleteName: w.athleteName,
          athleteId: athlete ? athlete.athleteId : (w.athleteId || null),
          avatar: athlete ? athlete.avatar : null,
          activityName: w.name,
          sportType: w.sport_type,
          distance: w.dist_km,
          duration: w.moving_time,
          date: formattedDate,
          first_seen: w.first_seen || 0,
          sheetIndex: index
        });
      });
      
      // Sort feed by first_seen descending, fallback to sheetIndex ascending (smaller index first = newer in batch)
      feed.sort((a, b) => {
        if (a.first_seen && b.first_seen && a.first_seen !== b.first_seen) {
          return b.first_seen - a.first_seen;
        }
        return a.sheetIndex - b.sheetIndex;
      });
    } else {
      // Fallback: Compile from rawActivities (simulated/mock)
      rawActivities.forEach(athlete => {
        const workouts = getWorkoutsForAthlete(athlete.name, athlete.distance, athlete.activities, athlete.topType, athlete.movingTime);
        workouts.forEach(w => {
          feed.push({
            athleteName: athlete.name,
            athleteId: athlete.athleteId,
            avatar: athlete.avatar || null,
            activityName: w.name,
            sportType: w.sport_type,
            distance: w.dist_km,
            duration: w.moving_time,
            date: w.date,
            first_seen: w.first_seen || 0,
            sheetIndex: 0
          });
        });
      });
      
      // Sort fallback feed by first_seen descending, fallback to date descending
      feed.sort((a, b) => {
        if (a.first_seen && b.first_seen && a.first_seen !== b.first_seen) {
          return b.first_seen - a.first_seen;
        }
        return parseThaiDate(b.date) - parseThaiDate(a.date);
      });
    }
    
    computedLeaderboard = feed;
  }

  // Update Header Totals
  const totalKm = rawActivities.reduce((s, a) => s + (a.distance || 0), 0);
  
  let totalSecs = 0;
  rawActivities.forEach(a => {
    if (a.movingTime !== undefined && a.movingTime > 0) {
      totalSecs += a.movingTime;
    } else {
      const workouts = getWorkoutsForAthlete(a.name, a.distance, a.activities, a.topType);
      workouts.forEach(w => { totalSecs += w.moving_time; });
    }
  });
  
  document.getElementById('total-distance').textContent = totalKm.toFixed(1);
  document.getElementById('total-time').textContent = Math.round(totalSecs / 3600);
  document.getElementById('active-athletes').textContent = rawActivities.length;

  renderLeaderboard();
  
  // Seamlessly restore or auto-select active athlete on desktop without flickering
  if (window.innerWidth > 820 && computedLeaderboard.length > 0) {
    const savedAthlete = localStorage.getItem('pixme_selected_athlete');
    const targetAthlete = selectedAthleteId || savedAthlete;
    if (targetAthlete && rawActivities.some(a => a.name === targetAthlete)) {
      selectAthlete(targetAthlete);
    } else {
      const firstAthlete = computedLeaderboard[0];
      const firstName = activeTab === 'recent' ? firstAthlete.athleteName : firstAthlete.name;
      selectAthlete(firstName);
    }
  }
}

function renderLeaderboard() {
  const tbody = document.getElementById('leaderboard-body');
  
  // Filter by query if search box is active
  const filtered = computedLeaderboard.filter(a => {
    const nameToSearch = activeTab === 'recent' ? a.athleteName : a.name;
    return nameToSearch.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state">ไม่มีกิจกรรมหรือสมาชิกที่ค้นหา 😴</div></td></tr>`;
    return;
  }
  
  if (activeTab === 'recent') {
    // Render Recent Activity Feed
    tbody.innerHTML = filtered.map(a => {
      const avatar = getAvatarUrl(a.athleteName, a.avatar);
      const isDetailsActive = selectedAthleteId === a.athleteName ? 'active' : '';
      
      // Determine category and metrics
      let category = 'Workout';
      let statsStr = '';
      if (a.sportType === 'Run' || a.sportType === 'TrailRun' || a.sportType === 'VirtualRun') {
        category = 'Run';
        statsStr = `${a.distance.toFixed(1)} km`;
      } else if (a.sportType === 'Walk') {
        category = 'Walk';
        statsStr = `${a.distance.toFixed(1)} km`;
      } else if (a.sportType === 'Ride') {
        // Rides show distance or time, following the user's specification: "Run & walk show distance, Workout show time"
        // Let's treat Ride under Workout or as Ride showing distance. If we group Ride under Workout, it shows time. Let's make Ride show distance.
        // Actually, let's keep Ride as Workout or category "Ride". Let's use "Workout" for all non-run/walk, which shows duration.
        category = 'Workout';
        statsStr = formatDuration(a.duration);
      } else {
        category = 'Workout';
        statsStr = formatDuration(a.duration);
      }
      
      const goalClass = getAthleteGoalClass(a.athleteName);
      return `
        <tr class="${isDetailsActive}" onclick="selectAthlete('${a.athleteName}')">
          <td>
            <div class="athlete-cell">
              <img class="avatar-img ${goalClass}" src="${avatar}" alt="${a.athleteName}">
              <div>
                <p class="athlete-name ${goalClass}">${a.athleteName}</p>
              </div>
            </div>
          </td>
          <td>
            <div class="activity-category-pill ${category.toLowerCase()}" style="font-weight: 600; font-size: 0.8rem; display: inline-block; padding: 2px 8px; border-radius: 6px; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); color: var(--text-secondary);">
              ${category}
            </div>
          </td>
          <td class="r"><span class="metric-value km">${statsStr}</span></td>
          <td class="r" style="color: var(--text-secondary); white-space: nowrap;">${translateDateToEn(a.date)}</td>
        </tr>
      `;
    }).join('');
    
  } else {
    // Render Distance or Duration Leaderboard (Without Rank Number Column)
    tbody.innerHTML = filtered.map((a, i) => {
      const metricStr = a.unit === 'km' ? `${a.value.toFixed(1)} km` : formatDuration(a.value);
      const avatar = getAvatarUrl(a.name, a.avatar);
      const sportIcon = getSportIcon(a.topType);
      const rowClass = selectedAthleteId === a.name ? 'active' : '';
      
      const goalClass = getAthleteGoalClass(a.name);
      return `
        <tr class="${rowClass}" onclick="selectAthlete('${a.name}')">
          <td>
            <div class="athlete-cell">
              <img class="avatar-img ${goalClass}" src="${avatar}" alt="${a.name}">
              <div>
                <p class="athlete-name ${goalClass}">${a.name}</p>
                <p class="athlete-sub">${sportIcon} ${a.topType || 'Activity'}</p>
              </div>
            </div>
          </td>
          <td class="r"><span class="metric-value ${a.unit}">${metricStr}</span></td>
          <td class="c">${a.activitiesCount}</td>
        </tr>
      `;
    }).join('');
  }
}

function getSportIcon(sport) {
  switch (sport) {
    case 'Run': case 'TrailRun': case 'VirtualRun': return '🏃';
    case 'Walk': return '🚶';
    case 'Ride': return '🚴';
    case 'Yoga': return '🧘';
    case 'Badminton': return '🏸';
    default: return '⚡';
  }
}

// ==========================================================================
// Tabs & Interactive Actions
// ==========================================================================

function switchTab(tab) {
  if (activeTab === tab) return;
  activeTab = tab;
  
  document.getElementById('tab-distance').classList.toggle('active', tab === 'distance');
  document.getElementById('tab-duration').classList.toggle('active', tab === 'duration');
  document.getElementById('tab-recent').classList.toggle('active', tab === 'recent');
  
  processData();
}

let searchQuery = '';
function filterLeaderboard() {
  searchQuery = document.getElementById('search-input').value.trim();
  renderLeaderboard();
}

function getAvatarUrl(name, apiAvatar) {
  if (apiAvatar) return apiAvatar;
  
  if (MOCK_AVATARS[name]) return MOCK_AVATARS[name];
  
  // Clean name for mock avatars comparison
  const cleanName = name.replace(/[^\w\s\.]/g, '').trim();
  if (MOCK_AVATARS[cleanName]) return MOCK_AVATARS[cleanName];
  
  // Clean emojis out of the name for Dicebear seed to get clean initials
  const seedName = name.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '').trim();
  
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seedName)}&radius=50`;
}

// ==========================================================================
// Profile Details Panels (Responsive Side Panel & Bottom Sheet)
// ==========================================================================

function selectAthlete(name) {
  selectedAthleteId = name;
  try {
    localStorage.setItem('pixme_selected_athlete', name);
  } catch (e) {}
  
  // Highlight active row in table
  renderLeaderboard();
  
  // Fetch workout log details
  const athleteRaw = rawActivities.find(a => a.name === name);
  if (!athleteRaw) return;
  
  // Selected month's workouts (for stats computing)
  const selectedMonthWorkouts = getWorkoutsForAthlete(name, athleteRaw.distance, athleteRaw.activities, athleteRaw.topType, athleteRaw.movingTime);
  
  // Rolling workouts (for current 7 days rolling calendar and recent activities)
  const rollingWorkouts = getWorkoutsForAthlete(
    name, 
    athleteRaw.distance, 
    athleteRaw.activities, 
    athleteRaw.topType, 
    athleteRaw.movingTime, 
    (currentMonthWorkoutLogs && currentMonthWorkoutLogs.length > 0) ? currentMonthWorkoutLogs : rawWorkoutLogs
  );
  
  rollingWorkouts.sort((a, b) => {
    if (a.first_seen && b.first_seen && a.first_seen !== b.first_seen) {
      return b.first_seen - a.first_seen;
    }
    if (a.sheetIndex !== undefined && b.sheetIndex !== undefined && a.sheetIndex !== b.sheetIndex) {
      return a.sheetIndex - b.sheetIndex; // smaller index (earlier in sheet = newer in batch) comes first
    }
    return parseThaiDate(b.date) - parseThaiDate(a.date);
  });
  
  const avatar = getAvatarUrl(name, athleteRaw.avatar);
  
  // Calculate total workout hours
  let totalSecs = 0;
  if (athleteRaw.movingTime !== undefined && athleteRaw.movingTime > 0) {
    totalSecs = athleteRaw.movingTime;
  } else {
    selectedMonthWorkouts.forEach(w => { totalSecs += w.moving_time; });
  }
  const totalHours = Math.round((totalSecs / 3600) * 10) / 10;
  
  // Calculate goal progress (100Km)
  const goalClass = getAthleteGoalClass(name);
  const distVal = athleteRaw.distance || 0;
  const progressPercent = Math.min((distVal / 100) * 100, 100);
  let progressBarBg = 'linear-gradient(90deg, var(--color-orange), #FC4C02)';
  let progressColor = '#FC4C02';
  let progressGlow = 'none';
  let statusMessage = `🏃 Keep moving! ${(100 - distVal).toFixed(1)} km to target`;
  
  if (distVal >= 100) {
    progressBarBg = 'linear-gradient(90deg, #FFD700 0%, #FFA500 100%)';
    progressColor = '#FFA500';
    progressGlow = '0 0 10px rgba(255, 215, 0, 0.6)';
    statusMessage = '🎉 Goal 100km Achieved! You are amazing! 🎉';
  } else if (distVal >= 80) {
    progressBarBg = 'linear-gradient(90deg, #00C6FF 0%, #0072FF 100%)';
    progressColor = '#00C6FF';
    progressGlow = '0 0 8px rgba(0, 198, 255, 0.4)';
    statusMessage = `💪 Only ${(100 - distVal).toFixed(1)} km left to reach the goal!`;
  }
  
  const progressBarHtml = `
    <div class="goal-progress-container" style="margin: 0.5rem 0 1.25rem 0; padding: 12px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);">
      <div style="display: flex; justify-content: space-between; font-size: 0.72rem; margin-bottom: 6px; font-weight: 600;">
        <span style="color: var(--text-secondary);">TARGET (${formatMonthShort(selectedMonth)}) - 100K</span>
        <span style="color: ${progressColor};">${((distVal / 100) * 100).toFixed(0)}%</span>
      </div>
      <div style="height: 8px; width: 100%; background: rgba(255, 255, 255, 0.05); border-radius: 4px; overflow: hidden; position: relative;">
        <div style="height: 100%; width: ${progressPercent}%; background: ${progressBarBg}; border-radius: 4px; transition: width 0.5s ease; box-shadow: ${progressGlow};"></div>
      </div>
      <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 6px; text-align: center; font-weight: 500;">
        ${statusMessage}
      </div>
    </div>
  `;
  
  // Calculate which weekdays have workouts for the rolling 7 days (Today is on the far right)
  const weekDateStrings = [];
  const weekdayLabels = [];
  let baseDate = new Date(); // Always use today's date for rolling 7-day calendar
  
  const DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - 6 + i);
    const day = d.getDate();
    const monthThai = MONTH_TH[d.getMonth()];
    weekDateStrings.push(`${day} ${monthThai}`);
    
    const dayLabel = DAY_LABELS[d.getDay()];
    
    if (i === 6) {
      weekdayLabels.push(`
        <div style="display: flex; flex-direction: column; align-items: center; line-height: 1.1;">
          <span style="font-weight: 700; color: #FC4C02; font-size: 0.65rem;">${dayLabel}</span>
          <span style="font-weight: 700; color: #FC4C02; font-size: 0.58rem; letter-spacing: -0.02em; margin-top: 1px;">Today</span>
        </div>
      `);
    } else {
      weekdayLabels.push(`
        <div style="display: flex; flex-direction: column; align-items: center; line-height: 1.1;">
          <span style="font-weight: 500; color: var(--text-secondary); font-size: 0.65rem;">${dayLabel}</span>
          <span style="font-weight: 400; color: var(--text-muted); font-size: 0.65rem; margin-top: 1px;">${day}</span>
        </div>
      `);
    }
  }

  const dailyValues = [0, 0, 0, 0, 0, 0, 0];
  const dailySports = ['', '', '', '', '', '', ''];
  rollingWorkouts.forEach(w => {
    const parts = w.date.split(' ');
    if (parts.length >= 2) {
      const dateStr = `${parts[0]} ${parts[1]}`;
      const idx = weekDateStrings.indexOf(dateStr);
      if (idx !== -1) {
        let val = 0;
        if (activeTab === 'duration' || activeTab === 'recent') {
          // Duration or Recent tab: sum moving time in hours for all sports
          val = w.moving_time / 3600;
        } else {
          // Distance tab: sum distance only for Run & Walk (not Ride)
          const isRunOrWalk = ['Run', 'TrailRun', 'VirtualRun', 'Walk'].includes(w.sport_type);
          if (isRunOrWalk) {
            val = w.dist_km;
          }
        }
        
        if (val > 0) {
          dailyValues[idx] += val;
          // Prefer Run icons if multiple activities occur on the same day
          if (!dailySports[idx] || w.sport_type === 'Run') {
            dailySports[idx] = w.sport_type;
          }
        }
      }
    }
  });

  const maxVal = Math.max(...dailyValues);
  const minDenom = (activeTab === 'duration' || activeTab === 'recent') ? 1.5 : 10.0;
  const denom = Math.max(maxVal, minDenom);
  const calendarDays = dailyValues.map((val, idx) => {
    let height = 0;
    if (val > 0) {
      height = denom > 0 ? Math.round((val / denom) * 80) + 20 : 50;
    }
    return {
      active: val > 0,
      height: height,
      sport: dailySports[idx]
    };
  });

  const calendarGridHtml = calendarDays.map(d => {
    if (!d.active) {
      return `
        <div class="day-track"></div>
      `;
    }
    let sportClass = d.sport ? d.sport.toLowerCase() : '';
    if (sportClass === 'trailrun' || sportClass === 'virtualrun') {
      sportClass = 'run';
    }
    return `
      <div class="day-track">
        <div class="day-bar-fill ${sportClass}" style="height: ${d.height}%;"></div>
      </div>
    `;
  }).join('');

  const calendarHtml = `
    <div class="calendar-section">
      <p class="section-title">7 วันล่าสุด</p>
      <div class="calendar-grid">
        ${calendarGridHtml}
      </div>
      <div class="calendar-labels-row">
        ${weekdayLabels.join('')}
      </div>
    </div>
  `;

  // Render recent workouts list
  const workoutsHtml = rollingWorkouts.map(w => {
    const icon = getSportIcon(w.sport_type);
    const timeStr = formatDuration(w.moving_time);
    const detailStr = w.sport_type === 'Run' || w.sport_type === 'Walk' || w.sport_type === 'Ride'
      ? `${w.dist_km.toFixed(1)} km` 
      : timeStr;
      
    const escapedName = w.name.replace(/'/g, "\\'");
    return `
      <div class="workout-item" style="position: relative; display: flex; flex-direction: row; justify-content: space-between; align-items: center; gap: 10px;">
        <div class="workout-info" style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
          <span class="workout-icon">${icon}</span>
          <div style="min-width: 0;">
            <p class="workout-title" title="${w.name}" style="margin: 0; font-size: 0.8rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${w.name}</p>
            <p class="workout-date" style="margin: 2px 0 0 0; font-size: 0.65rem; color: var(--text-secondary);">${translateDateToEn(w.date)}</p>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
          <div class="workout-meta" style="text-align: right;">
            <p class="workout-val" style="margin: 0; font-size: 0.85rem; font-weight: 700;">${detailStr}</p>
            <p class="workout-sub" style="margin: 2px 0 0 0; font-size: 0.65rem; color: var(--text-muted);">${timeStr}</p>
          </div>
          <button class="workout-share-btn" onclick="openShareOverlay('${name}', '${escapedName}', '${w.date}', ${w.dist_km}, ${w.moving_time}, '${w.sport_type}')" title="แชร์กิจกรรม">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Assemble full HTML content
  const contentHtml = `
    <div class="profile-header">
      <img class="profile-avatar ${goalClass}" src="${avatar}" alt="${name}">
      <h3 class="profile-name ${goalClass}">${name}</h3>
      ${athleteRaw.athleteId ? `<a class="profile-link" href="https://www.strava.com/athletes/${athleteRaw.athleteId}" target="_blank">ดูโปรไฟล์ Strava ↗</a>` : ''}
    </div>
    
    ${progressBarHtml}
    
    <div class="detail-stats-grid">
      <div class="detail-stat-box">
        <p class="lbl">วิ่งสะสม (${formatMonthShort(selectedMonth)})</p>
        <p class="val">${athleteRaw.distance.toFixed(1)} <span style="font-size:0.75rem">km</span></p>
      </div>
      <div class="detail-stat-box">
        <p class="lbl">เวลาซ้อมรวม (${formatMonthShort(selectedMonth)})</p>
        <p class="val" style="font-size:1.15rem; white-space: nowrap;">${formatDuration(totalSecs)}</p>
      </div>
    </div>
    
    ${calendarHtml}
    
    <div class="workout-section">
      <p class="section-title">บันทึกกิจกรรมล่าสุด (${rollingWorkouts.length} ครั้ง)</p>
      <div class="workout-list">
        ${workoutsHtml}
      </div>
    </div>
  `;

  // Check window width to decide which panel to open
  if (window.innerWidth > 820) {
    // Desktop: Update Side Panel
    document.getElementById('desktop-placeholder').classList.add('hidden');
    const contentDiv = document.getElementById('desktop-detail-content');
    contentDiv.innerHTML = contentHtml;
    contentDiv.classList.remove('hidden');
  } else {
    // Mobile: Open Bottom Sheet
    const mobileContent = document.getElementById('mobile-sheet-content');
    mobileContent.innerHTML = contentHtml;
    
    document.getElementById('mobile-sheet').classList.add('open');
    document.getElementById('mobile-sheet-overlay').classList.add('open');
  }
}

function resetDetailPanels() {
  // Reset desktop panel
  document.getElementById('desktop-placeholder').classList.remove('hidden');
  document.getElementById('desktop-detail-content').classList.add('hidden');
  document.getElementById('desktop-detail-content').innerHTML = '';
  
  // Close mobile bottom sheet
  closeMobileSheet();
}

function closeMobileSheet() {
  document.getElementById('mobile-sheet').classList.remove('open');
  document.getElementById('mobile-sheet-overlay').classList.remove('open');
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Close bottom sheet if window resized to desktop
window.addEventListener('resize', function() {
  if (window.innerWidth > 820 && document.getElementById('mobile-sheet').classList.contains('open')) {
    closeMobileSheet();
    if (selectedAthleteId) {
      selectAthlete(selectedAthleteId);
    }
  }
});

// ==========================================================================
// Time Helpers & Countdown triggers
// ==========================================================================

function daysLeft() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  return lastDay - now.getDate();
}

function startCountdown() {
  clearInterval(timer);
  const sec = getIntervalSec();
  const dl = daysLeft();
  const dlText = dl === 0 ? 'วันสุดท้ายของเดือน! 🔥' : dl + ' วันจะหมดรอบเดือน';
  
  if (sec === 0) {
    document.getElementById('countdown-text').textContent = dlText + ' • ปิดดึงข้อมูลอัตโนมัติชั่วคราว';
    return;
  }
  
  countdown = sec;
  timer = setInterval(function() {
    countdown--;
    const m = Math.floor(countdown/60), s = String(countdown%60).padStart(2,'0');
    document.getElementById('countdown-text').textContent = `${dlText} • ซิงค์อัตโนมัติในอีก ${m}:${s} นาที`;
    if (countdown <= 0) loadData();
  }, 1000);
}

function getIntervalSec() {
  const h = (new Date().getUTCHours() + 7) % 24;
  if (h >= 0  && h < 4)  return 0;
  if (h >= 4  && h < 5)  return 300;
  if (h >= 5  && h < 10) return 60;
  if (h >= 10 && h < 16) return 900;
  if (h >= 16 && h < 21) return 60;
  return 900;
}

// Start
loadData();

// ==========================================================================
// Workout Overlay Graphic & Sharing Functions (Roxfit-Style Clean UI)
// ==========================================================================
function openShareOverlay(athleteName, activityName, dateStr, distanceKm, movingTimeSec, sportType) {
  // 1. Create Modal Container if not exists
  let modal = document.getElementById('share-graphic-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'share-graphic-modal';
    modal.className = 'share-modal';
    document.body.appendChild(modal);
  }
  
  // 2. Set Modal Content (Roxfit Layout)
  modal.innerHTML = `
    <div class="share-modal-backdrop" onclick="closeShareOverlay()"></div>
    <div class="share-modal-content roxfit-theme">
      <!-- Top Navigation Bar -->
      <div class="rox-nav-bar">
        <button class="rox-back-btn" onclick="closeShareOverlay()" aria-label="ย้อนกลับ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h3 class="rox-nav-title">Share activity</h3>
        <button class="rox-close-btn" onclick="closeShareOverlay()" aria-label="ปิด">&times;</button>
      </div>

      <div class="rox-modal-scroll-body">
        <!-- SECTION 1: OVERLAYS (ROXFIT STYLE + SHOW ALL EXPANDABLE GRID) -->
        <div class="rox-section">
          <div class="rox-section-header">
            <div>
              <h4 class="rox-section-title">Overlays (สติกเกอร์แยกชิ้น)</h4>
              <p class="rox-section-subtitle">แตะเพื่อคัดลอก หรือกดดูทั้งหมดเพื่อเลือกดาวน์โหลด</p>
            </div>
            <button id="rox-toggle-grid-btn" class="rox-see-all-btn" onclick="toggleOverlaysExpanded()">ดูทั้งหมด ▾</button>
          </div>

          <!-- 1A. Horizontal Carousel (Default View) -->
          <div class="rox-overlays-carousel" id="rox-overlays-track">
            <!-- Dynamically populated 7 modular stickers -->
          </div>

          <!-- 1B. Expanded Grid View (Show All & Multi-Select View) -->
          <div class="rox-overlays-grid-wrapper hidden" id="rox-overlays-grid-wrapper">
            <div class="stickers-batch-bar">
              <span id="stickers-selected-count">เลือกแล้ว 7/7 ชิ้น</span>
              <div class="stickers-batch-actions">
                <button class="sticker-select-all-btn" onclick="toggleAllStickers(true)">เลือกทั้งหมด</button>
                <button class="sticker-select-all-btn" onclick="toggleAllStickers(false)">ยกเลิกทั้งหมด</button>
              </div>
            </div>

            <div class="stickers-grid" id="stickers-grid-container">
              <!-- Sticker cards with checkboxes rendered dynamically -->
            </div>

            <button id="stickers-download-btn" class="rox-btn-primary-yellow" onclick="downloadSelectedStickers('${athleteName}')">
              📥 ดาวน์โหลดสติกเกอร์ที่เลือก (Save PNG)
            </button>
          </div>
        </div>

        <!-- SECTION 2: CREATE AND SHARE (FULL PHOTO OVERLAY) -->
        <div class="rox-section">
          <div class="rox-section-header">
            <div>
              <h4 class="rox-section-title">Create and share</h4>
              <p class="rox-section-subtitle">เลือกสไตล์กราฟิกและใส่รูปภาพของคุณ</p>
            </div>
          </div>

          <div class="rox-controls-group">
            <div class="rox-pills-scroll share-template-selector">
              <button class="template-pill active" onclick="selectShareTemplate('classic', event)">🏆 คลาสสิก</button>
              <button class="template-pill" onclick="selectShareTemplate('minimal', event)">⚡ Editorial</button>
              <button class="template-pill" onclick="selectShareTemplate('stamp', event)">🏷️ Activity Stamp</button>
              <button class="template-pill" onclick="selectShareTemplate('monthly', event)">🎯 Monthly Milestone</button>
              <button class="template-pill" onclick="selectShareTemplate('weekly', event)">📊 Week in Motion</button>
              <button class="template-pill" onclick="selectShareTemplate('profile', event)">📱 Athlete Snapshot</button>
              <button class="template-pill" onclick="selectShareTemplate('framed', event)">🖼️ Photo Feature</button>
              <button class="template-pill" onclick="selectShareTemplate('poster', event)">✦ Pace Poster</button>
              <button class="template-pill" onclick="selectShareTemplate('split', event)">◫ Split Metric</button>
              <button class="template-pill" onclick="selectShareTemplate('orbit', event)">◎ Orbit</button>
              <button class="template-pill" onclick="selectShareTemplate('grid', event)">▦ Grid Notes</button>
              <button class="template-pill" onclick="selectShareTemplate('ribbon', event)">⌁ Ribbon</button>
              <button class="template-pill" onclick="selectShareTemplate('track', event)">◌ Track Line</button>
              <button class="template-pill" onclick="selectShareTemplate('journal', event)">▤ Run Journal</button>
              <button class="template-pill" onclick="selectShareTemplate('wave', event)">〰 Wave</button>
              <button class="template-pill" onclick="selectShareTemplate('mono', event)">◐ Mono</button>
              <button class="template-pill" onclick="selectShareTemplate('scoreboard', event)">▣ Scoreboard</button>
              <button class="template-pill" onclick="selectShareTemplate('ticket', event)">✦ Run Ticket</button>
            </div>

            <div class="rox-pills-scroll share-ratio-selector">
              <button class="ratio-pill active" onclick="selectShareRatio('1:1', event)">🔳 1:1</button>
              <button class="ratio-pill" onclick="selectShareRatio('4:5', event)">📱 4:5 แนวตั้ง</button>
              <button class="ratio-pill" onclick="selectShareRatio('9:16', event)">📲 9:16 สตอรี่</button>
              <button class="ratio-pill" onclick="selectShareRatio('16:9', event)">🖼️ 16:9 แนวนอน</button>
            </div>
          </div>

          <div class="canvas-preview-container">
            <canvas id="share-canvas" style="display:none;"></canvas>
            <img id="share-image-preview" alt="Preview Image" class="share-preview-img" />
            <div id="canvas-loading" class="canvas-loader hidden">กำลังประมวลผล...</div>
          </div>

          <div class="rox-photo-actions">
            <label class="rox-btn-primary-yellow">
              <input type="file" id="share-photo-input" accept="image/*" onchange="handleSharePhotoUpload(event)" style="display:none;" />
              <span>📸 Choose photo (เลือกรูปภาพจากเครื่อง)</span>
            </label>
            
            <div class="rox-photo-sub-row">
              <label class="transparent-bg-toggle">
                <input type="checkbox" id="transparent-bg-checkbox" onchange="toggleTransparentBG(event)" />
                <span>🔲 พื้นหลังโปร่งใส</span>
              </label>
              
              <button class="rox-btn-outline" onclick="document.getElementById('share-photo-input').click()">
                🔄 เปลี่ยนรูปภาพ
              </button>
            </div>

            <div class="share-slider-container hidden" id="photo-slider-wrapper">
              <label for="share-photo-slider">↔️ เลื่อนปรับตำแหน่งรูปภาพ (ซ้าย-ขวา / บน-ล่าง)</label>
              <input type="range" id="share-photo-slider" min="0" max="100" value="50" oninput="handleSharePhotoSliderInput(event)" />
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Fixed Action Buttons -->
      <div class="rox-modal-footer">
        <button id="download-graphic-btn" class="rox-btn-download-solid" onclick="downloadGeneratedGraphic('${athleteName}')">
          📥 ดาวน์โหลดรูปภาพ (Download Image)
        </button>
        <button id="share-graphic-btn" class="rox-btn-share-subtle" onclick="shareGeneratedGraphic('${athleteName}')">
          📤 แชร์ไปยังแอปอื่น (Share)
        </button>
      </div>
    </div>
  `;
  
  // Show Modal
  modal.classList.add('open');
  
  // Save activity info globally so handler can access
  window.currentShareData = {
    athleteName: athleteName,
    activityName: activityName,
    dateStr: dateStr,
    distanceKm: distanceKm,
    movingTimeSec: movingTimeSec,
    sportType: sportType,
    bgImage: null,
    sliderValue: 50,
    template: 'classic',
    ratio: '1:1',
    isTransparentBG: false
  };
  
  // Render both overlays carousel and full graphic preview immediately
  renderAllStickers();
  refreshShareCanvas();
}

function toggleTransparentBG(event) {
  if (window.currentShareData) {
    window.currentShareData.isTransparentBG = event.target.checked;
    
    // Hide photo slider when transparent BG is checked
    const sliderWrapper = document.getElementById('photo-slider-wrapper');
    if (sliderWrapper) {
      if (event.target.checked) {
        sliderWrapper.classList.add('hidden');
      } else if (window.currentShareData.bgImage) {
        sliderWrapper.classList.remove('hidden');
      }
    }
    refreshShareCanvas();
  }
}

function selectShareTemplate(template, event) {
  if (window.currentShareData) {
    window.currentShareData.template = template;
    
    // Update active class on pills
    const pills = document.querySelectorAll('.template-pill');
    pills.forEach(p => p.classList.remove('active'));
    if (event && event.currentTarget) {
      event.currentTarget.classList.add('active');
    }
    
    if (template === 'profile') {
      // Default to 9:16 vertical story for Profile Summary template
      window.currentShareData.ratio = '9:16';
      const ratioPills = document.querySelectorAll('.ratio-pill');
      ratioPills.forEach(p => p.classList.remove('active'));
      ratioPills.forEach(p => {
        if (p.textContent.includes('9:16')) p.classList.add('active');
      });
      const previewContainer = document.querySelector('.canvas-preview-container');
      if (previewContainer) {
        previewContainer.style.aspectRatio = '9/16';
      }
    }
    
    refreshShareCanvas();
  }
}

function selectShareRatio(ratio, event) {
  if (window.currentShareData) {
    window.currentShareData.ratio = ratio;
    
    const pills = document.querySelectorAll('.ratio-pill');
    pills.forEach(p => p.classList.remove('active'));
    if (event && event.currentTarget) {
      event.currentTarget.classList.add('active');
    }
    
    const previewContainer = document.querySelector('.canvas-preview-container');
    if (previewContainer) {
      previewContainer.style.aspectRatio = ratio.replace(':', '/');
    }
    
    refreshShareCanvas();
  }
}

function closeShareOverlay() {
  const modal = document.getElementById('share-graphic-modal');
  if (modal) {
    modal.classList.remove('open');
  }
}

function handleSharePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const loading = document.getElementById('canvas-loading');
  if (loading) loading.classList.remove('hidden');
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      window.currentShareData.bgImage = img;
      window.currentShareData.sliderValue = 50;
      
      const sliderWrapper = document.getElementById('photo-slider-wrapper');
      if (sliderWrapper) {
        if (img.width !== img.height && !window.currentShareData.isTransparentBG) {
          sliderWrapper.classList.remove('hidden');
          const slider = document.getElementById('share-photo-slider');
          if (slider) slider.value = 50;
        } else {
          sliderWrapper.classList.add('hidden');
        }
      }
      
      refreshShareCanvas();
      if (loading) loading.classList.add('hidden');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function handleSharePhotoSliderInput(event) {
  if (window.currentShareData) {
    window.currentShareData.sliderValue = parseInt(event.target.value);
    refreshShareCanvas();
  }
}

function refreshShareCanvas() {
  const canvas = document.getElementById('share-canvas');
  const imgPreview = document.getElementById('share-image-preview');
  if (!canvas || !imgPreview) return;
  
  const d = window.currentShareData;
  drawShareCanvas(canvas, d.bgImage, d.athleteName, d.activityName, d.dateStr, d.distanceKm, d.movingTimeSec, d.sportType);
  
  imgPreview.src = canvas.toDataURL('image/png');
}

function get7DayRollingData(athleteName) {
  const weekDateStrings = [];
  const weekdayLabels = [];
  const dayNumbers = [];
  const baseDate = new Date();
  const DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - 6 + i);
    const day = d.getDate();
    const monthThai = MONTH_TH[d.getMonth()];
    weekDateStrings.push(`${day} ${monthThai}`);
    weekdayLabels.push(DAY_LABELS[d.getDay()]);
    dayNumbers.push(i === 6 ? 'TODAY' : String(day));
  }

  const dailyValues = [0, 0, 0, 0, 0, 0, 0];
  const logsToUse = (currentMonthWorkoutLogs && currentMonthWorkoutLogs.length > 0) ? currentMonthWorkoutLogs : rawWorkoutLogs;
  const athleteWorkouts = getWorkoutsForAthlete(athleteName, 0, 0, '', 0, logsToUse);
  
  athleteWorkouts.forEach(w => {
    const parts = w.date.split(' ');
    if (parts.length >= 2) {
      const dateStr = `${parts[0]} ${parts[1]}`;
      const idx = weekDateStrings.indexOf(dateStr);
      if (idx !== -1) {
        const isRunOrWalk = ['Run', 'TrailRun', 'VirtualRun', 'Walk'].includes(w.sport_type);
        if (isRunOrWalk) {
          dailyValues[idx] += w.dist_km;
        }
      }
    }
  });

  return { weekdayLabels, dayNumbers, dailyValues };
}

// The modern share collection intentionally does not reuse the legacy layouts.
// Classic remains below as a stable, unchanged option.
function drawModernShareTemplate(ctx, template, sizeW, sizeH, bgImage, data) {
  const { athleteName, activityName, dateStr, distanceKm, movingTimeSec, sportType, ratio, isTransparentBG, distVal, progressPercent } = data;
  const font = 'system-ui, -apple-system, sans-serif';
  const margin = Math.round(Math.min(sizeW, sizeH) * 0.065);
  const radius = Math.round(Math.min(sizeW, sizeH) * 0.028);
  const time = formatDuration(movingTimeSec);
  const icon = ['Run', 'TrailRun', 'VirtualRun'].includes(sportType) ? 'RUN' : sportType === 'Walk' ? 'WALK' : sportType === 'Ride' ? 'RIDE' : 'MOVE';
  const isWide = ratio === '16:9';
  const rr = (x, y, w, h, r = radius) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };
  const text = (value, x, y, size, color = '#fff', align = 'left', weight = 700) => { ctx.fillStyle = color; ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'top'; ctx.fillText(value, x, y); };

  ctx.clearRect(0, 0, sizeW, sizeH);
  const palettes = {
    minimal: ['#f5f2ea', '#ddd7ce'], stamp: ['#10212b', '#173d45'], monthly: ['#101a2b', '#254a63'],
    weekly: ['#111827', '#1f3558'], profile: ['#211533', '#4b2c68'], framed: ['#121316', '#242833'], poster: ['#371338', '#e75739'],
    split: ['#0b1720', '#22727a'], orbit: ['#15142a', '#4a3671'], grid: ['#122016', '#38634a'], ribbon: ['#281513', '#9d3c2d'],
    track: ['#0e1b2c', '#23617a'], journal: ['#e9dfcf', '#c6b298'], wave: ['#10212d', '#246a81'], mono: ['#202020', '#5a5a5a'],
    scoreboard: ['#171b23', '#3c4d62'], ticket: ['#241819', '#a95b38']
  };
  if (isTransparentBG) {
    ctx.clearRect(0, 0, sizeW, sizeH);
  } else if (bgImage) {
    const sourceRatio = bgImage.width / bgImage.height;
    const targetRatio = sizeW / sizeH;
    let sx = 0, sy = 0, sw = bgImage.width, sh = bgImage.height;
    const sliderValue = window.currentShareData && window.currentShareData.sliderValue !== undefined
      ? window.currentShareData.sliderValue
      : 50;
    const slider = sliderValue / 100;
    if (sourceRatio > targetRatio) { sw = bgImage.height * targetRatio; sx = (bgImage.width - sw) * slider; }
    else { sh = bgImage.width / targetRatio; sy = (bgImage.height - sh) * slider; }
    ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, sizeW, sizeH);
    // Keep a user photo bright. This is only a light contrast veil, not a dark panel.
    const shade = ctx.createLinearGradient(0, 0, sizeW, sizeH);
    shade.addColorStop(0, 'rgba(5, 8, 15, 0.28)'); shade.addColorStop(0.5, 'rgba(5, 8, 15, 0.04)'); shade.addColorStop(1, 'rgba(5, 8, 15, 0.2)');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, sizeW, sizeH);
  } else {
    const palette = palettes[template] || palettes.minimal;
    const bg = ctx.createLinearGradient(0, 0, sizeW, sizeH);
    bg.addColorStop(0, palette[0]); bg.addColorStop(1, palette[1]); ctx.fillStyle = bg; ctx.fillRect(0, 0, sizeW, sizeH);
  }

  // Shared identity line, deliberately different from the old top-header layout.
  const photoMode = Boolean(bgImage && !isTransparentBG);
  const ink = template === 'minimal' && !photoMode ? '#161616' : '#fff';
  const muted = template === 'minimal' ? 'rgba(22,22,22,.6)' : 'rgba(255,255,255,.66)';
  text('PIXME ACTIVE CLUB', margin, margin, 18, muted, 'left', 800);
  text(athleteName.toUpperCase(), sizeW - margin, margin, 18, ink, 'right', 800);

  if (template === 'minimal') {
    text(icon, margin, sizeH * 0.29, 22, '#fc4c02', 'left', 900);
    text(distanceKm.toFixed(2), margin, sizeH * 0.35, isWide ? 230 : 185, ink, 'left', 900);
    text('KM', margin, sizeH * 0.35 + (isWide ? 220 : 180), 30, '#fc4c02', 'left', 900);
    text(activityName.toUpperCase(), margin, sizeH - margin * 2.5, 30, ink, 'left', 800);
    text(`${translateDateToEn(dateStr)}  ·  ${time}`, margin, sizeH - margin * 1.55, 19, muted, 'left', 650);
    ctx.fillStyle = '#fc4c02'; ctx.fillRect(sizeW - margin - 26, sizeH - margin - 26, 26, 26);
  } else if (template === 'stamp') {
    // A compact seal sits in a corner instead of covering the photo's subject.
    const outer = Math.min(sizeW, sizeH) * 0.2;
    const cX = sizeW - margin - outer, cY = sizeH - margin - outer;
    ctx.strokeStyle = '#f8c98b'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(cX, cY, outer, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(248,201,139,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cX, cY, outer - 24, 0, Math.PI * 2); ctx.stroke();
    text('ACTIVITY', cX, cY - outer * .58, 21, '#f8c98b', 'center', 900);
    text(distanceKm.toFixed(2), cX, cY - 50, 76, '#fff', 'center', 900);
    text('KILOMETRES', cX, cY + 34, 15, '#f8c98b', 'center', 900);
    text(icon, cX, cY + 63, 17, '#fff', 'center', 800);
  } else if (template === 'monthly') {
    const cardH = sizeH * .28, cardY = sizeH - margin - cardH, cardW = sizeW - margin * 2;
    ctx.fillStyle = photoMode ? 'rgba(7,14,24,.22)' : 'rgba(7,14,24,.74)'; rr(margin, cardY, cardW, cardH); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; rr(margin, cardY, cardW, cardH); ctx.stroke();
    text('MONTHLY DISTANCE', margin * 1.55, cardY + margin, 20, muted, 'left', 800);
    text(`${progressPercent.toFixed(0)}%`, sizeW - margin * 1.55, cardY + margin, 23, '#7ee8e1', 'right', 900);
    text(`${distVal.toFixed(1)}`, margin * 1.55, cardY + margin * 1.5, isWide ? 92 : 78, '#fff', 'left', 900);
    text('/ 100 KM', margin * 1.55, cardY + margin * 1.5 + (isWide ? 94 : 80), 19, muted, 'left', 800);
    const barX = margin * 1.55, barY = cardY + cardH - margin * .9, barW = cardW - margin * 1.1;
    ctx.fillStyle = 'rgba(255,255,255,.13)'; rr(barX, barY, barW, 18, 9); ctx.fill();
    ctx.fillStyle = '#70e1d7'; rr(barX, barY, Math.max(8, barW * progressPercent / 100), 18, 9); ctx.fill();
    text(`${activityName}  ·  ${distanceKm.toFixed(2)} km today`, margin * 1.55, barY - 38, 18, '#fff', 'left', 700);
  } else if (template === 'weekly') {
    text('SEVEN DAYS', margin, sizeH * .15, 34, ink, 'left', 900);
    text('DISTANCE RHYTHM', margin, sizeH * .19 + 50, 18, muted, 'left', 800);
    const rolling = get7DayRollingData(athleteName); const max = Math.max(...rolling.dailyValues, 1); const chartY = sizeH - margin * 1.55;
    const width = sizeW - margin * 2; const step = width / 7; const barW = step * .52;
    for (let i = 0; i < 7; i++) {
      const maxH = sizeH * .24; const h = Math.max(8, (rolling.dailyValues[i] / max) * maxH); const x = margin + i * step + (step - barW) / 2;
      ctx.fillStyle = photoMode ? 'rgba(255,255,255,.09)' : 'rgba(255,255,255,.12)'; rr(x, chartY - maxH, barW, maxH, barW / 2); ctx.fill();
      ctx.fillStyle = i === 6 ? '#ffcb72' : '#78c8ff'; rr(x, chartY - h, barW, h, barW / 2); ctx.fill();
      text(rolling.weekdayLabels[i], x + barW / 2, chartY + 22, 18, muted, 'center', 800);
      text(rolling.dailyValues[i] ? rolling.dailyValues[i].toFixed(1) : '–', x + barW / 2, chartY - h - 30, 16, ink, 'center', 800);
    }
  } else if (template === 'profile') {
    text('ATHLETE / SUMMARY', margin, sizeH * .18, 34, ink, 'left', 900);
    const y = sizeH * .58, gap = margin * .32, w = (sizeW - margin * 2 - gap) / 2, h = sizeH * .12;
    const stat = (x, yy, label, value, accent) => { ctx.fillStyle = photoMode ? 'rgba(15,12,25,.2)' : 'rgba(15,12,25,.66)'; rr(x, yy, w, h); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1; rr(x, yy, w, h); ctx.stroke(); text(label, x + 20, yy + 16, 13, muted, 'left', 800); text(value, x + 20, yy + 42, 34, accent, 'left', 900); };
    stat(margin, y, 'MONTHLY KM', distVal.toFixed(1), '#cbb2ff'); stat(margin + w + gap, y, 'GOAL', `${progressPercent.toFixed(0)}%`, '#ffb476');
    stat(margin, y + h + gap, 'TODAY', distanceKm.toFixed(2), '#fff'); stat(margin + w + gap, y + h + gap, 'TIME', time, '#9fe3ff');
    text(`${icon}  ${activityName.toUpperCase()}`, margin, sizeH - margin * 2.1, 25, ink, 'left', 800);
    text(translateDateToEn(dateStr), margin, sizeH - margin * 1.35, 18, muted, 'left', 600);
  } else if (template === 'framed') {
    const frameY = sizeH * .2, frameH = isWide ? sizeH * .6 : sizeH * .48, frameW = sizeW - margin * 2;
    ctx.strokeStyle = 'rgba(255,255,255,.82)'; ctx.lineWidth = 3; rr(margin, frameY, frameW, frameH); ctx.stroke();
    text('PHOTO FEATURE', margin + 24, frameY + 22, 18, '#fff', 'left', 900);
    ctx.fillStyle = 'rgba(0,0,0,.48)'; rr(margin + 18, frameY + frameH - 112, frameW - 36, 92, 14); ctx.fill();
    text(distanceKm.toFixed(2), margin + 42, frameY + frameH - 94, 56, '#fff', 'left', 900);
    text(`KM  ·  ${time}`, margin + 42, frameY + frameH - 35, 18, '#ffcc72', 'left', 800);
    text(activityName.toUpperCase(), margin, frameY + frameH + 32, 27, ink, 'left', 900);
    text(`${athleteName}  ·  ${translateDateToEn(dateStr)}`, margin, frameY + frameH + 70, 18, muted, 'left', 650);
  } else if (template === 'split') {
    // Editorial two-column layout: a quiet photo field plus a strong metric column.
    const divider = isWide ? sizeW * .62 : sizeW * .56;
    ctx.fillStyle = photoMode ? 'rgba(3,14,20,.22)' : 'rgba(3,14,20,.82)'; ctx.fillRect(divider, 0, sizeW - divider, sizeH);
    text('TODAY', divider + margin * .55, sizeH * .22, 17, '#8fe8e2', 'left', 900);
    text(distanceKm.toFixed(2), divider + margin * .55, sizeH * .29, isWide ? 96 : 76, '#fff', 'left', 900);
    text('KM', divider + margin * .55, sizeH * .29 + (isWide ? 98 : 78), 20, '#8fe8e2', 'left', 900);
    text(time, divider + margin * .55, sizeH * .58, 32, '#fff', 'left', 800);
    text('MOVING TIME', divider + margin * .55, sizeH * .63, 14, muted, 'left', 800);
    text(activityName.toUpperCase(), margin, sizeH - margin * 2.2, 28, ink, 'left', 900);
    text(translateDateToEn(dateStr), margin, sizeH - margin * 1.4, 18, muted, 'left', 650);
  } else if (template === 'orbit') {
    // Orbit uses rings for the monthly goal, leaving the photo centre unobstructed.
    const cX = sizeW - margin * 2.1, cY = sizeH - margin * 2.1, r = Math.min(sizeW, sizeH) * .15;
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 13; ctx.beginPath(); ctx.arc(cX, cY, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#c7a6ff'; ctx.lineWidth = 13; ctx.beginPath(); ctx.arc(cX, cY, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progressPercent / 100); ctx.stroke();
    text(`${progressPercent.toFixed(0)}%`, cX, cY - 24, 34, '#fff', 'center', 900); text('GOAL', cX, cY + 20, 13, muted, 'center', 900);
    text(distanceKm.toFixed(2), margin, sizeH * .3, isWide ? 160 : 126, '#fff', 'left', 900); text('KM / ACTIVITY', margin, sizeH * .3 + (isWide ? 164 : 130), 18, '#c7a6ff', 'left', 900);
    text(`${icon}  ${activityName}`, margin, sizeH - margin * 2, 23, ink, 'left', 800);
  } else if (template === 'grid') {
    // A lightweight note-board; four small cells rather than one opaque block.
    const cellGap = 12, cellW = (sizeW - margin * 2 - cellGap) / 2, cellH = Math.min(sizeH * .13, 150), baseY = sizeH - margin - cellH * 2 - cellGap;
    const cell = (x, y, key, value, accent) => { ctx.fillStyle = photoMode ? 'rgba(9,28,14,.18)' : 'rgba(9,28,14,.73)'; rr(x, y, cellW, cellH, 12); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.24)'; ctx.lineWidth = 1; rr(x, y, cellW, cellH, 12); ctx.stroke(); text(key, x + 18, y + 16, 13, muted, 'left', 800); text(value, x + 18, y + 40, 30, accent, 'left', 900); };
    text('ACTIVITY NOTES', margin, sizeH * .2, 30, ink, 'left', 900); text(activityName.toUpperCase(), margin, sizeH * .25, 18, '#9ee6a6', 'left', 800);
    cell(margin, baseY, 'DISTANCE', `${distanceKm.toFixed(2)} KM`, '#fff'); cell(margin + cellW + cellGap, baseY, 'TIME', time, '#9ee6a6');
    cell(margin, baseY + cellH + cellGap, 'MONTH', `${distVal.toFixed(1)} KM`, '#fff'); cell(margin + cellW + cellGap, baseY + cellH + cellGap, 'GOAL', `${progressPercent.toFixed(0)}%`, '#9ee6a6');
  } else if (template === 'ribbon') {
    // A diagonal translucent ribbon keeps the central image visible.
    ctx.save(); ctx.translate(sizeW * .02, sizeH * .62); ctx.rotate(-0.08); ctx.fillStyle = photoMode ? 'rgba(83,19,13,.42)' : 'rgba(83,19,13,.88)'; ctx.fillRect(-margin, -72, sizeW + margin * 2, 176); ctx.restore();
    text('DISTANCE', margin, sizeH * .63, 15, '#ffb29a', 'left', 900); text(distanceKm.toFixed(2), margin, sizeH * .67, isWide ? 102 : 84, '#fff', 'left', 900); text('KM', margin, sizeH * .67 + (isWide ? 106 : 88), 20, '#ffb29a', 'left', 900);
    text(`${activityName.toUpperCase()}  ·  ${time}`, margin, sizeH * .82, 21, '#fff', 'left', 800); text(translateDateToEn(dateStr), margin, sizeH * .86, 16, muted, 'left', 650);
  } else if (template === 'track') {
    // A simple route-like line runs around the perimeter; data stays in the corners.
    ctx.strokeStyle = '#83ddf0'; ctx.lineWidth = 5; ctx.setLineDash([18, 14]); rr(margin, margin * 2.2, sizeW - margin * 2, sizeH - margin * 3.2, 36); ctx.stroke(); ctx.setLineDash([]);
    text('ON THE TRACK', margin * 1.5, sizeH * .25, 18, '#83ddf0', 'left', 900); text(distanceKm.toFixed(2), margin * 1.5, sizeH * .29, isWide ? 148 : 118, '#fff', 'left', 900); text('KM', margin * 1.5, sizeH * .29 + (isWide ? 152 : 122), 22, '#83ddf0', 'left', 900);
    text(time, sizeW - margin * 1.5, sizeH - margin * 2.1, 34, '#fff', 'right', 900); text('MOVING TIME', sizeW - margin * 1.5, sizeH - margin * 1.5, 14, muted, 'right', 800);
  } else if (template === 'journal') {
    // Paper-inspired caption card at the very bottom, intentionally modest over photos.
    const paperH = sizeH * .27, paperY = sizeH - paperH;
    ctx.fillStyle = photoMode ? 'rgba(245,238,225,.84)' : '#f0e4d1'; ctx.fillRect(0, paperY, sizeW, paperH);
    const paperInk = '#29241f'; text('RUN JOURNAL', margin, paperY + margin * .55, 15, '#a14d32', 'left', 900); text(activityName, margin, paperY + margin * 1.05, 29, paperInk, 'left', 900);
    text(`${distanceKm.toFixed(2)} KM`, margin, paperY + margin * 1.7, 35, paperInk, 'left', 900); text(`${time}  ·  ${translateDateToEn(dateStr)}`, sizeW - margin, paperY + margin * 1.85, 16, '#645a4f', 'right', 700);
  } else if (template === 'wave') {
    // Two thin flowing strokes create motion without a filled information panel.
    ctx.strokeStyle = '#8ee9ed'; ctx.lineWidth = 7; for (let row = 0; row < 2; row++) { ctx.beginPath(); for (let x = 0; x <= sizeW; x += 18) { const y = sizeH * (.72 + row * .06) + Math.sin(x / 85 + row) * 16; if (!x) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); }
    text('FLOW STATE', margin, sizeH * .24, 17, '#8ee9ed', 'left', 900); text(distanceKm.toFixed(2), margin, sizeH * .29, isWide ? 152 : 122, '#fff', 'left', 900); text('KM', margin, sizeH * .29 + (isWide ? 156 : 126), 21, '#8ee9ed', 'left', 900);
    text(`${activityName.toUpperCase()}  /  ${time}`, margin, sizeH - margin * 1.5, 19, ink, 'left', 800);
  } else if (template === 'mono') {
    // High-contrast typographic treatment; works well on busy photos.
    ctx.fillStyle = photoMode ? 'rgba(0,0,0,.17)' : 'rgba(0,0,0,.68)'; ctx.fillRect(0, sizeH * .55, sizeW, sizeH * .45);
    text('DISTANCE', margin, sizeH * .61, 16, '#d6d6d6', 'left', 900); text(distanceKm.toFixed(2), margin, sizeH * .65, isWide ? 160 : 130, '#fff', 'left', 900); text('KM', margin, sizeH * .65 + (isWide ? 164 : 134), 22, '#d6d6d6', 'left', 900);
    text(time, sizeW - margin, sizeH * .73, 38, '#fff', 'right', 900); text(`${icon}  ${activityName.toUpperCase()}`, margin, sizeH - margin * 1.4, 19, '#fff', 'left', 800);
  } else if (template === 'scoreboard') {
    // Sport-screen inspired rows with generous gaps and faint separators.
    text('ACTIVITY SCOREBOARD', margin, sizeH * .2, 27, ink, 'left', 900);
    const row = (y, label, value, accent) => { ctx.strokeStyle = 'rgba(255,255,255,.27)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(margin, y + 58); ctx.lineTo(sizeW - margin, y + 58); ctx.stroke(); text(label, margin, y, 15, muted, 'left', 800); text(value, sizeW - margin, y - 5, 42, accent, 'right', 900); };
    row(sizeH * .35, 'ACTIVITY DISTANCE', `${distanceKm.toFixed(2)} KM`, '#fff'); row(sizeH * .49, 'MOVING TIME', time, '#b9d4ff'); row(sizeH * .63, 'MONTHLY GOAL', `${progressPercent.toFixed(0)}%`, '#ffbf7b');
    text(`${icon}  ${activityName}  ·  ${translateDateToEn(dateStr)}`, margin, sizeH - margin * 1.4, 18, ink, 'left', 700);
  } else if (template === 'ticket') {
    // A compact event-ticket panel that occupies the bottom strip only.
    const ticketH = sizeH * .24, y = sizeH - margin - ticketH;
    ctx.fillStyle = photoMode ? 'rgba(67,25,17,.34)' : 'rgba(67,25,17,.9)'; rr(margin, y, sizeW - margin * 2, ticketH, 18); ctx.fill();
    ctx.strokeStyle = '#ffd087'; ctx.lineWidth = 2; ctx.setLineDash([9, 8]); rr(margin, y, sizeW - margin * 2, ticketH, 18); ctx.stroke(); ctx.setLineDash([]);
    text('PIXME RUN TICKET', margin * 1.5, y + margin * .55, 15, '#ffd087', 'left', 900); text(distanceKm.toFixed(2), margin * 1.5, y + margin * .95, 56, '#fff', 'left', 900); text('KM', margin * 1.5, y + margin * .95 + 60, 18, '#ffd087', 'left', 900);
    text(activityName.toUpperCase(), sizeW - margin * 1.5, y + margin * .65, 20, '#fff', 'right', 800); text(`${time}  ·  ${translateDateToEn(dateStr)}`, sizeW - margin * 1.5, y + margin * 1.25, 16, muted, 'right', 650);
  } else { // poster
    text('KEEP', margin, sizeH * .23, isWide ? 118 : 96, '#fff', 'left', 900); text('MOVING.', margin, sizeH * .23 + (isWide ? 125 : 102), isWide ? 118 : 96, '#ffd07c', 'left', 900);
    text(distanceKm.toFixed(2), margin, sizeH * .62, isWide ? 210 : 165, '#fff', 'left', 900); text('KM', margin, sizeH * .62 + (isWide ? 208 : 162), 28, '#ffd07c', 'left', 900);
    text(`${icon}  ${activityName.toUpperCase()}`, margin, sizeH - margin * 2.1, 25, '#fff', 'left', 800); text(`${time}  ·  ${progressPercent.toFixed(0)}% MONTHLY GOAL`, margin, sizeH - margin * 1.35, 18, 'rgba(255,255,255,.72)', 'left', 700);
  }
}

function drawShareCanvas(canvas, bgImage, athleteName, activityName, dateStr, distanceKm, movingTimeSec, sportType) {
  const ctx = canvas.getContext('2d');
  
  const ratio = (window.currentShareData && window.currentShareData.ratio) || '1:1';
  let sizeW = 1080;
  let sizeH = 1080;
  
  if (ratio === '4:5') {
    sizeW = 1080;
    sizeH = 1350;
  } else if (ratio === '9:16') {
    sizeW = 1080;
    sizeH = 1920;
  } else if (ratio === '16:9') {
    sizeW = 1920;
    sizeH = 1080;
  }
  
  canvas.width = sizeW;
  canvas.height = sizeH;
  
  const template = (window.currentShareData && window.currentShareData.template) || 'classic';
  const isTransparentBG = (window.currentShareData && window.currentShareData.isTransparentBG) || false;
  
  // 1. Draw Background Photo, Gradient, or Clear for Transparent PNG
  if (isTransparentBG) {
    ctx.clearRect(0, 0, sizeW, sizeH);
  } else if (bgImage) {
    const targetAspect = sizeW / sizeH;
    const imgAspect = bgImage.width / bgImage.height;
    const sliderVal = (window.currentShareData && window.currentShareData.sliderValue !== undefined) ? window.currentShareData.sliderValue : 50;
    
    let sx = 0, sy = 0, sWidth = bgImage.width, sHeight = bgImage.height;
    
    if (imgAspect > targetAspect) {
      sWidth = bgImage.height * targetAspect;
      sHeight = bgImage.height;
      const maxOffset = bgImage.width - sWidth;
      sx = maxOffset * (sliderVal / 100);
      sy = 0;
    } else {
      sWidth = bgImage.width;
      sHeight = bgImage.width / targetAspect;
      const maxOffset = bgImage.height - sHeight;
      sx = 0;
      sy = maxOffset * (sliderVal / 100);
    }
    ctx.drawImage(bgImage, sx, sy, sWidth, sHeight, 0, 0, sizeW, sizeH);
  } else {
    const grad = ctx.createLinearGradient(0, 0, sizeW, sizeH);
    if (template === 'minimal') {
      grad.addColorStop(0, '#101116');
      grad.addColorStop(0.52, '#20242d');
      grad.addColorStop(1, '#090a0e');
    } else if (template === 'weekly') {
      grad.addColorStop(0, '#09131b');
      grad.addColorStop(0.55, '#102634');
      grad.addColorStop(1, '#123949');
    } else if (template === 'stamp') {
      grad.addColorStop(0, '#17120e');
      grad.addColorStop(0.55, '#382116');
      grad.addColorStop(1, '#b93a05');
    } else if (template === 'monthly') {
      grad.addColorStop(0, '#111c26');
      grad.addColorStop(0.5, '#1a2d3a');
      grad.addColorStop(1, '#183847');
    } else if (template === 'profile') {
      grad.addColorStop(0, '#14141d');
      grad.addColorStop(0.58, '#26213b');
      grad.addColorStop(1, '#34274d');
    } else if (template === 'framed') {
      grad.addColorStop(0, '#101114');
      grad.addColorStop(0.55, '#202228');
      grad.addColorStop(1, '#121316');
    } else if (template === 'poster') {
      grad.addColorStop(0, '#26113a');
      grad.addColorStop(0.5, '#571d59');
      grad.addColorStop(1, '#e54b31');
    } else {
      grad.addColorStop(0, '#111827');
      grad.addColorStop(0.5, '#1e293b');
      grad.addColorStop(1, '#fc4c02');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, sizeW, sizeH);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.arc(sizeW * 0.8, sizeH * 0.2, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sizeW * 0.2, sizeH * 0.8, 400, 0, Math.PI * 2);
    ctx.fill();
  }

  // Give every redesigned template a distinct visual language. The classic
  // template intentionally bypasses this layer so its original artwork remains unchanged.
  if (!isTransparentBG && template !== 'classic') {
    ctx.save();
    if (template === 'minimal') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.055)';
      ctx.lineWidth = Math.max(2, sizeW / 300);
      for (let x = -sizeH; x < sizeW; x += sizeW / 7) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + sizeH, sizeH);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(252, 76, 2, 0.9)';
      ctx.fillRect(0, sizeH * 0.64, sizeW, Math.max(9, sizeH / 120));
    } else if (template === 'stamp') {
      ctx.strokeStyle = 'rgba(255, 211, 143, 0.12)';
      ctx.lineWidth = Math.max(2, sizeW / 360);
      const cx = sizeW * 0.77;
      const cy = sizeH * 0.32;
      for (let r = sizeW * 0.1; r < sizeW * 0.62; r += sizeW * 0.075) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (template === 'monthly') {
      const accent = ctx.createRadialGradient(sizeW * 0.88, sizeH * 0.08, 0, sizeW * 0.88, sizeH * 0.08, sizeW * 0.62);
      accent.addColorStop(0, 'rgba(76, 192, 188, 0.28)');
      accent.addColorStop(1, 'rgba(76, 192, 188, 0)');
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, sizeW, sizeH);
    } else if (template === 'weekly') {
      ctx.strokeStyle = 'rgba(112, 210, 224, 0.065)';
      ctx.lineWidth = 1;
      const grid = Math.max(52, sizeW / 18);
      for (let x = 0; x <= sizeW; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, sizeH); ctx.stroke(); }
      for (let y = 0; y <= sizeH; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(sizeW, y); ctx.stroke(); }
    } else if (template === 'profile') {
      ctx.fillStyle = 'rgba(185, 148, 255, 0.1)';
      ctx.beginPath();
      ctx.arc(sizeW * 0.92, sizeH * 0.08, sizeW * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (template === 'framed') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 2;
      ctx.strokeRect(25, 25, sizeW - 50, sizeH - 50);
    } else if (template === 'poster') {
      ctx.fillStyle = 'rgba(255, 222, 136, 0.12)';
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.arc(sizeW * 0.75, sizeH * 0.2, sizeW * (0.1 + i * 0.065), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  
  // 2. Draw Readability Gradients (Only if not transparent & not ultra-minimal)
  if (!isTransparentBG && template !== 'minimal' && template !== 'stamp' && template !== 'framed') {
    const topGrad = ctx.createLinearGradient(0, 0, 0, sizeH * 0.32);
    topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.82)');
    topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, sizeW, sizeH * 0.32);
    
    const bottomGrad = ctx.createLinearGradient(0, sizeH * 0.45, 0, sizeH);
    bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, sizeH * 0.45, sizeW, sizeH * 0.55);
  }
  
  const fontSans = 'system-ui, -apple-system, sans-serif';
  const emoji = sportType === 'Run' || sportType === 'TrailRun' || sportType === 'VirtualRun' ? '🏃' : sportType === 'Walk' ? '🚶' : sportType === 'Ride' ? '🚴' : '💪';
  const timeStr = formatDuration(movingTimeSec);
  const athlete = rawActivities.find(a => a.name === athleteName);
  const distVal = athlete ? athlete.distance : distanceKm;
  const progressPercent = Math.min((distVal / 100) * 100, 100);

  let statusMsg = `🏃 ขาดอีก ${(100 - distVal).toFixed(1)} km ถึงเป้าหมาย!`;
  if (distVal >= 100) {
    statusMsg = '🎉 Goal 100km Achieved!';
  } else if (distVal >= 80) {
    statusMsg = `💪 เหลือเพียง ${(100 - distVal).toFixed(1)} km!`;
  }

  // Set drop shadow for transparent PNG or unbacked text
  if (isTransparentBG || template === 'minimal' || template === 'stamp') {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 10;
  } else {
    ctx.shadowBlur = 0;
  }

  // Classic is deliberately left on its original renderer. Every other option
  // uses the new collection above rather than inheriting a legacy composition.
  if (template !== 'classic') {
    drawModernShareTemplate(ctx, template, sizeW, sizeH, bgImage, {
      athleteName, activityName, dateStr, distanceKm, movingTimeSec, sportType,
      ratio, isTransparentBG, distVal, progressPercent
    });
    return;
  }

  if (template === 'minimal') {
    // ==========================================
    // TEMPLATE 2: ULTRA MINIMAL (NIKE / STRAVA STYLE)
    // ==========================================
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PIXME / RUN', 60, 60);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px ' + fontSans;
    ctx.textAlign = 'right';
    ctx.fillText(athleteName, sizeW - 60, 60);

    const fontPx = sizeH > 1400 ? 210 : 170;
    const textY = sizeH - (sizeH > 1400 ? 260 : 200);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${fontPx}px ${fontSans}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(distanceKm.toFixed(2), 60, textY);

    const distWidth = ctx.measureText(distanceKm.toFixed(2)).width;
    ctx.fillStyle = '#FC4C02';
    ctx.font = 'bold 42px ' + fontSans;
    ctx.fillText('KM', 60 + distWidth + 18, textY - 10);

    ctx.shadowBlur = 0;

    const pillY = sizeH - 120;
    const pillH = 68;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(60, pillY, sizeW - 120, pillH, 34);
    else ctx.rect(60, pillY, sizeW - 120, pillH);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px ' + fontSans;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${emoji} ${activityName.toUpperCase()}  •  ${translateDateToEn(dateStr)}  •  ${timeStr}`, sizeW / 2, pillY + pillH / 2);

  } else if (template === 'stamp') {
    // ==========================================
    // TEMPLATE 3: SPORT STAMP / RACE BIB BADGE
    // ==========================================
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PIXME ENDURANCE', 60, 60);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px ' + fontSans;
    ctx.textAlign = 'right';
    ctx.fillText(athleteName, sizeW - 60, 60);

    ctx.shadowBlur = 0;

    const stampW = 540;
    const stampH = 260;
    const stampX = 60;
    const stampY = sizeH - stampH - 60;

    ctx.fillStyle = 'rgba(10, 15, 24, 0.72)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(stampX, stampY, stampW, stampH, 24);
    else ctx.rect(stampX, stampY, stampW, stampH);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FC4C02';
    ctx.font = 'bold 20px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PERSONAL BEST / ACTIVITY STAMP', stampX + 30, stampY + 28);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 78px ' + fontSans;
    ctx.fillText(distanceKm.toFixed(2), stampX + 30, stampY + 62);

    const sw = ctx.measureText(distanceKm.toFixed(2)).width;
    ctx.fillStyle = '#FC4C02';
    ctx.font = 'bold 32px ' + fontSans;
    ctx.fillText('KM', stampX + 30 + sw + 12, stampY + 102);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 24px ' + fontSans;
    ctx.fillText(`${emoji} ${activityName}`, stampX + 30, stampY + 165);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '500 20px ' + fontSans;
    ctx.fillText(`${translateDateToEn(dateStr)}  •  ⏱️ ${timeStr}`, stampX + 30, stampY + 205);

    const tPillW = 380;
    const tPillH = 70;
    const tPillX = sizeW - tPillW - 60;
    const tPillY = sizeH - tPillH - 60;

    ctx.fillStyle = 'rgba(10, 15, 24, 0.72)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(tPillX, tPillY, tPillW, tPillH, 35);
    else ctx.rect(tPillX, tPillY, tPillW, tPillH);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = progressPercent >= 100 ? '#FFD700' : '#FC4C02';
    ctx.font = 'bold 22px ' + fontSans;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🎯 Target ${progressPercent.toFixed(0)}% (${distVal.toFixed(1)}/100K)`, tPillX + tPillW / 2, tPillY + tPillH / 2);

  } else if (template === 'monthly') {
    // ==========================================
    // TEMPLATE 4: REDESIGNED MONTHLY TARGET FOCUS
    // ==========================================
    const topY = ratio === '1:1' ? 85 : 70;
    const leftX = 70;
    const rightX = sizeW - 70;

    // Header Top Left: Club Header + 2-Line Activity Info below
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 38px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('MONTHLY MILESTONE', leftX, topY);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 20px ' + fontSans;
    ctx.fillText('BUILD THE DISTANCE, ONE SESSION AT A TIME', leftX, topY + 48);

    // 2-Line Activity Info under title (Bigger font & clear spacing)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px ' + fontSans;
    ctx.fillText(`${emoji} ${activityName}`, leftX, topY + 95);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '500 24px ' + fontSans;
    ctx.fillText(`📅 ${translateDateToEn(dateStr)}   ⏱️ ${timeStr} (${distanceKm.toFixed(2)} KM)`, leftX, topY + 135);

    // Header Top Right: Athlete Profile Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 34px ' + fontSans;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(athleteName, rightX, topY);

    ctx.shadowBlur = 0;

    // HERO STATS (MONTHLY ACCUMULATED & TARGET %)
    const isLandscape = (ratio === '16:9');
    const boxW = isLandscape ? 980 : sizeW - 140;
    const startX = leftX;
    const endX = startX + boxW;
    const heroY = isLandscape ? sizeH - 240 : (sizeH > 1400 ? sizeH - 250 : sizeH - 200);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = 'bold 24px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`🎯 MONTHLY TARGET SUMMARY (${formatMonthShort(selectedMonth)})`, startX, heroY - 140);

    // Giant Accumulated Distance (Equalized font size with Goal %)
    const statFontSize = isLandscape ? 115 : (sizeH > 1400 ? 135 : 120);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${statFontSize}px ${fontSans}`;
    ctx.textAlign = 'left';
    ctx.fillText(`${distVal.toFixed(1)}`, startX, heroY);

    const mDistWidth = ctx.measureText(`${distVal.toFixed(1)}`).width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 36px ' + fontSans;
    ctx.fillText('/ 100 KM', startX + mDistWidth + 18, heroY - 15);

    // Giant Goal Percent (Right side of boxW)
    ctx.fillStyle = progressPercent >= 100 ? '#FFD700' : '#FC4C02';
    ctx.font = `bold ${statFontSize}px ${fontSans}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${progressPercent.toFixed(0)}%`, endX, heroY);

    // Progress Bar
    const barY = heroY + 30;
    const barH = 26;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(startX, barY, boxW, barH, 13);
    else ctx.rect(startX, barY, boxW, barH);
    ctx.fill();

    if (progressPercent > 0) {
      const fillW = boxW * (progressPercent / 100);
      const fillGrad = ctx.createLinearGradient(startX, barY, startX + fillW, barY);
      fillGrad.addColorStop(0, distVal >= 100 ? '#FFD700' : '#fc4c02');
      fillGrad.addColorStop(1, distVal >= 100 ? '#FFA500' : '#ff7a00');
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(startX, barY, fillW, barH, 13);
      else ctx.rect(startX, barY, fillW, barH);
      ctx.fill();
    }

    // Status Pill Badge at Bottom
    const pillY = barY + 48;
    ctx.fillStyle = 'rgba(10, 15, 24, 0.65)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(startX, pillY, boxW, 52, 26);
    else ctx.rect(startX, pillY, boxW, 52);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px ' + fontSans;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(statusMsg, startX + boxW / 2, pillY + 26);

  } else if (template === 'weekly') {
    // ==========================================
    // TEMPLATE 5: REDESIGNED COMPACT 7-DAY CAPSULE CHART
    // ==========================================
    const rollingData = get7DayRollingData(athleteName);
    const isLandscape = (ratio === '16:9');

    const topY = ratio === '1:1' ? 85 : 70;
    const leftX = 70;
    const rightX = sizeW - 70;

    // Header Top Left: Club Header + 2-Line Activity Info below
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 38px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('WEEK IN MOTION', leftX, topY);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 20px ' + fontSans;
    ctx.fillText('YOUR LAST 7 DAYS, AT A GLANCE', leftX, topY + 48);

    // 2-Line Activity Info under title (Bigger font & clear spacing)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px ' + fontSans;
    ctx.fillText(`${emoji} ${activityName}`, leftX, topY + 95);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '500 24px ' + fontSans;
    ctx.fillText(`📅 ${translateDateToEn(dateStr)}   ⏱️ ${timeStr} (${distanceKm.toFixed(2)} KM)`, leftX, topY + 135);

    // Header Top Right: Athlete Profile Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 34px ' + fontSans;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(athleteName, rightX, topY);

    ctx.shadowBlur = 0;

    // Glass 7-Day Capsule Card (Bottom-left half for 16:9 landscape!)
    const cardW = isLandscape ? 1020 : sizeW - 140;
    const cardH = sizeH > 1400 ? 440 : 370;
    const cardX = leftX;
    const cardY = sizeH - cardH - (isLandscape ? 50 : (sizeH > 1400 ? 80 : 50));

    if (!isTransparentBG) {
      ctx.fillStyle = 'rgba(10, 15, 24, 0.72)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, 28);
      else ctx.rect(cardX, cardY, cardW, cardH);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Title inside card
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('7 วันล่าสุด', cardX + 35, cardY + 28);

    const maxVal = Math.max(...rollingData.dailyValues, 10);
    const chartBottomY = cardY + cardH - 95;
    const maxBarH = cardH - 170;
    
    // Fixed slim bar width for sleek tall capsules matching Athlete Profile Card
    const barW = isLandscape ? 48 : (sizeH > 1400 ? 56 : 46);
    const gap = isLandscape ? 36 : (sizeH > 1400 ? 32 : 28);
    const totalBarsWidth = 7 * barW + 6 * gap;
    const startX = cardX + Math.floor((cardW - totalBarsWidth) / 2);

    for (let i = 0; i < 7; i++) {
      const val = rollingData.dailyValues[i];
      const bx = startX + i * (barW + gap);
      const isToday = (i === 6);
      
      // Capsule track
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, chartBottomY - maxBarH, barW, maxBarH, barW / 2);
      else ctx.rect(bx, chartBottomY - maxBarH, barW, maxBarH);
      ctx.fill();

      // Active Capsule Bar (Gradient top to bottom)
      if (val > 0) {
        const h = Math.min((val / maxVal) * maxBarH, maxBarH);
        const fillGrad = ctx.createLinearGradient(bx, chartBottomY - h, bx, chartBottomY);
        fillGrad.addColorStop(0, '#FC4C02');
        fillGrad.addColorStop(1, '#3B82F6');

        ctx.fillStyle = fillGrad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, chartBottomY - h, barW, h, barW / 2);
        else ctx.rect(bx, chartBottomY - h, barW, h);
        ctx.fill();

        // Runner emoji
        ctx.font = 'bold 22px ' + fontSans;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏃', bx + barW / 2, chartBottomY - Math.max(h / 2, 20));

        // Distance value above bar
        ctx.fillStyle = isToday ? '#FFD700' : '#FFFFFF';
        ctx.font = 'bold 19px ' + fontSans;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(val.toFixed(1), bx + barW / 2, chartBottomY - h - 6);
      }

      // Weekday Label
      ctx.fillStyle = isToday ? '#FC4C02' : 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 22px ' + fontSans;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(rollingData.weekdayLabels[i], bx + barW / 2, chartBottomY + 10);

      // Day Number / TODAY
      ctx.fillStyle = isToday ? '#FC4C02' : 'rgba(255, 255, 255, 0.55)';
      ctx.font = isToday ? 'bold 20px ' + fontSans : '500 18px ' + fontSans;
      ctx.fillText(rollingData.dayNumbers[i], bx + barW / 2, chartBottomY + 40);
    }
  } else if (template === 'profile') {
    // ==========================================
    // TEMPLATE 7: ATHLETE PROFILE CARD SUMMARY (WITH 4 LATEST WORKOUTS)
    // ==========================================
    const rollingData = get7DayRollingData(athleteName);
    const topY = ratio === '1:1' ? 70 : 60;
    const leftX = 60;
    const rightX = sizeW - 60;
    const boxW = sizeW - 120;

    // Header Top Left & Top Right
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('ATHLETE SNAPSHOT', leftX, topY);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 20px ' + fontSans;
    ctx.fillText('A PERSONAL VIEW OF YOUR PROGRESS', leftX, topY + 44);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 34px ' + fontSans;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(athleteName, rightX, topY);

    ctx.shadowBlur = 0;

    // CARD 1: TARGET PROGRESS BOX
    const card1Y = topY + 90;
    const card1H = 135;

    if (!isTransparentBG) {
      ctx.fillStyle = 'rgba(10, 15, 24, 0.75)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(leftX, card1Y, boxW, card1H, 20);
      else ctx.rect(leftX, card1Y, boxW, card1H);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 20px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`TARGET (${formatMonthShort(selectedMonth)}) - 100K`, leftX + 24, card1Y + 20);

    ctx.fillStyle = progressPercent >= 100 ? '#FFD700' : '#FC4C02';
    ctx.font = 'bold 22px ' + fontSans;
    ctx.textAlign = 'right';
    ctx.fillText(`${progressPercent.toFixed(0)}%`, rightX - 24, card1Y + 20);

    const c1BarY = card1Y + 56;
    const c1BarW = boxW - 48;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(leftX + 24, c1BarY, c1BarW, 12, 6);
    else ctx.rect(leftX + 24, c1BarY, c1BarW, 12);
    ctx.fill();

    if (progressPercent > 0) {
      const c1FillW = c1BarW * (progressPercent / 100);
      const c1FillGrad = ctx.createLinearGradient(leftX + 24, c1BarY, leftX + 24 + c1FillW, c1BarY);
      c1FillGrad.addColorStop(0, distVal >= 100 ? '#FFD700' : '#fc4c02');
      c1FillGrad.addColorStop(1, distVal >= 100 ? '#FFA500' : '#ff7a00');
      ctx.fillStyle = c1FillGrad;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(leftX + 24, c1BarY, c1FillW, 12, 6);
      else ctx.rect(leftX + 24, c1BarY, c1FillW, 12);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 18px ' + fontSans;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(statusMsg, sizeW / 2, card1Y + 84);

    // CARD 2: SIDE-BY-SIDE STAT BOXES
    const card2Y = card1Y + card1H + 20;
    const statBoxW = Math.floor((boxW - 20) / 2);
    const statBoxH = 130;

    // Left Box: Accumulated Distance
    const box2AX = leftX;
    if (!isTransparentBG) {
      ctx.fillStyle = 'rgba(10, 15, 24, 0.75)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(box2AX, card2Y, statBoxW, statBoxH, 20);
      else ctx.rect(box2AX, card2Y, statBoxW, statBoxH);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 20px ' + fontSans;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`วิ่งสะสม (${formatMonthShort(selectedMonth)})`, box2AX + statBoxW / 2, card2Y + 22);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 42px ' + fontSans;
    ctx.fillText(`${distVal.toFixed(1)} km`, box2AX + statBoxW / 2, card2Y + 60);

    // Right Box: Total Workout Duration
    const box2BX = leftX + statBoxW + 20;
    let totalSecs = 0;
    if (athlete && athlete.movingTime !== undefined && athlete.movingTime > 0) {
      totalSecs = athlete.movingTime;
    } else {
      const athleteWorkouts = getWorkoutsForAthlete(athleteName, distVal, 0, sportType);
      athleteWorkouts.forEach(w => { totalSecs += w.moving_time; });
    }

    if (!isTransparentBG) {
      ctx.fillStyle = 'rgba(10, 15, 24, 0.75)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(box2BX, card2Y, statBoxW, statBoxH, 20);
      else ctx.rect(box2BX, card2Y, statBoxW, statBoxH);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 20px ' + fontSans;
    ctx.textAlign = 'center';
    ctx.fillText(`เวลาซ้อมรวม (${formatMonthShort(selectedMonth)})`, box2BX + statBoxW / 2, card2Y + 22);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 42px ' + fontSans;
    ctx.fillText(formatDuration(totalSecs), box2BX + statBoxW / 2, card2Y + 60);

    // CARD 3: 7-DAY CAPSULE BAR CHART
    const card3Y = card2Y + statBoxH + 20;
    const card3H = 340;

    if (!isTransparentBG) {
      ctx.fillStyle = 'rgba(10, 15, 24, 0.75)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(leftX, card3Y, boxW, card3H, 24);
      else ctx.rect(leftX, card3Y, boxW, card3H);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.stroke();
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('7 วันล่าสุด', leftX + 30, card3Y + 20);

    const c3MaxVal = Math.max(...rollingData.dailyValues, 10);
    const c3BottomY = card3Y + card3H - 85;
    const c3MaxBarH = 150;
    const c3BarW = 44;
    const c3Gap = Math.floor((boxW - 60 - 7 * c3BarW) / 6);
    const c3StartX = leftX + 30;

    for (let i = 0; i < 7; i++) {
      const val = rollingData.dailyValues[i];
      const bx = c3StartX + i * (c3BarW + c3Gap);
      const isToday = (i === 6);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, c3BottomY - c3MaxBarH, c3BarW, c3MaxBarH, c3BarW / 2);
      else ctx.rect(bx, c3BottomY - c3MaxBarH, c3BarW, c3MaxBarH);
      ctx.fill();

      if (val > 0) {
        const h = Math.min((val / c3MaxVal) * c3MaxBarH, c3MaxBarH);
        const fillGrad = ctx.createLinearGradient(bx, c3BottomY - h, bx, c3BottomY);
        fillGrad.addColorStop(0, '#FC4C02');
        fillGrad.addColorStop(1, '#3B82F6');

        ctx.fillStyle = fillGrad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, c3BottomY - h, c3BarW, h, c3BarW / 2);
        else ctx.rect(bx, c3BottomY - h, c3BarW, h);
        ctx.fill();

        ctx.font = 'bold 20px ' + fontSans;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏃', bx + c3BarW / 2, c3BottomY - Math.max(h / 2, 18));

        ctx.fillStyle = isToday ? '#FFD700' : '#FFFFFF';
        ctx.font = 'bold 18px ' + fontSans;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(val.toFixed(1), bx + c3BarW / 2, c3BottomY - h - 4);
      }

      ctx.fillStyle = isToday ? '#FC4C02' : 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 20px ' + fontSans;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(rollingData.weekdayLabels[i], bx + c3BarW / 2, c3BottomY + 8);

      ctx.fillStyle = isToday ? '#FC4C02' : 'rgba(255, 255, 255, 0.55)';
      ctx.font = isToday ? 'bold 18px ' + fontSans : '500 16px ' + fontSans;
      ctx.fillText(rollingData.dayNumbers[i], bx + c3BarW / 2, c3BottomY + 34);
    }

    // CARD 4: 4 LATEST WORKOUT LOGS
    const card4Y = card3Y + card3H + 20;
    const athleteWorkouts = getWorkoutsForAthlete(
      athleteName, 
      distVal, 
      0, 
      sportType, 
      0, 
      (currentMonthWorkoutLogs && currentMonthWorkoutLogs.length > 0) ? currentMonthWorkoutLogs : rawWorkoutLogs
    );
    athleteWorkouts.sort((a, b) => {
      if (a.first_seen && b.first_seen && a.first_seen !== b.first_seen) return b.first_seen - a.first_seen;
      return parseThaiDate(b.date) - parseThaiDate(a.date);
    });

    const top4Workouts = athleteWorkouts.slice(0, 4);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`บันทึกกิจกรรมล่าสุด (${athleteWorkouts.length} ครั้ง)`, leftX, card4Y);

    top4Workouts.forEach((w, idx) => {
      const wY = card4Y + 40 + idx * 80;
      const wH = 68;

      if (!isTransparentBG) {
        ctx.fillStyle = 'rgba(10, 15, 24, 0.65)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(leftX, wY, boxW, wH, 16);
        else ctx.rect(leftX, wY, boxW, wH);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.stroke();
      }

      const wIcon = w.sport_type === 'Run' || w.sport_type === 'TrailRun' || w.sport_type === 'VirtualRun' ? '🏃' : w.sport_type === 'Walk' ? '🚶' : w.sport_type === 'Ride' ? '🚴' : '⚡';

      // Left: Icon + Name + Date
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px ' + fontSans;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${wIcon}  ${w.name}`, leftX + 20, wY + 12);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '500 18px ' + fontSans;
      ctx.fillText(translateDateToEn(w.date), leftX + 54, wY + 40);

      // Right: Metric
      const distStr = ['Run', 'TrailRun', 'VirtualRun', 'Walk'].includes(w.sport_type) ? `${w.dist_km.toFixed(1)} km` : formatDuration(w.moving_time);
      const timeSubStr = formatDuration(w.moving_time);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px ' + fontSans;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(distStr, rightX - 20, wY + 12);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '500 18px ' + fontSans;
      ctx.fillText(timeSubStr, rightX - 20, wY + 40);
    });
  } else if (template === 'poster') {
    // ==========================================
    // TEMPLATE 8: PACE POSTER — bold single-activity share card
    // ==========================================
    const pad = ratio === '16:9' ? 90 : 70;
    const heroSize = ratio === '16:9' ? 260 : (sizeH > 1400 ? 248 : 190);
    const heroY = ratio === '16:9' ? sizeH * 0.67 : sizeH * 0.62;

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.font = '700 22px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PIXME ACTIVE CLUB  /  PERSONAL ACTIVITY', pad, pad);

    ctx.fillStyle = '#fff';
    ctx.font = `900 ${ratio === '16:9' ? 90 : 70}px ${fontSans}`;
    ctx.fillText('KEEP', pad, pad + 62);
    ctx.fillStyle = '#ffcc73';
    ctx.fillText('MOVING.', pad, pad + (ratio === '16:9' ? 158 : 138));

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 28px ' + fontSans;
    ctx.fillText(`${emoji}  ${activityName.toUpperCase()}`, pad, pad + (ratio === '16:9' ? 268 : 232));
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '600 21px ' + fontSans;
    ctx.fillText(`${translateDateToEn(dateStr)}  •  ${athleteName}`, pad, pad + (ratio === '16:9' ? 308 : 272));

    ctx.fillStyle = '#fff';
    ctx.font = `900 ${heroSize}px ${fontSans}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(distanceKm.toFixed(2), pad, heroY);
    const posterDistanceWidth = ctx.measureText(distanceKm.toFixed(2)).width;
    ctx.fillStyle = '#ffcc73';
    ctx.font = '800 38px ' + fontSans;
    ctx.fillText('KM', pad + posterDistanceWidth + 14, heroY - 12);

    const statY = heroY + 58;
    const lineW = sizeW - pad * 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.33)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(pad, statY); ctx.lineTo(pad + lineW, statY); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '700 20px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('MOVING TIME', pad, statY + 24);
    ctx.fillText('MONTHLY PROGRESS', pad + lineW * 0.56, statY + 24);
    ctx.fillStyle = '#fff';
    ctx.font = '800 40px ' + fontSans;
    ctx.fillText(timeStr, pad, statY + 52);
    ctx.fillStyle = '#ffcc73';
    ctx.fillText(`${progressPercent.toFixed(0)}%`, pad + lineW * 0.56, statY + 52);

  } else if (template === 'framed') {
    // ==========================================
    // TEMPLATE 6: FRAMED PHOTO & OPEN HERO STATS
    // ==========================================
    if (ratio === '16:9') {
      const frameX = 60;
      const frameY = 60;
      const frameW = 1040;
      const frameH = 960;

      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(frameX, frameY, frameW, frameH, 32);
      else ctx.rect(frameX, frameY, frameW, frameH);
      ctx.clip();

      if (bgImage) {
        const frameAspect = frameW / frameH;
        const imgAspect = bgImage.width / bgImage.height;
        const sliderVal = (window.currentShareData && window.currentShareData.sliderValue !== undefined) ? window.currentShareData.sliderValue : 50;
        
        let sx = 0, sy = 0, sWidth = bgImage.width, sHeight = bgImage.height;
        if (imgAspect > frameAspect) {
          sWidth = bgImage.height * frameAspect;
          sHeight = bgImage.height;
          sx = (bgImage.width - sWidth) * (sliderVal / 100);
        } else {
          sWidth = bgImage.width;
          sHeight = bgImage.width / frameAspect;
          sy = (bgImage.height - sHeight) * (sliderVal / 100);
        }
        ctx.drawImage(bgImage, sx, sy, sWidth, sHeight, frameX, frameY, frameW, frameH);
      } else {
        const innerGrad = ctx.createLinearGradient(frameX, frameY, frameX + frameW, frameY + frameH);
        innerGrad.addColorStop(0, '#1e293b');
        innerGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = innerGrad;
        ctx.fillRect(frameX, frameY, frameW, frameH);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = 'bold 32px ' + fontSans;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📸 เลือกรูปภาพของคุณตรงนี้', frameX + frameW / 2, frameY + frameH / 2);
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(frameX, frameY, frameW, frameH, 32);
      else ctx.rect(frameX, frameY, frameW, frameH);
      ctx.stroke();

      const statX = 1160;
      const statW = sizeW - statX - 60;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px ' + fontSans;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('PIXME PHOTO FEATURE', statX, 70);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = 'bold 20px ' + fontSans;
      ctx.fillText('THE MOMENT, WITH THE NUMBERS', statX, 115);

      ctx.fillStyle = '#FC4C02';
      ctx.font = 'bold 32px ' + fontSans;
      ctx.textAlign = 'right';
      ctx.fillText(athleteName, sizeW - 60, 70);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(statX, 155);
      ctx.lineTo(sizeW - 60, 155);
      ctx.stroke();

      const metricY = 210;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = 'bold 22px ' + fontSans;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`🎯 TARGET PROGRESS (${formatMonthShort(selectedMonth)})`, statX, metricY);

      ctx.fillStyle = progressPercent >= 100 ? '#FFD700' : '#FC4C02';
      ctx.font = 'bold 115px ' + fontSans;
      ctx.fillText(`${progressPercent.toFixed(0)}%`, statX, metricY + 35);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 32px ' + fontSans;
      ctx.fillText(`${distVal.toFixed(1)} / 100 KM`, statX, metricY + 165);

      const distMetricY = 460;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = 'bold 22px ' + fontSans;
      ctx.fillText('🏃 WORKOUT DISTANCE', statX, distMetricY);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 115px ' + fontSans;
      ctx.fillText(distanceKm.toFixed(2), statX, distMetricY + 35);

      const dWidth = ctx.measureText(distanceKm.toFixed(2)).width;
      ctx.fillStyle = '#FC4C02';
      ctx.font = 'bold 44px ' + fontSans;
      ctx.fillText('KM', statX + dWidth + 16, distMetricY + 95);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 30px ' + fontSans;
      ctx.fillText(`${emoji} ${activityName}  •  ⏱️ ${timeStr}`, statX, distMetricY + 165);

      const barY = 740;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(statX, barY, statW, 24, 12);
      else ctx.rect(statX, barY, statW, 24);
      ctx.fill();

      if (progressPercent > 0) {
        const fillW = statW * (progressPercent / 100);
        const fillGrad = ctx.createLinearGradient(statX, barY, statX + fillW, barY);
        fillGrad.addColorStop(0, distVal >= 100 ? '#FFD700' : '#fc4c02');
        fillGrad.addColorStop(1, distVal >= 100 ? '#FFA500' : '#ff7a00');
        ctx.fillStyle = fillGrad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(statX, barY, fillW, 24, 12);
        else ctx.rect(statX, barY, fillW, 24);
        ctx.fill();
      }

      const pillY = 800;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(statX, pillY, statW, 52, 26);
      else ctx.rect(statX, pillY, statW, 52);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px ' + fontSans;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(statusMsg, statX + statW / 2, pillY + 26);

    } else {
      const frameX = 50;
      const frameY = 140;
      const frameW = sizeW - 100;
      const frameH = ratio === '9:16' ? 950 : ratio === '4:5' ? 620 : 450;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px ' + fontSans;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('PIXME PHOTO FEATURE', 50, 50);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = 'bold 20px ' + fontSans;
      ctx.fillText('THE MOMENT, WITH THE NUMBERS', 50, 95);

      ctx.fillStyle = '#FC4C02';
      ctx.font = 'bold 32px ' + fontSans;
      ctx.textAlign = 'right';
      ctx.fillText(athleteName, sizeW - 50, 50);

      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(frameX, frameY, frameW, frameH, 28);
      else ctx.rect(frameX, frameY, frameW, frameH);
      ctx.clip();

      if (bgImage) {
        const frameAspect = frameW / frameH;
        const imgAspect = bgImage.width / bgImage.height;
        const sliderVal = (window.currentShareData && window.currentShareData.sliderValue !== undefined) ? window.currentShareData.sliderValue : 50;
        
        let sx = 0, sy = 0, sWidth = bgImage.width, sHeight = bgImage.height;
        if (imgAspect > frameAspect) {
          sWidth = bgImage.height * frameAspect;
          sHeight = bgImage.height;
          sx = (bgImage.width - sWidth) * (sliderVal / 100);
        } else {
          sWidth = bgImage.width;
          sHeight = bgImage.width / frameAspect;
          sy = (bgImage.height - sHeight) * (sliderVal / 100);
        }
        ctx.drawImage(bgImage, sx, sy, sWidth, sHeight, frameX, frameY, frameW, frameH);
      } else {
        const innerGrad = ctx.createLinearGradient(frameX, frameY, frameX + frameW, frameY + frameH);
        innerGrad.addColorStop(0, '#1e293b');
        innerGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = innerGrad;
        ctx.fillRect(frameX, frameY, frameW, frameH);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = 'bold 32px ' + fontSans;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('📸 เลือกรูปภาพของคุณตรงนี้', frameX + frameW / 2, frameY + frameH / 2);
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(frameX, frameY, frameW, frameH, 28);
      else ctx.rect(frameX, frameY, frameW, frameH);
      ctx.stroke();

      const statsY = frameY + frameH + 30;

      ctx.fillStyle = progressPercent >= 100 ? '#FFD700' : '#FC4C02';
      ctx.font = `bold ${ratio === '9:16' ? 110 : 90}px ${fontSans}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${progressPercent.toFixed(0)}%`, 50, statsY);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.font = 'bold 22px ' + fontSans;
      ctx.fillText(`TARGET (${distVal.toFixed(1)}/100K)`, 50, statsY + (ratio === '9:16' ? 120 : 95));

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${ratio === '9:16' ? 110 : 90}px ${fontSans}`;
      ctx.textAlign = 'right';
      ctx.fillText(`${distanceKm.toFixed(2)}`, sizeW - 50, statsY);

      ctx.fillStyle = '#FC4C02';
      ctx.font = 'bold 22px ' + fontSans;
      ctx.fillText(`KM (${emoji} ${activityName})`, sizeW - 50, statsY + (ratio === '9:16' ? 120 : 95));

      const barY = statsY + (ratio === '9:16' ? 175 : 145);
      const barW = sizeW - 100;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(50, barY, barW, 20, 10);
      else ctx.rect(50, barY, barW, 20);
      ctx.fill();

      if (progressPercent > 0) {
        const fillW = barW * (progressPercent / 100);
        const fillGrad = ctx.createLinearGradient(50, barY, 50 + fillW, barY);
        fillGrad.addColorStop(0, distVal >= 100 ? '#FFD700' : '#fc4c02');
        fillGrad.addColorStop(1, distVal >= 100 ? '#FFA500' : '#ff7a00');
        ctx.fillStyle = fillGrad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(50, barY, fillW, 20, 10);
        else ctx.rect(50, barY, fillW, 20);
        ctx.fill();
      }

      const bottomRowY = barY + 36;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.font = 'bold 22px ' + fontSans;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(translateDateToEn(dateStr) + `  •  ⏱️ ${timeStr}`, 50, bottomRowY);

      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 22px ' + fontSans;
      ctx.textAlign = 'right';
      ctx.fillText(statusMsg, sizeW - 50, bottomRowY);
    }
  } else {
    // ==========================================
    // TEMPLATE 1: CLASSIC (DEFAULT)
    // ==========================================
    const topY = ratio === '1:1' ? 85 : 70;
    const leftX = 60;
    const rightX = sizeW - 60;

    // Header Top Left: Club Header + 2-Line Activity Info below
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 38px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Pixme Run Club', leftX, topY);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 20px ' + fontSans;
    ctx.fillText('Shut up !!! ,,, and Run …,,,', leftX, topY + 48);

    // Header Top Right: Athlete Profile Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 34px ' + fontSans;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(athleteName, rightX, topY);

    ctx.shadowBlur = 0;

    const barY = sizeH - (sizeH > 1400 ? 340 : 270);
    const barWidth = sizeW - 120;
    const barHeight = 24;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 24px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`🎯 MONTHLY TARGET PROGRESS (${formatMonthShort(selectedMonth)})`, 60, barY - 15);
    
    ctx.fillStyle = progressPercent >= 100 ? '#FFD700' : '#FC4C02';
    ctx.font = 'bold 26px ' + fontSans;
    ctx.textAlign = 'right';
    ctx.fillText(`${distVal.toFixed(1)} / 100 KM (${progressPercent.toFixed(0)}%)`, sizeW - 60, barY - 15);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(60, barY, barWidth, barHeight, 12);
    else ctx.rect(60, barY, barWidth, barHeight);
    ctx.fill();
    
    if (progressPercent > 0) {
      const fillGrad = ctx.createLinearGradient(60, barY, 60 + barWidth * (progressPercent / 100), barY);
      if (distVal >= 100) {
        fillGrad.addColorStop(0, '#FFD700');
        fillGrad.addColorStop(1, '#FFA500');
      } else if (distVal >= 80) {
        fillGrad.addColorStop(0, '#00C6FF');
        fillGrad.addColorStop(1, '#0072FF');
      } else {
        fillGrad.addColorStop(0, '#fc4c02');
        fillGrad.addColorStop(1, '#ff7a00');
      }
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(60, barY, barWidth * (progressPercent / 100), barHeight, 12);
      else ctx.rect(60, barY, barWidth * (progressPercent / 100), barHeight);
      ctx.fill();
    }
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 52px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${emoji} ${activityName}`, 60, sizeH - 120);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = '500 28px ' + fontSans;
    ctx.fillText(translateDateToEn(dateStr), 60, sizeH - 70);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 120px ' + fontSans;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(distanceKm.toFixed(2), sizeW - 120, sizeH - 110);
    
    ctx.fillStyle = '#FC4C02';
    ctx.font = 'bold 36px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.fillText('KM', sizeW - 110, sizeH - 120);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px ' + fontSans;
    ctx.textAlign = 'right';
    ctx.fillText(`⏱️ ${timeStr}`, sizeW - 60, sizeH - 70);
  }
}

function downloadGeneratedGraphic(athleteName) {
  const canvas = document.getElementById('share-canvas');
  if (!canvas) return;
  
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `PixmeRun_${athleteName.replace(/\s+/g, '_')}_${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function shareGeneratedGraphic(athleteName) {
  const canvas = document.getElementById('share-canvas');
  if (!canvas) return;
  
  canvas.toBlob(async function(blob) {
    if (!blob) return;
    const file = new File([blob], `PixmeRun_${athleteName.replace(/\s+/g, '_')}.png`, { type: 'image/png' });
    
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'กิจกรรมจาก Pixme Active Club',
          text: 'ดูสถิติและเป้าหมายประจำเดือนของฉัน!'
        });
      } catch (err) {
        console.error('การแชร์ล้มเหลว:', err);
      }
    } else {
      alert('เบราว์เซอร์นี้ไม่รองรับการแชร์ไฟล์โดยตรง กรุณากดค้างที่รูปภาพเพื่อบันทึกและแชร์ด้วยตนเองครับ');
    }
  }, 'image/png');
}

// ==========================================================================
// Sticker Pack & Modular Asset Exporter (Roxfit Style)
// ==========================================================================

function switchShareMode(mode) {
  const graphicBtn = document.getElementById('mode-btn-graphic');
  const stickersBtn = document.getElementById('mode-btn-stickers');
  const graphicView = document.getElementById('share-view-graphic');
  const stickersView = document.getElementById('share-view-stickers');
  const graphicFooter = document.getElementById('footer-actions-graphic');
  const stickersFooter = document.getElementById('footer-actions-stickers');
  const tipText = document.getElementById('share-modal-tip-text');

  if (mode === 'stickers') {
    if (graphicBtn) graphicBtn.classList.remove('active');
    if (stickersBtn) stickersBtn.classList.add('active');
    if (graphicView) graphicView.classList.add('hidden');
    if (stickersView) stickersView.classList.remove('hidden');
    if (graphicFooter) graphicFooter.style.display = 'none';
    if (stickersFooter) {
      stickersFooter.classList.remove('hidden');
      stickersFooter.style.display = 'flex';
    }
    if (tipText) tipText.textContent = '💡 ทิป: สามารถแตะ "คัดลอก" เพื่อนำสติกเกอร์ไป Paste ใน IG Story หรือกด "ดาวน์โหลดที่เลือก" เพื่อเซฟ PNG แยกชิ้นทั้งหมดได้ทันที';
    renderAllStickers();
  } else {
    if (graphicBtn) graphicBtn.classList.add('active');
    if (stickersBtn) stickersBtn.classList.remove('active');
    if (graphicView) graphicView.classList.remove('hidden');
    if (stickersView) stickersView.classList.add('hidden');
    if (graphicFooter) graphicFooter.style.display = 'contents';
    if (stickersFooter) {
      stickersFooter.classList.add('hidden');
      stickersFooter.style.display = 'none';
    }
    if (tipText) tipText.textContent = '💡 ทิป: บนมือถือสามารถกดค้างที่รูปภาพด้านบนเพื่อบันทึกหรือคัดลอกได้เช่นกัน';
    refreshShareCanvas();
  }
}

let isOverlaysExpanded = false;

function toggleOverlaysExpanded() {
  isOverlaysExpanded = !isOverlaysExpanded;
  const btn = document.getElementById('rox-toggle-grid-btn');
  const track = document.getElementById('rox-overlays-track');
  const gridWrapper = document.getElementById('rox-overlays-grid-wrapper');
  
  if (isOverlaysExpanded) {
    if (btn) btn.textContent = 'ย่อมุมมอง ▴';
    if (track) track.classList.add('hidden');
    if (gridWrapper) gridWrapper.classList.remove('hidden');
  } else {
    if (btn) btn.textContent = 'ดูทั้งหมด ▾';
    if (track) track.classList.remove('hidden');
    if (gridWrapper) gridWrapper.classList.add('hidden');
  }
}

function toggleAllStickers(select) {
  const checkboxes = document.querySelectorAll('.sticker-checkbox');
  checkboxes.forEach(cb => { cb.checked = select; });
  updateStickerCount();
}

function updateStickerCount() {
  const checkboxes = document.querySelectorAll('.sticker-checkbox');
  const checked = document.querySelectorAll('.sticker-checkbox:checked');
  const countEl = document.getElementById('stickers-selected-count');
  if (countEl) {
    countEl.textContent = `เลือกแล้ว ${checked.length}/${checkboxes.length} ชิ้น`;
  }
}

async function downloadSelectedStickers(athleteName) {
  const checked = Array.from(document.querySelectorAll('.sticker-checkbox:checked'));
  if (checked.length === 0) {
    showStickerToast('⚠️ กรุณาเลือกสติกเกอร์อย่างน้อย 1 ชิ้นเพื่อดาวน์โหลด');
    return;
  }

  const cleanName = (athleteName || 'Athlete').replace(/\s+/g, '_');
  const btn = document.getElementById('stickers-download-btn');
  const origText = btn ? btn.textContent : '';
  if (btn) btn.textContent = `⏳ กำลังบันทึก (${checked.length} ชิ้น)...`;

  for (let i = 0; i < checked.length; i++) {
    const stickerId = checked[i].dataset.sticker;
    const canvas = document.getElementById(`sticker-canvas-${stickerId}`);
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `PixmeSticker_${cleanName}_${stickerId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (i < checked.length - 1) {
        await new Promise(r => setTimeout(r, 260));
      }
    }
  }

  if (btn) btn.textContent = '✅ บันทึกครบแล้ว!';
  showStickerToast(`🎉 บันทึกสติกเกอร์ที่เลือก ${checked.length} ชิ้นเรียบร้อย!`);
  setTimeout(() => {
    if (btn) btn.textContent = origText;
  }, 2500);
}

const STICKER_CONFIGS = [
  { id: 'activity', title: '🏃 สถิติกิจกรรม', desc: 'ป้ายระยะทาง เวลา และ Pace' },
  { id: 'target', title: '🎯 เป้าหมาย 100K', desc: 'แถบความคืบหน้าและเปอร์เซ็นต์สะสม' },
  { id: 'weekly', title: '📊 กราฟ 7 วัน', desc: 'แท่งแคปซูลทรงรียาว Strava' },
  { id: 'header', title: '🏷️ หัวคลับ & ชื่อ', desc: 'โลโก้คลับ สโลแกน และชื่อสมาชิก' },
  { id: 'monthly_duo', title: '📦 สะสมเดือน', desc: 'การ์ดคู่ระยะวิ่งสะสม + เวลาซ้อม' },
  { id: 'recent_logs', title: '📝 4 กิจกรรมล่าสุด', desc: 'ประวัติกิจกรรมย่อย 4 รายการ' },
  { id: 'status_badge', title: '🏅 ป้ายสถานะ', desc: 'ริบบิ้นสถานะและเป้าหมาย' }
];

function renderAllStickers() {
  const track = document.getElementById('rox-overlays-track');
  const gridContainer = document.getElementById('stickers-grid-container');
  if (!window.currentShareData) return;

  const d = window.currentShareData;
  const athlete = rawActivities.find(a => a.name === d.athleteName);
  const distVal = athlete ? athlete.distance : d.distanceKm;
  const progressPercent = Math.min((distVal / 100) * 100, 100);
  
  let statusMsg = `🏃 ขาดอีก ${(100 - distVal).toFixed(1)} km ถึงเป้าหมาย!`;
  if (distVal >= 100) {
    statusMsg = '🎉 Goal 100km Achieved!';
  } else if (distVal >= 80) {
    statusMsg = `💪 เหลือเพียง ${(100 - distVal).toFixed(1)} km!`;
  }

  // 1. Generate Horizontal Carousel cards if empty
  if (track && track.children.length === 0) {
    track.innerHTML = STICKER_CONFIGS.map(s => `
      <div class="rox-overlay-card" id="rox-card-${s.id}" onclick="copyStickerToClipboard('${s.id}')" title="แตะเพื่อคัดลอกรูปภาพไป Paste ใน IG Story">
        <div class="rox-overlay-preview">
          <canvas id="sticker-canvas-${s.id}" style="display:none;"></canvas>
          <img id="sticker-preview-${s.id}" class="sticker-img" alt="${s.id}" />
        </div>
        <div class="rox-overlay-info" style="justify-content: flex-end;">
          <button class="rox-overlay-btn-copy" onclick="event.stopPropagation(); downloadSingleSticker('${s.id}')" title="ดาวน์โหลดไฟล์ PNG">📥 PNG</button>
        </div>
      </div>
    `).join('');
  }

  // 2. Generate Expanded Grid cards if empty (Ultra clean without label text)
  if (gridContainer && gridContainer.children.length === 0) {
    gridContainer.innerHTML = STICKER_CONFIGS.map(s => `
      <div class="sticker-card" id="sticker-grid-card-${s.id}">
        <div class="sticker-card-header">
          <input type="checkbox" class="sticker-checkbox" data-sticker="${s.id}" checked onchange="updateStickerCount()" />
          <div class="sticker-quick-actions">
            <button class="sticker-mini-btn" title="คัดลอกรูปภาพ" onclick="copyStickerToClipboard('${s.id}')">📋</button>
            <button class="sticker-mini-btn" title="ดาวน์โหลด PNG" onclick="downloadSingleSticker('${s.id}')">📥</button>
          </div>
        </div>
        <div class="sticker-preview-box" onclick="copyStickerToClipboard('${s.id}')" style="cursor:pointer;" title="แตะเพื่อคัดลอก">
          <img id="sticker-grid-preview-${s.id}" class="sticker-img" alt="${s.id}" />
        </div>
      </div>
    `).join('');
    updateStickerCount();
  }

  // Draw each sticker on its offscreen transparent canvas
  try { renderActivityStatSticker('activity', d.activityName, d.dateStr, d.distanceKm, d.movingTimeSec, d.sportType); } catch (e) { console.error('Sticker activity err:', e); }
  try { renderMonthlyTargetSticker('target', d.athleteName, distVal, progressPercent, statusMsg, selectedMonth); } catch (e) { console.error('Sticker target err:', e); }
  try { render7DayChartSticker('weekly', d.athleteName); } catch (e) { console.error('Sticker weekly err:', e); }
  try { renderClubHeaderSticker('header', d.athleteName); } catch (e) { console.error('Sticker header err:', e); }
  try { renderMonthlyDuoSticker('monthly_duo', athlete, distVal, d.sportType, selectedMonth); } catch (e) { console.error('Sticker duo err:', e); }
  try { renderRecentWorkoutsSticker('recent_logs', d.athleteName, distVal, d.sportType); } catch (e) { console.error('Sticker logs err:', e); }
  try { renderStatusRibbonSticker('status_badge', distVal, statusMsg); } catch (e) { console.error('Sticker status err:', e); }

  // Drag-to-scroll support for mouse users on carousel
  if (track && !track.dataset.dragInit) {
    track.dataset.dragInit = 'true';
    let isDown = false, startX, scrollLeft;
    track.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - track.offsetLeft;
      scrollLeft = track.scrollLeft;
    });
    track.addEventListener('mouseleave', () => { isDown = false; });
    track.addEventListener('mouseup', () => { isDown = false; });
    track.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      const walk = (x - startX) * 1.5;
      track.scrollLeft = scrollLeft - walk;
    });
  }
}

async function downloadAllStickersSeq(athleteName) {
  const cleanName = (athleteName || 'Athlete').replace(/\s+/g, '_');
  const seeAllBtn = document.querySelector('.rox-see-all-btn');
  const originalText = seeAllBtn ? seeAllBtn.textContent : '';
  if (seeAllBtn) seeAllBtn.textContent = '⏳ กำลังโหลด...';

  for (let i = 0; i < STICKER_CONFIGS.length; i++) {
    const s = STICKER_CONFIGS[i];
    const canvas = document.getElementById(`sticker-canvas-${s.id}`);
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `PixmeSticker_${cleanName}_${s.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (i < STICKER_CONFIGS.length - 1) {
        await new Promise(r => setTimeout(r, 260));
      }
    }
  }

  if (seeAllBtn) seeAllBtn.textContent = '✅ โหลดครบแล้ว!';
  showStickerToast(`🎉 ดาวน์โหลดสติกเกอร์ครบทั้ง ${STICKER_CONFIGS.length} ชิ้นเรียบร้อย!`);
  setTimeout(() => {
    if (seeAllBtn) seeAllBtn.textContent = originalText;
  }, 2500);
}

function updateStickerImagePreview(stickerKey) {
  const canvas = document.getElementById(`sticker-canvas-${stickerKey}`);
  if (!canvas) return;
  const dataUrl = canvas.toDataURL('image/png');
  
  const imgCarousel = document.getElementById(`sticker-preview-${stickerKey}`);
  if (imgCarousel) imgCarousel.src = dataUrl;
  
  const imgGrid = document.getElementById(`sticker-grid-preview-${stickerKey}`);
  if (imgGrid) imgGrid.src = dataUrl;
}

// 1. Club Header Sticker
function renderClubHeaderSticker(id, athleteName) {
  const canvas = document.getElementById(`sticker-canvas-${id}`);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const fontSans = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Thai", sans-serif';

  canvas.width = 960;
  canvas.height = 200;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background Capsule Glass
  ctx.fillStyle = 'rgba(10, 15, 24, 0.78)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(20, 20, 920, 160, 28);
  else ctx.rect(20, 20, 920, 160);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Left: Club Name & Slogan
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 44px ' + fontSans;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Pixme Run Club', 50, 48);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = 'bold 22px ' + fontSans;
  ctx.fillText('Shut up !!! ,,, and Run …,,,', 50, 108);

  // Right: Athlete Name
  ctx.fillStyle = '#FC4C02';
  ctx.font = 'bold 38px ' + fontSans;
  ctx.textAlign = 'right';
  ctx.fillText(athleteName, 910, 52);

  updateStickerImagePreview(id);
}

// 2. Activity Stat Sticker
function renderActivityStatSticker(id, activityName, dateStr, distanceKm, movingTimeSec, sportType) {
  const canvas = document.getElementById(`sticker-canvas-${id}`);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const fontSans = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Thai", sans-serif';
  const emoji = sportType === 'Run' || sportType === 'TrailRun' || sportType === 'VirtualRun' ? '🏃' : sportType === 'Walk' ? '🚶' : sportType === 'Ride' ? '🚴' : '⚡';
  const timeStr = formatDuration(movingTimeSec);

  canvas.width = 960;
  canvas.height = 240;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background Glass Card
  ctx.fillStyle = 'rgba(10, 15, 24, 0.82)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(20, 20, 920, 200, 28);
  else ctx.rect(20, 20, 920, 200);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Giant Distance
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 88px ' + fontSans;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(distanceKm.toFixed(2), 50, 42);

  const distWidth = ctx.measureText(distanceKm.toFixed(2)).width;
  ctx.fillStyle = '#FC4C02';
  ctx.font = 'bold 36px ' + fontSans;
  ctx.fillText('KM', 50 + distWidth + 14, 86);

  // Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, 148);
  ctx.lineTo(910, 148);
  ctx.stroke();

  // Activity Info Line
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 24px ' + fontSans;
  ctx.fillText(`${emoji} ${activityName}`, 50, 166);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '500 22px ' + fontSans;
  ctx.textAlign = 'right';
  ctx.fillText(`⏱️ ${timeStr}  •  📅 ${translateDateToEn(dateStr)}`, 910, 168);

  updateStickerImagePreview(id);
}

// 3. Monthly Target Progress Sticker
function renderMonthlyTargetSticker(id, athleteName, distVal, progressPercent, statusMsg, selMonth) {
  const canvas = document.getElementById(`sticker-canvas-${id}`);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const fontSans = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Thai", sans-serif';

  canvas.width = 960;
  canvas.height = 240;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(10, 15, 24, 0.82)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(20, 20, 920, 200, 28);
  else ctx.rect(20, 20, 920, 200);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Header Target
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = 'bold 26px ' + fontSans;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`🎯 TARGET (${formatMonthShort(selMonth)}) - 100K`, 50, 42);

  ctx.fillStyle = progressPercent >= 100 ? '#FFD700' : '#FC4C02';
  ctx.font = 'bold 30px ' + fontSans;
  ctx.textAlign = 'right';
  ctx.fillText(`${distVal.toFixed(1)} / 100 KM (${progressPercent.toFixed(0)}%)`, 910, 40);

  // Progress Bar
  const barY = 90;
  const barW = 860;
  const barH = 22;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(50, barY, barW, barH, 11);
  else ctx.rect(50, barY, barW, barH);
  ctx.fill();

  if (progressPercent > 0) {
    const fillW = barW * (progressPercent / 100);
    const fillGrad = ctx.createLinearGradient(50, barY, 50 + fillW, barY);
    fillGrad.addColorStop(0, distVal >= 100 ? '#FFD700' : '#fc4c02');
    fillGrad.addColorStop(1, distVal >= 100 ? '#FFA500' : '#ff7a00');
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(50, barY, fillW, barH, 11);
    else ctx.rect(50, barY, fillW, barH);
    ctx.fill();
  }

  // Status Badge
  const pillY = 136;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(50, pillY, barW, 54, 27);
  else ctx.rect(50, pillY, barW, 54);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px ' + fontSans;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(statusMsg, 50 + barW / 2, pillY + 27);

  updateStickerImagePreview(id);
}

// 4. 7-Day Capsule Bar Chart Sticker
function render7DayChartSticker(id, athleteName) {
  const canvas = document.getElementById(`sticker-canvas-${id}`);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const fontSans = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Thai", sans-serif';
  const rollingData = get7DayRollingData(athleteName);

  canvas.width = 960;
  canvas.height = 360;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(10, 15, 24, 0.82)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(20, 20, 920, 320, 28);
  else ctx.rect(20, 20, 920, 320);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px ' + fontSans;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('7 วันล่าสุด', 50, 42);

  const maxVal = Math.max(...rollingData.dailyValues, 10);
  const chartBottomY = 260;
  const maxBarH = 150;
  const barW = 46;
  const gap = 38;
  const totalBarsWidth = 7 * barW + 6 * gap;
  const startX = 20 + Math.floor((920 - totalBarsWidth) / 2);

  for (let i = 0; i < 7; i++) {
    const val = rollingData.dailyValues[i];
    const bx = startX + i * (barW + gap);
    const isToday = (i === 6);
    
    // Track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, chartBottomY - maxBarH, barW, maxBarH, barW / 2);
    else ctx.rect(bx, chartBottomY - maxBarH, barW, maxBarH);
    ctx.fill();

    // Active
    if (val > 0) {
      const h = Math.min((val / maxVal) * maxBarH, maxBarH);
      const fillGrad = ctx.createLinearGradient(bx, chartBottomY - h, bx, chartBottomY);
      fillGrad.addColorStop(0, '#FC4C02');
      fillGrad.addColorStop(1, '#3B82F6');
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, chartBottomY - h, barW, h, barW / 2);
      else ctx.rect(bx, chartBottomY - h, barW, h);
      ctx.fill();

      // Runner emoji
      ctx.font = 'bold 20px ' + fontSans;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏃', bx + barW / 2, chartBottomY - Math.max(h / 2, 18));

      // Value
      ctx.fillStyle = isToday ? '#FFD700' : '#FFFFFF';
      ctx.font = 'bold 18px ' + fontSans;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(val.toFixed(1), bx + barW / 2, chartBottomY - h - 4);
    }

    // Weekday & Day No
    ctx.fillStyle = isToday ? '#FC4C02' : 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 20px ' + fontSans;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(rollingData.weekdayLabels[i], bx + barW / 2, chartBottomY + 8);

    ctx.fillStyle = isToday ? '#FC4C02' : 'rgba(255, 255, 255, 0.55)';
    ctx.font = isToday ? 'bold 18px ' + fontSans : '500 16px ' + fontSans;
    ctx.fillText(rollingData.dayNumbers[i], bx + barW / 2, chartBottomY + 34);
  }

  updateStickerImagePreview(id);
}

// 5. Monthly Duo Box Sticker
function renderMonthlyDuoSticker(id, athlete, distVal, sportType, selMonth) {
  const canvas = document.getElementById(`sticker-canvas-${id}`);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const fontSans = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Thai", sans-serif';

  let totalSecs = 0;
  if (athlete && athlete.movingTime !== undefined && athlete.movingTime > 0) {
    totalSecs = athlete.movingTime;
  } else if (athlete) {
    const logsToUse = (currentMonthWorkoutLogs && currentMonthWorkoutLogs.length > 0) ? currentMonthWorkoutLogs : rawWorkoutLogs;
    const athleteWorkouts = getWorkoutsForAthlete(athlete.name, distVal, 0, sportType, 0, logsToUse);
    athleteWorkouts.forEach(w => { totalSecs += w.moving_time; });
  }

  canvas.width = 960;
  canvas.height = 180;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cardW = 445;
  const cardH = 140;

  // Box 1
  ctx.fillStyle = 'rgba(10, 15, 24, 0.82)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(20, 20, cardW, cardH, 24);
  else ctx.rect(20, 20, cardW, cardH);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = 'bold 22px ' + fontSans;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`วิ่งสะสม (${formatMonthShort(selMonth)})`, 20 + cardW / 2, 42);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 44px ' + fontSans;
  ctx.fillText(`${distVal.toFixed(1)} km`, 20 + cardW / 2, 84);

  // Box 2
  const box2X = 20 + cardW + 30;
  ctx.fillStyle = 'rgba(10, 15, 24, 0.82)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(box2X, 20, cardW, cardH, 24);
  else ctx.rect(box2X, 20, cardW, cardH);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = 'bold 22px ' + fontSans;
  ctx.textAlign = 'center';
  ctx.fillText(`เวลาซ้อมรวม (${formatMonthShort(selMonth)})`, box2X + cardW / 2, 42);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 44px ' + fontSans;
  ctx.fillText(formatDuration(totalSecs), box2X + cardW / 2, 84);

  updateStickerImagePreview(id);
}

// 6. Recent Workouts Sticker
function renderRecentWorkoutsSticker(id, athleteName, distVal, sportType) {
  const canvas = document.getElementById(`sticker-canvas-${id}`);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const fontSans = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Thai", sans-serif';

  const athleteWorkouts = getWorkoutsForAthlete(
    athleteName, 
    distVal, 
    0, 
    sportType, 
    0, 
    (currentMonthWorkoutLogs && currentMonthWorkoutLogs.length > 0) ? currentMonthWorkoutLogs : rawWorkoutLogs
  );
  athleteWorkouts.sort((a, b) => {
    if (a.first_seen && b.first_seen && a.first_seen !== b.first_seen) return b.first_seen - a.first_seen;
    return parseThaiDate(b.date) - parseThaiDate(a.date);
  });
  const top4Workouts = athleteWorkouts.slice(0, 4);

  canvas.width = 960;
  canvas.height = 420;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(10, 15, 24, 0.82)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(20, 20, 920, 380, 28);
  else ctx.rect(20, 20, 920, 380);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px ' + fontSans;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`บันทึกกิจกรรมล่าสุด (${athleteWorkouts.length} ครั้ง)`, 50, 42);

  top4Workouts.forEach((w, idx) => {
    const wY = 86 + idx * 72;
    const wH = 60;
    const boxW = 860;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(50, wY, boxW, wH, 14);
    else ctx.rect(50, wY, boxW, wH);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();

    const wIcon = w.sport_type === 'Run' || w.sport_type === 'TrailRun' || w.sport_type === 'VirtualRun' ? '🏃' : w.sport_type === 'Walk' ? '🚶' : w.sport_type === 'Ride' ? '🚴' : '⚡';

    // Left
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${wIcon}  ${w.name}`, 68, wY + 20);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = '500 16px ' + fontSans;
    ctx.fillText(translateDateToEn(w.date), 98, wY + 44);

    // Right
    const distStr = ['Run', 'TrailRun', 'VirtualRun', 'Walk'].includes(w.sport_type) ? `${w.dist_km.toFixed(1)} km` : formatDuration(w.moving_time);
    const timeSubStr = formatDuration(w.moving_time);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px ' + fontSans;
    ctx.textAlign = 'right';
    ctx.fillText(distStr, 880, wY + 20);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '500 16px ' + fontSans;
    ctx.fillText(timeSubStr, 880, wY + 44);
  });

  updateStickerImagePreview(id);
}

// 7. Status Ribbon Sticker
function renderStatusRibbonSticker(id, distVal, statusMsg) {
  const canvas = document.getElementById(`sticker-canvas-${id}`);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const fontSans = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Thai", sans-serif';

  canvas.width = 840;
  canvas.height = 140;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(10, 15, 24, 0.85)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(20, 20, 800, 100, 50);
  else ctx.rect(20, 20, 800, 100);
  ctx.fill();

  const borderGrad = ctx.createLinearGradient(20, 20, 820, 120);
  borderGrad.addColorStop(0, '#FC4C02');
  borderGrad.addColorStop(0.5, '#FFD700');
  borderGrad.addColorStop(1, '#3B82F6');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px ' + fontSans;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(statusMsg, 420, 70);

  updateStickerImagePreview(id);
}

// ==========================================================================
// Sticker Batch & Individual Export Handlers (Multi-Export without ZIP)
// ==========================================================================

function toggleAllStickers(select) {
  const checkboxes = document.querySelectorAll('.sticker-checkbox');
  checkboxes.forEach(cb => cb.checked = select);
  updateStickerCount();
}

function updateStickerCount() {
  const total = document.querySelectorAll('.sticker-checkbox').length;
  const checked = document.querySelectorAll('.sticker-checkbox:checked').length;
  const countEl = document.getElementById('stickers-selected-count');
  if (countEl) countEl.textContent = `เลือกแล้ว ${checked}/${total} ชิ้น`;
  const downloadBtn = document.getElementById('stickers-download-btn');
  if (downloadBtn) {
    downloadBtn.innerHTML = `📥 ดาวน์โหลดที่เลือก (${checked} ชิ้น)`;
  }
}

function downloadSingleSticker(stickerKey) {
  const canvas = document.getElementById(`sticker-canvas-${stickerKey}`);
  if (!canvas) return;
  const d = window.currentShareData;
  const cleanName = (d ? d.athleteName : 'Athlete').replace(/\s+/g, '_');
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `PixmeSticker_${cleanName}_${stickerKey}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showStickerToast('📥 ดาวน์โหลดไฟล์ PNG เรียบร้อยแล้ว!');
}

async function copyStickerToClipboard(stickerKey) {
  const canvas = document.getElementById(`sticker-canvas-${stickerKey}`);
  if (!canvas) return;

  if (navigator.clipboard && window.ClipboardItem) {
    try {
      canvas.toBlob(async function(blob) {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          showStickerToast('📋 คัดลอกสติกเกอร์แล้ว! นำไป Paste ใน IG Story หรือแอปแต่งภาพได้ทันที');
        } catch (err) {
          console.warn('Clipboard write permission denied, falling back to download', err);
          downloadSingleSticker(stickerKey);
        }
      }, 'image/png');
    } catch (err) {
      console.warn('Blob generation error', err);
      downloadSingleSticker(stickerKey);
    }
  } else {
    downloadSingleSticker(stickerKey);
  }
}

// Multi-Export All Selected Stickers Sequentially (No ZIP needed!)
async function downloadSelectedStickers(athleteName) {
  const checkboxes = document.querySelectorAll('.sticker-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('กรุณาเลือกสติกเกอร์อย่างน้อย 1 ชิ้นเพื่อดาวน์โหลดครับ');
    return;
  }
  
  const downloadBtn = document.getElementById('stickers-download-btn');
  const originalText = downloadBtn ? downloadBtn.innerHTML : '';
  if (downloadBtn) downloadBtn.innerHTML = `⏳ กำลังดาวน์โหลด (${checkboxes.length} ชิ้น)...`;

  const cleanName = athleteName.replace(/\s+/g, '_');

  for (let i = 0; i < checkboxes.length; i++) {
    const cb = checkboxes[i];
    const stickerKey = cb.getAttribute('data-sticker');
    const canvas = document.getElementById(`sticker-canvas-${stickerKey}`);
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `PixmeSticker_${cleanName}_${stickerKey}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Delay between sequential downloads so browser doesn't throttle or block
      if (i < checkboxes.length - 1) {
        await new Promise(r => setTimeout(r, 260));
      }
    }
  }

  if (downloadBtn) downloadBtn.innerHTML = `✅ ดาวน์โหลดครบ ${checkboxes.length} ชิ้นแล้ว!`;
  showStickerToast(`🎉 ดาวน์โหลดสติกเกอร์ครบทั้ง ${checkboxes.length} ชิ้นเรียบร้อย!`);
  setTimeout(() => {
    if (downloadBtn) downloadBtn.innerHTML = originalText;
  }, 2500);
}

async function shareSelectedStickers(athleteName) {
  const checkboxes = document.querySelectorAll('.sticker-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('กรุณาเลือกสติกเกอร์อย่างน้อย 1 ชิ้นเพื่อแชร์ครับ');
    return;
  }

  const cleanName = athleteName.replace(/\s+/g, '_');
  const files = [];

  for (let i = 0; i < checkboxes.length; i++) {
    const cb = checkboxes[i];
    const stickerKey = cb.getAttribute('data-sticker');
    const canvas = document.getElementById(`sticker-canvas-${stickerKey}`);
    if (canvas) {
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      if (blob) {
        files.push(new File([blob], `PixmeSticker_${cleanName}_${stickerKey}.png`, { type: 'image/png' }));
      }
    }
  }

  if (files.length > 0 && navigator.canShare && navigator.canShare({ files: files })) {
    try {
      await navigator.share({
        files: files,
        title: 'Pixme Active Club Stickers',
        text: 'สติกเกอร์สถิติกิจกรรมสำหรับแต่งรูปภาพ'
      });
    } catch (err) {
      console.error('Share failed', err);
    }
  } else {
    // Fallback to sequential multi-download
    downloadSelectedStickers(athleteName);
  }
}

function showStickerToast(msg) {
  let toast = document.getElementById('sticker-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'sticker-toast';
    toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.96);color:#fff;padding:12px 24px;border-radius:30px;border:1px solid rgba(252,76,2,0.7);box-shadow:0 10px 30px rgba(0,0,0,0.6);font-size:0.85rem;font-weight:600;z-index:999999;transition:all 0.3s ease;pointer-events:none;text-align:center;max-width:90%;opacity:0;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
  }, 2600);
}


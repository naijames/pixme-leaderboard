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
// Workout Overlay Graphic & Sharing Functions
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
  
  // 2. Set Modal Content
  modal.innerHTML = `
    <div class="share-modal-backdrop" onclick="closeShareOverlay()"></div>
    <div class="share-modal-content">
      <div class="share-modal-header">
        <h4>สร้างรูปสรุปกิจกรรม</h4>
        <button class="share-modal-close" onclick="closeShareOverlay()">&times;</button>
      </div>
      <div class="share-modal-body">
        <div class="share-options-bar" style="display: flex; flex-direction: column; gap: 8px; width: 100%; margin-bottom: 6px;">
          <div class="share-template-selector">
            <button class="template-pill active" onclick="selectShareTemplate('classic', event)">🏆 คลาสสิก</button>
            <button class="template-pill" onclick="selectShareTemplate('minimal', event)">⚡ มินิมอล (Nike/Strava)</button>
            <button class="template-pill" onclick="selectShareTemplate('stamp', event)">🏷️ ตราประทับสปอร์ต</button>
            <button class="template-pill" onclick="selectShareTemplate('monthly', event)">🎯 เป้าหมายเดือน</button>
            <button class="template-pill" onclick="selectShareTemplate('weekly', event)">📊 กราฟ 7 วัน</button>
            <button class="template-pill" onclick="selectShareTemplate('profile', event)">📱 สรุปโปรไฟล์</button>
            <button class="template-pill" onclick="selectShareTemplate('framed', event)">🖼️ กรอบรูป & สถิติเด่น</button>
          </div>
          <div class="share-ratio-selector">
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
        
        <div class="share-controls" style="display: flex; flex-direction: column; align-items: center; width: 100%; gap: 10px;">
          <div style="display: flex; gap: 10px; align-items: center; justify-content: center; flex-wrap: wrap; width: 100%;">
            <label class="custom-file-upload">
              <input type="file" id="share-photo-input" accept="image/*" onchange="handleSharePhotoUpload(event)" />
              <span>📸 เลือกรูปภาพประกอบ</span>
            </label>
            <label class="transparent-bg-toggle" style="display: inline-flex; align-items: center; gap: 8px; font-size: 0.82rem; font-weight: 600; color: #fff; cursor: pointer; background: rgba(255,255,255,0.08); padding: 8px 16px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.18);">
              <input type="checkbox" id="transparent-bg-checkbox" onchange="toggleTransparentBG(event)" style="accent-color: var(--color-orange); width: 16px; height: 16px; cursor: pointer;" />
              <span>🔲 พื้นหลังโปร่งใส (Transparent PNG)</span>
            </label>
          </div>
          
          <div class="share-slider-container hidden" id="photo-slider-wrapper" style="width: 100%; margin-top: 10px; text-align: center;">
            <label for="share-photo-slider" style="display: block; font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 6px; font-weight: 600;">
              ↔️ เลื่อนปรับตำแหน่งรูปภาพ (ซ้าย-ขวา / บน-ล่าง)
            </label>
            <input type="range" id="share-photo-slider" min="0" max="100" value="50" style="width: 100%; accent-color: var(--color-orange); cursor: pointer;" oninput="handleSharePhotoSliderInput(event)" />
          </div>
        </div>
      </div>
      <div class="share-modal-footer">
        <button id="download-graphic-btn" class="share-btn download-btn" onclick="downloadGeneratedGraphic('${athleteName}')">📥 ดาวน์โหลดรูปภาพ</button>
        <button id="share-graphic-btn" class="share-btn share-action-btn" onclick="shareGeneratedGraphic('${athleteName}')">📤 แชร์ไปยังแอปอื่น</button>
        <p class="share-modal-tip">💡 ทิป: บนมือถือสามารถกดค้างที่รูปภาพด้านบนเพื่อบันทึกหรือคัดลอกได้เช่นกัน</p>
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
  
  // Initial draw with default gradient
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
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#312e81');
    } else if (template === 'weekly') {
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.5, '#111827');
      grad.addColorStop(1, '#0284c7');
    } else if (template === 'stamp') {
      grad.addColorStop(0, '#181028');
      grad.addColorStop(0.5, '#231536');
      grad.addColorStop(1, '#fc4c02');
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

  if (template === 'minimal') {
    // ==========================================
    // TEMPLATE 2: ULTRA MINIMAL (NIKE / STRAVA STYLE)
    // ==========================================
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Pixme Run Club', 60, 60);

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
    ctx.fillText(`${emoji} ${activityName}  •  ${translateDateToEn(dateStr)}  •  ⏱️ ${timeStr}`, sizeW / 2, pillY + pillH / 2);

  } else if (template === 'stamp') {
    // ==========================================
    // TEMPLATE 3: SPORT STAMP / RACE BIB BADGE
    // ==========================================
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px ' + fontSans;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Pixme Run Club', 60, 60);

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
    ctx.fillText('OFFICIAL ATHLETE STAMP', stampX + 30, stampY + 28);

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
    ctx.fillText('Pixme Run Club', leftX, topY);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 20px ' + fontSans;
    ctx.fillText('Shut up !!! ,,, and Run …,,,', leftX, topY + 48);

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
    ctx.fillText('Pixme Run Club', leftX, topY);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 20px ' + fontSans;
    ctx.fillText('Shut up !!! ,,, and Run …,,,', leftX, topY + 48);

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
    ctx.fillText('Pixme Run Club', leftX, topY);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 20px ' + fontSans;
    ctx.fillText('Shut up !!! ,,, and Run …,,,', leftX, topY + 44);

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
      ctx.fillText('Pixme Run Club', statX, 70);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = 'bold 20px ' + fontSans;
      ctx.fillText('Shut up !!! ,,, and Run …,,,', statX, 115);

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
      ctx.fillText('Pixme Run Club', 50, 50);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = 'bold 20px ' + fontSans;
      ctx.fillText('Shut up !!! ,,, and Run …,,,', 50, 95);

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

    // 2-Line Activity Info under title
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

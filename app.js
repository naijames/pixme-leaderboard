/* ==========================================================================
   Pixme Active Club - Responsive Dashboard Application Core
   ========================================================================== */

const PROXY = 'https://script.google.com/macros/s/AKfycbzrJYV8Ab81xQsu9KQHC7ifGxjBExoHjDXDR3jRZOrzAhAEkiUVakYuWpIYyKEy63Ze/exec';
const MONTH_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

// State
let rawActivities = [];        // Athlete stats list (from res.data)
let rawWorkoutLogs = [];       // Real individual workout logs (from res.activities)
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
function getWorkoutsForAthlete(name, rawDistance, rawActivitiesCount, topSport, actualMovingTime) {
  const monthInfo = getSelectedMonthInfo();
  
  if (rawWorkoutLogs && rawWorkoutLogs.length > 0) {
    const cleanTarget = cleanAthleteName(name);
    
    const matched = rawWorkoutLogs.filter(w => {
      if (!w.athleteName) return false;
      const cleanName = cleanAthleteName(w.athleteName);
      return cleanName === cleanTarget || cleanName.includes(cleanTarget) || cleanTarget.includes(cleanName);
    });
    
    if (matched.length > 0) {
      return matched.map(w => {
        const originalIndex = rawWorkoutLogs.indexOf(w);
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
  
  // Reset selected details when month changes
  selectedAthleteId = null;
  resetDetailPanels();
  
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
    document.getElementById('board-title').textContent = 'บอร์ดเวลารวมขยับตัว (ชั่วโมง)';
    document.getElementById('active-sport-pill').textContent = 'ทุกประเภทกิจกรรม';
    
    // Set headers for duration board
    theadRow.innerHTML = `
      <th>สมาชิก</th>
      <th class="r">ชั่วโมงสะสม</th>
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
          value: Math.round((totalSec / 3600) * 10) / 10, // Hours
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
  
  // Auto-select the first athlete on desktop if none is selected
  if (window.innerWidth > 820 && !selectedAthleteId && computedLeaderboard.length > 0) {
    const firstAthlete = computedLeaderboard[0];
    const firstName = activeTab === 'recent' ? firstAthlete.athleteName : firstAthlete.name;
    selectAthlete(firstName);
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
      const metricStr = a.unit === 'km' ? `${a.value.toFixed(1)} km` : `${a.value.toFixed(1)} ชม.`;
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
  
  // Highlight active row in table
  renderLeaderboard();
  
  // Fetch workout log details
  const athleteRaw = rawActivities.find(a => a.name === name);
  if (!athleteRaw) return;
  
  const workouts = getWorkoutsForAthlete(name, athleteRaw.distance, athleteRaw.activities, athleteRaw.topType, athleteRaw.movingTime);
  workouts.sort((a, b) => {
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
    workouts.forEach(w => { totalSecs += w.moving_time; });
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
        <span style="color: var(--text-secondary);">MONTHLY TARGET (100K)</span>
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
  
  // Calculate which weekdays have workouts for the current week and their distances/durations
  const weekDateStrings = [];
  let baseDate = new Date();
  if (!isCurrentMonth) {
    const monthInfo = getSelectedMonthInfo();
    // Use the last day of the selected month as the base date
    baseDate = new Date(monthInfo.year, monthInfo.monthIndex + 1, 0);
  }
  const currentDay = baseDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + distanceToMonday + i);
    const day = d.getDate();
    const monthThai = MONTH_TH[d.getMonth()];
    weekDateStrings.push(`${day} ${monthThai}`);
  }

  const dailyValues = [0, 0, 0, 0, 0, 0, 0];
  const dailySports = ['', '', '', '', '', '', ''];
  workouts.forEach(w => {
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
      <p class="section-title">ปฏิทินสัปดาห์นี้</p>
      <div class="calendar-grid">
        ${calendarGridHtml}
      </div>
      <div class="calendar-labels-row">
        <span>จ</span><span>อ</span><span>พ</span><span>พฤ</span><span>ศ</span><span>ส</span><span>อา</span>
      </div>
    </div>
  `;

  // Render recent workouts list
  const workoutsHtml = workouts.map(w => {
    const icon = getSportIcon(w.sport_type);
    const timeStr = formatDuration(w.moving_time);
    const detailStr = w.sport_type === 'Run' || w.sport_type === 'Walk' || w.sport_type === 'Ride'
      ? `${w.dist_km.toFixed(1)} km` 
      : timeStr;
      
    return `
      <div class="workout-item">
        <div class="workout-info">
          <span class="workout-icon">${icon}</span>
          <div>
            <p class="workout-title" title="${w.name}">${w.name}</p>
            <p class="workout-date">${translateDateToEn(w.date)}</p>
          </div>
        </div>
        <div class="workout-meta">
          <p class="workout-val">${detailStr}</p>
          <p class="workout-sub">${timeStr}</p>
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
        <p class="lbl">วิ่งสะสม</p>
        <p class="val">${athleteRaw.distance.toFixed(1)} <span style="font-size:0.75rem">km</span></p>
      </div>
      <div class="detail-stat-box">
        <p class="lbl">เวลาซ้อมรวม</p>
        <p class="val">${totalHours} <span style="font-size:0.75rem">ชม.</span></p>
      </div>
    </div>
    
    ${calendarHtml}
    
    <div class="workout-section">
      <p class="section-title">บันทึกกิจกรรมล่าสุด (${workouts.length} ครั้ง)</p>
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
  if (h > 0) return `${h} ชม. ${m} นาที`;
  return `${m} นาที`;
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

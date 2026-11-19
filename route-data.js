const shapes = {
  route: '<circle cx="5" cy="17" r="2"/><circle cx="19" cy="7" r="2"/><path d="M7 17h8a3 3 0 0 0 0-6H9a2 2 0 0 1 0-4h8"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m1-15a3 3 0 0 1 0 6m2 3a4 4 0 0 1 3 4v2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  signal: '<path d="M4 20v-4m5 4v-7m5 7v-4m5 4v-1M3 3l18 18M14 5v4m5-7v12"/>',
  swap: '<path d="M8 20V4m-4 4 4-4 4 4m4-4v16m-4-4 4 4 4-4"/>',
  navigation: '<path d="m4 11 16-7-7 16-2-7-7-2Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
  coffee: '<path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm13 1h2a2 2 0 1 1 0 4h-2M3 21h17M8 5V3m5 2V3"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0v5l-2 3h16l-2-3V8Zm-8 11a2 2 0 0 0 4 0"/>',
  pause: '<path d="M9 5v14m6-14v14"/>',
  play: '<path d="m8 5 12 7-12 7Z"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  phone: '<path d="M6 3h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2Z"/>',
  brand: '<path d="M4 16c4-1 4-7 8-8 3-.7 4 3 8 1M4 20c4-1 4-7 8-8 3-.7 4 3 8 1M17 5h3v3"/>',
  arrow: '<path d="M3 12h17m-6-6 6 6-6 6"/>',
  edit: '<path d="m14 5 5 5M4 20l1-5 11-11a2 2 0 0 1 3 3L8 19l-4 1Z"/>',
  liner: '<path d="m8 4-4 2-2 7 4 1 1-4v10h10V10l1 4 4-1-2-7-4-2-4 3-4-3Zm4 3v13"/>',
  pin: '<path d="M19 10c0 5-7 10-7 10s-7-5-7-10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',
  cloud: '<path d="M6.5 18a4.5 4.5 0 0 1-.3-9 6 6 0 0 1 11.4 1.1A4 4 0 0 1 17.5 18Z"/>',
  rain: '<path d="M6.5 15a4.2 4.2 0 0 1-.3-8.4 5.9 5.9 0 0 1 11.2 1A3.7 3.7 0 0 1 17 15ZM9 18l-1 2m5-2-1 2m5-2-1 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20 14a8 8 0 0 1-10-10 8.2 8.2 0 1 0 10 10Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>'
};

function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]}</svg>`;
}

const towns = [
  { name: 'Udaipur', distance: 0, offset: 0, x: 172, y: 338, labelX: -15, labelY: 7, temp: 27 },
  { name: 'Bhilwara', distance: 165, offset: 155, x: 244, y: 246, labelX: -15, labelY: -9, temp: 28,
    road: 'M172 338 C178 329 180 317 190 310 S213 299 217 284 S226 272 228 261 Q233 252 244 246' },
  { name: 'Kishangarh', distance: 300, offset: 280, x: 335, y: 198, labelX: -14, labelY: -13, temp: 29,
    road: 'M244 246 C256 246 261 235 271 233 S291 231 297 218 Q308 204 335 198' },
  { name: 'Jaipur', distance: 405, offset: 375, x: 442, y: 153, labelX: 15, labelY: 20, temp: 30,
    road: 'M335 198 C346 194 349 183 363 182 S386 183 396 171 S423 167 442 153' },
  { name: 'Kotputli', distance: 510, offset: 475, x: 505, y: 99, labelX: 15, labelY: 8, temp: 29,
    road: 'M442 153 C454 143 449 133 466 129 S478 113 491 110 Q498 110 505 99' },
  { name: 'Gurgaon', distance: 665, offset: 600, x: 567, y: 45, labelX: -14, labelY: 4, temp: 28,
    road: 'M505 99 C511 92 522 94 524 83 S540 81 546 68 Q548 58 567 45' },
  { name: 'New Delhi', distance: 699, offset: 652, x: 597, y: 28, labelX: 10, labelY: -6, temp: 27,
    road: 'M567 45 C576 40 581 44 586 35 Q590 29 597 28' }
];

const terrain = `
  <path fill="#2b473a" d="M0 103 43 115 82 87 130 102 158 131 189 140 170 174 185 199 139 230 125 264 100 289 70 294 66 335 30 365 0 360ZM237 405l34-55 58-29 38-34 53-1 46-31 36 6 46-18 39 20 50-8 63 33v117Zm81-405 39 51 48-4 27 36 30-13 16-43 41-27Z"/>
  <path fill="#2d4c3d" d="M0 208c73-38 95 4 129-24-20 23-14 64-66 85-23 9-24 45-63 41ZM277 405c121-7 165-102 225-94 80 12 113-45 198-3v97Z"/>
  <path d="M693 120c-57 8-40 48-74 65s1 32-27 52-76 24-87 56-52 33-73 60-36 31-42 52" fill="none" stroke="#506d76" stroke-width="2.3"/>
  <g fill="none" stroke="#577169" stroke-width="2.4">
    <path d="M-8 315c115 6 139 35 219 4s84-81 144-86 105 29 176 4 100-21 184 1M-7 58c81 52 155 43 199 83s33 65 96 54 76-4 103-39 73-50 114-57c44-7 87 31 209-4M96-10c-21 80 40 107 34 163s22 74 13 127 45 65 43 130m246-428c-17 49-26 89-22 129s15 46 1 87-2 81-41 115-42 60-52 96m265-415c-22 54-35 83-22 125s-12 94 10 144 10 98 38 155"/>
    <path d="M-10 236c44 6 90-19 143-37s97-45 137-41 80 40 153 15 121-63 164-87 76-35 129-37M20 406c56-23 84-87 139-83s73 51 119 43 32-42 106-57 97 18 148-14 100-41 178-45M267-9c0 45-12 87 8 123s-2 48-4 91-41 58-27 95 16 67 2 108M690-3c-30 77-68 83-63 127s-39 72-38 109 52 59 40 100-16 60 11 77"/>
  </g>
  <g fill="none" stroke="#3e5a50" stroke-width="1">
    <path d="M31-5c17 58 80 50 93 106s-18 74 27 113 44 61 34 93 2 64 46 100M-10 170c63-18 86 12 136-8s68-51 116-31 107-16 154-31 40-46 93-46 84 10 128-19S680 22 710 19M-10 358c107-19 131 10 183-12s87-74 154-69 125 11 184-6 109-68 201-60M302-8c-32 61 21 74 28 126s-39 72-13 116 28 68 14 105-41 45-36 68M628-10c-40 31-26 88-42 124s-52 66-45 95 25 49 9 85-46 64-29 113"/>
  </g>
  <path d="M235-8c38 51 27 61 63 83s98-5 139 18 71 19 114-6 72-56 149-21" fill="none" stroke="#5d766b" stroke-width="1.2" stroke-dasharray="4 5"/>
  <g fill="#a4b9aa" font-size="12" font-weight="500" letter-spacing="3.5">
    <text x="112" y="116">RAJASTHAN</text>
    <text x="480" y="18">HARYANA</text>
  </g>
  <g transform="translate(690 46)" fill="#97b0a4" stroke="#97b0a4">
    <text x="0" y="-9" text-anchor="middle" stroke="none" font-size="12" font-weight="500">N</text>
    <path d="m0-2-5 15 5-3 5 3Z" stroke-linejoin="round"/>
  </g>`;


// Demo conditions on particular stretches, in the forward direction.
const rainWindows = { 3: [12 * 60, 15 * 60] };
const signalRanges = { 2: [.42, .64], 5: [.54, .69] };
const partnerProfiles = [
  { id: 'meera', name: 'Meera Sharma', initials: 'MS', base: 'Udaipur', gender: 'Woman', bike: 'Royal Enfield Himalayan 450', rides: 18, checked: true, since: 2023, pace: 'Steady touring', from: 0, to: 3, departure: 440 },
  { id: 'arjun', name: 'Arjun Rathore', initials: 'AR', base: 'Kishangarh', gender: 'Man', bike: 'KTM 390 Adventure', rides: 9, checked: true, since: 2024, pace: 'Relaxed touring', from: 2, to: 5, departure: 735 },
  { id: 'kabir', name: 'Kabir Mehta', initials: 'KM', base: 'Udaipur', gender: 'Man', bike: 'Honda CB350', rides: 27, checked: true, since: 2022, pace: 'Steady touring', from: 0, to: 6, departure: 390 },
  { id: 'neha', name: 'Neha Patel', initials: 'NP', base: 'New Delhi', gender: 'Woman', bike: 'Suzuki V-Strom SX', rides: 11, checked: true, since: 2024, pace: 'Steady touring', from: 6, to: 1, departure: 455 },
  { id: 'isha', name: 'Isha Khanna', initials: 'IK', base: 'Gurgaon', gender: 'Not shared', bike: 'Triumph Speed 400', rides: 4, checked: false, since: 2025, pace: 'Relaxed touring', from: 5, to: 2, departure: 410 }
];

const rainShelters = {
  3: [
    { name: 'Dudu roadside shelter', fraction: .37 },
    { name: 'Mokhampura rest stop', fraction: .57 },
    { name: 'Bagru covered stop', fraction: .79 }
  ]
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const state = {
  from: 0, to: 5, departure: 420, hold: null, reminder: false,
  layers: { rain: true, signal: true },
  zoom: 1, panX: 0, panY: 0, tab: 'ride', riding: null,
  forecastTown: 3, forecastOffset: 0
};
const buffer = 15;

function clock(minutes) {
  const value = Math.round(minutes);
  const day = Math.floor(value / 1440);
  const hour = Math.floor(value / 60) % 24;
  const minute = String(value % 60).padStart(2, '0');
  return `${hour % 12 || 12}:${minute} ${hour < 12 ? 'AM' : 'PM'}${day ? ` +${day}d` : ''}`;
}

function duration(minutes) {
  const rounded = Math.max(0, Math.ceil(minutes));
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return [hours ? `${hours}h` : '', remainder || !hours ? `${remainder}m` : ''].filter(Boolean).join(' ');
}

function makePlan(from, to, departure, hold = null, padding = 0) {
  const step = from < to ? 1 : -1;
  const stops = [{ index: from, eta: departure }];
  const legs = [];
  const rain = [];
  const signal = [];
  let eta = departure;

  for (let a = from; a !== to; a += step) {
    const b = a + step;
    const edge = Math.max(a, b);
    const travel = Math.abs(towns[a].offset - towns[b].offset);
    const start = eta + (hold?.index === a ? hold.wait : 0);
    eta = start + travel;
    const leg = { a, b, edge, start, end: eta, travel, km: Math.abs(towns[a].distance - towns[b].distance) };
    legs.push(leg);
    stops.push({ index: b, eta });

    const window = rainWindows[edge];
    if (window) {
      const begin = Math.max(start, window[0] - padding);
      const end = Math.min(eta, window[1] + padding);
      if (begin < end) rain.push({ kind: 'rain', leg, begin, end, window });
    }
    const range = signalRanges[edge];
    if (range) {
      const [low, high] = step > 0 ? range : [1 - range[1], 1 - range[0]];
      signal.push({ kind: 'signal', leg, begin: start + low * travel, end: start + high * travel });
    }
  }

  return { from, to, departure, step, stops, legs, rain, signal,
    finish: eta, total: eta - departure, km: Math.abs(towns[to].distance - towns[from].distance) };
}

function suggestedTime() {
  if (!plan.rain.length) return null;
  const slots = Array.from({ length: 96 }, (_, index) => index * 15)
    .sort((a, b) => Math.abs(a - state.departure) - Math.abs(b - state.departure) || a - b);
  return slots.find(time => makePlan(state.from, state.to, time, null, buffer).rain.length === 0) ?? null;
}

function chaiOption() {
  const event = plan.rain[0];
  if (!event || state.hold) return null;
  const wait = event.window[1] + buffer - event.leg.start;
  return { index: event.leg.a, wait, resume: event.leg.start + wait };
}

function stretch(event) {
  return `${towns[event.leg.a].name} → ${towns[event.leg.b].name}`;
}

function announce(message) {
  $('#announcement').textContent = message;
}

let plan = makePlan(state.from, state.to, state.departure);
let mapBounds;

const backgroundPlaces = [
  ['Ajmer', 298, 205], ['Beawar', 265, 229], ['Kishanpur', 264, 290],
  ['Pushkar', 283, 192], ['Nathdwara', 185, 310], ['Chittorgarh', 220, 298],
  ['Rajsamand', 186, 294], ['Tonk', 421, 214], ['Dausa', 500, 159],
  ['Alwar', 548, 106], ['Rewari', 550, 63], ['Neemrana', 530, 84],
  ['Sikar', 416, 110], ['Jhunjhunu', 443, 77], ['Bundi', 342, 260],
  ['Kota', 370, 280], ['Deoli', 388, 239], ['Ladnun', 350, 95], ['Didwana', 332, 123],
  ['Nagaur', 264, 137], ['Merta', 267, 174], ['Bilara', 225, 202],
  ['Jodhpur', 185, 190], ['Pali', 187, 229], ['Sojat', 216, 231],
  ['Sawai Madhopur', 475, 227], ['Bharatpur', 577, 153], ['Mathura', 620, 147],
  ['Agra', 651, 187], ['Fatehpur Sikri', 600, 196], ['Mahwa', 544, 174],
  ['Narnaul', 502, 64], ['Bhiwani', 494, 33], ['Palwal', 619, 73],
  ['Faridabad', 612, 48], ['Sohna', 579, 70], ['Bahadurgarh', 563, 23],
  ['Chaksu', 453, 183], ['Malpura', 381, 202], ['Nasirabad', 310, 218],
  ['Gangapur', 268, 269], ['Mandal', 240, 231], ['Kapurdi', 169, 264],
  ['Jaisamand', 177, 364], ['Salumber', 207, 364]
];

function backdrop() {
  const townsOutline = backgroundPlaces.map(([name, x, y]) => `
    <circle cx="${x}" cy="${y}" r="1.45" fill="#92a99c"/>
    <text class="map-label minor" x="${x + 4}" y="${y + 2.5}">${name}</text>`).join('');
  const countryRoads = [
    'M111 294 164 282 186 294 206 279 216 231 265 229 298 205 335 198 381 202 421 214 475 227 541 226 600 196 651 187',
    'M144 164 185 190 225 202 265 229 268 269 244 246 240 231 310 218 342 260 370 280 421 293 474 272 525 269 580 297',
    'M151 107 218 130 264 137 267 174 283 192 298 205 310 218 388 239 421 214 453 183 442 153 416 110 416 64 443 77 502 64',
    'M279 60 350 95 332 123 353 163 335 198 388 239 342 260 321 313 291 359',
    'M373 46 416 64 443 77 480 83 505 99 548 106 544 174 577 153 620 147 651 187 695 185',
    'M417 312 475 227 500 159 442 153 381 202 342 260 268 269 220 298 185 310 172 338 177 364 204 389',
    'M489 20 494 33 502 64 550 63 567 45 597 28 612 48 619 73 620 147 651 187 674 249',
    'M545 15 563 23 567 45 579 70 548 106 530 84 505 99 487 119 442 153 453 183 475 227',
    'M537 266 544 174 500 159 461 136 416 110 350 95 299 96 264 137 213 146 185 190 187 229 169 264 140 283',
    'M37 328 112 306 152 329 172 338 207 364 249 360 271 326 285 300 264 290 220 298',
    'M187 229 216 231 240 231 264 206 283 192 267 174 244 166 217 153',
    'M330 16 367 31 416 64 443 77 494 33 563 23 597 28 648 16 703 27'
  ];
  return `
  <defs><pattern id="land-grid" width="220" height="180" patternUnits="userSpaceOnUse">
    <path d="M0 65 32 49 68 57 105 42 140 60 171 55 220 65M38 0 47 31 36 67 47 120 38 180M0 144 49 132 75 141 119 127 162 139 220 144M164 0 150 33 160 70 133 98 164 180" stroke="#304a40" stroke-width="1.1" fill="none"/>
  </pattern></defs>
  <rect x="-5000" y="-5000" width="10000" height="10000" fill="#263d35"/>
  <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#land-grid)"/>
  ${terrain}
  <g fill="none" stroke-linejoin="round" stroke-linecap="round">
    ${countryRoads.map(road => `<path d="${road}" stroke="#344f43" stroke-width="2.2"/><path d="${road}" stroke="#4b665a" stroke-width="1.25"/>`).join('')}
  </g>
  ${townsOutline}`;
}

const landscape = backdrop();

function mapSegment(event, hue) {
  let start = (event.begin - event.leg.start) / event.leg.travel;
  let end = (event.end - event.leg.start) / event.leg.travel;
  if (plan.step < 0) [start, end] = [1 - end, 1 - start];
  const offset = (start * 1000).toFixed(2);
  const length = ((end - start) * 1000).toFixed(2);
  const road = towns[event.leg.edge].road;
  const base = `d="${road}" pathLength="1000" stroke-dasharray="${length} 1500" stroke-dashoffset="-${offset}"`;
  return event.kind === 'signal'
    ? `<path data-overlay="signal" ${base} stroke="#f8b46f" stroke-width="10"/><path ${base} stroke="#5d3b24" stroke-width="3"/>`
    : `<path data-overlay="rain" ${base} stroke="#6276cd" stroke-width="12"/><path ${base} stroke="${hue}" stroke-width="6"/>`;
}

function mapMarkup(layers = state.layers) {
  const destination = towns[plan.to];
  const journeyPaths = plan.legs.map(leg => {
    const road = towns[leg.edge].road;
    return `<path d="${road}" stroke="#192e26" stroke-width="10"/><path data-edge="${leg.edge}" d="${road}" stroke="#c3df9c" stroke-width="6"/>`;
  }).join('');
  const overlays = ['rain', 'signal'].map(layer =>
    layers[layer] ? plan[layer].map(event => mapSegment(event, '#b5c4ff')).join('') : '').join('');
  const planned = new Set(plan.stops.map(stop => stop.index));
  const markers = towns.map((town, index) => {
    const endpoint = index === plan.from || index === plan.to;
    const onRoute = planned.has(index);
    const toLeft = index <= 2 || index === 5;
    const textX = town.x + (toLeft ? -10 : 10);
    const textY = town.y + (index === 6 ? -4 : 4);
    const fill = index === plan.to ? '#e4f5c7' : endpoint ? '#e0ed9c' : onRoute ? '#a7c6a2' : '#7f9d8a';
    return `<g><title>${town.name}</title>
      <circle cx="${town.x}" cy="${town.y}" r="${endpoint ? 6.2 : onRoute ? 3.6 : 2.5}" fill="${fill}" stroke="#22352e" stroke-width="${endpoint ? 2.1 : 1.25}"/>
      <text class="map-label ${endpoint ? 'endpoint' : onRoute ? '' : 'minor'}" x="${textX}" y="${textY}" text-anchor="${toLeft ? 'end' : 'start'}">${town.name}</text></g>`;
  }).join('');
  const rainCount = plan.rain.length;
  return `<svg role="img" aria-label="Schematic route to ${destination.name}. ${rainCount} rain ${rainCount === 1 ? 'stretch' : 'stretches'} and ${plan.signal.length} no-signal zones.">
    ${landscape}<g fill="none" stroke-linejoin="round" stroke-linecap="round">${journeyPaths}${overlays}</g>${markers}
    <g id="shelter-dot" visibility="hidden"><circle r="7" fill="#f5c56d" stroke="#162b28" stroke-width="2"/><path d="m-3 0 3-3 3 3m-5-1v4h4v-4" fill="none" stroke="#18332d" stroke-width="1.2"/></g>
    <g id="rider-dot" visibility="hidden"><circle r="10" fill="#dbef83" opacity=".6"/><circle r="6" fill="#173e32" stroke="#fff" stroke-width="2"/></g>
    </svg>`;
}

function drawMap() {
  $('#map').innerHTML = mapMarkup();
  fitView();
  updateRiderDot();
}

function fitView() {
  const map = $('#map');
  const svg = map.querySelector('svg');
  if (!svg || !map.clientWidth || !map.clientHeight) return;
  const { clientWidth: w, clientHeight: h } = map;
  const editor = state.riding ? $('#active-instruction') : $('#route-editor');
  const wide = w >= 650;
  const left = wide ? Math.min(350, w * .47) : 24;
  const right = wide ? 90 : 35;
  const top = wide ? 24 : Math.min(editor.offsetHeight + 12, h * .55);
  const bottom = 43;
  const xs = plan.stops.map(({ index }) => towns[index].x);
  const ys = plan.stops.map(({ index }) => towns[index].y);
  const minX = Math.min(...xs) - 42;
  const maxX = Math.max(...xs) + 52;
  const minY = Math.min(...ys) - 18;
  const maxY = Math.max(...ys) + 20;
  const scale = Math.min(2.4, Math.max(70, w - left - right) / (maxX - minX),
    Math.max(65, h - top - bottom) / (maxY - minY)) * state.zoom;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const x = centerX - (left + (w - left - right) / 2) / scale + state.panX;
  const y = centerY - (top + (h - top - bottom) / 2) / scale + state.panY;
  mapBounds = { scale };
  svg.setAttribute('viewBox', `${x} ${y} ${w / scale} ${h / scale}`);
}

function updateRiderDot() {
  const dot = $('#rider-dot');
  if (!dot || !state.riding) return;
  const clockNow = plan.departure + state.riding.elapsed;
  const leg = plan.legs.find(item => clockNow <= item.end) ?? plan.legs.at(-1);
  const fraction = Math.max(0, Math.min(1, (clockNow - leg.start) / leg.travel));
  const path = $("[data-edge='" + leg.edge + "']");
  const position = path.getPointAtLength(path.getTotalLength() * (plan.step > 0 ? fraction : 1 - fraction));
  dot.setAttribute('transform', `translate(${position.x} ${position.y})`);
  dot.setAttribute('visibility', 'visible');
  const shelterDot = $('#shelter-dot');
  const target = state.riding.target;
  if (target) {
    const targetPath = $("[data-edge='" + target.edge + "']");
    const point = targetPath.getPointAtLength(targetPath.getTotalLength() * target.fraction);
    shelterDot.setAttribute('transform', `translate(${point.x} ${point.y})`);
  }
  shelterDot.setAttribute('visibility', target ? 'visible' : 'hidden');
}

function detail(symbol, title, description, trailing = '', tone = '') {
  return `<div class="detail-row">
    <span class="detail-icon ${tone}">${icon(symbol)}</span>
    <div class="detail-copy"><strong>${title}</strong>${description ? `<small>${description}</small>` : ''}</div>
    ${trailing}
  </div>`;
}

function action(label, name, type = 'quiet') {
  return `<button type="button" class="button ${type}" data-action="${name}">${label}</button>`;
}

function value(text) {
  return `<span class="detail-value">${text}</span>`;
}

function ridePanel() {
  const suggestion = suggestedTime();
  const chai = chaiOption();
  const reminderStop = plan.rain[0]?.leg.a;
  const rows = [
    suggestion !== null && detail('clock', `Leave at ${clock(suggestion)}`, 'Avoids simulated rain', action('Use time', 'suggestion')),
    chai && detail('coffee', `Chai &amp; samosa · ${towns[chai.index].name}`, `Demo stop · Resume ${clock(chai.resume)}`, action('Add stop', 'chai')),
    state.hold && detail('coffee', `Chai stop · ${towns[state.hold.index].name}`, `${duration(state.hold.wait)} stop added to ETA`, action('Remove', 'remove-hold')),
    reminderStop !== undefined && detail('bell', 'Rain-liner reminder', towns[reminderStop].name,
      action(state.reminder ? 'On ✓' : 'Turn on', 'reminder'))
  ].filter(Boolean).join('');
  const checkpoints = plan.stops.map(({ index, eta }) => `
    <div class="checkpoint-row"><i></i><span>${towns[index].name}</span><strong>${clock(eta)}</strong></div>`).join('');
  return `${rows}<div class="panel-label">Checkpoints <span>IST</span></div>${checkpoints}`;
}

function forecast(index, minute) {
  const hour = Math.floor(minute / 60) % 24;
  const window = rainWindows[index] ?? rainWindows[index + 1];
  if (window && minute >= window[0] && minute < window[1]) return 'rain';
  if (hour < 6 || hour >= 19) return 'moon';
  return (hour + index) % 4 === 0 ? 'cloud' : 'sun';
}

function forecastHours() {
  const arrival = plan.stops.find(stop => stop.index === state.forecastTown)?.eta ?? plan.departure;
  const first = Math.max(0, Math.floor(arrival / 360) * 360 + state.forecastOffset);
  const limit = Math.max(2160, Math.ceil((plan.finish + 60) / 360) * 360);
  return `<div class="panel-label">
    <button type="button" class="button quiet" data-action="earlier" aria-label="Earlier forecast"${first === 0 ? ' disabled' : ''}>←</button>
    <span>${clock(first)}–${clock(first + 300)}</span>
    <button type="button" class="button quiet" data-action="later" aria-label="Later forecast"${first + 360 >= limit ? ' disabled' : ''}>→</button>
  </div><div class="timeline" aria-label="Hourly conditions">${Array.from({ length: 6 }, (_, index) => {
    const minute = first + index * 60;
    const type = forecast(state.forecastTown, minute);
    const labels = { rain: 'Rain', sun: 'Sunny', cloud: 'Cloudy', moon: 'Clear' };
    return `<div class="hour ${type}"><strong>${clock(minute)}</strong>${icon(type)}<span>${labels[type]}</span></div>`;
  }).join('')}</div>`;
}

function weatherPanel() {
  const rows = plan.rain.map(event => detail('rain', stretch(event),
    `${clock(event.begin)}–${clock(event.end)} IST`, value(duration(event.end - event.begin)), 'rain')).join('');
  const options = plan.stops.map(({ index }) =>
    `<option value="${index}"${index === state.forecastTown ? ' selected' : ''}>${towns[index].name}</option>`).join('');
  return `${rows || '<p class="empty">No rain overlaps this ride.</p>'}
    <div class="panel-label"><label for="forecast-town">Hourly forecast · IST</label><select class="town-select" id="forecast-town">${options}</select></div>
    <div id="forecast-hours">${forecastHours()}</div>`;
}

function signalPanel() {
  const rows = plan.signal.map(event => detail('signal', stretch(event),
    `${clock(event.begin)}–${clock(event.end)} IST`, value(duration(event.end - event.begin)), 'signal')).join('');
  return `${rows || '<p class="empty">No simulated dead zones on this route.</p>'}
    ${detail('download', 'Keep the route offline', 'Checkpoints, rain and no-signal times', action('Save route', 'download'))}`;
}

function matches() {
  return partnerProfiles.flatMap(profile => {
    const direction = Math.sign(profile.to - profile.from);
    if (direction !== plan.step) return [];
    const first = direction > 0 ? Math.max(plan.from, profile.from) : Math.min(plan.from, profile.from);
    const last = direction > 0 ? Math.min(plan.to, profile.to) : Math.max(plan.to, profile.to);
    if ((last - first) * direction <= 0) return [];
    const theirTime = profile.departure + Math.abs(towns[first].offset - towns[profile.from].offset);
    const ourTime = plan.stops.find(stop => stop.index === first).eta + (state.hold?.index === first ? state.hold.wait : 0);
    if (Math.abs(theirTime - ourTime) > 90) return [];
    return [{ ...profile, first, last, theirTime, gap: Math.abs(theirTime - ourTime) }];
  }).sort((a, b) => a.gap - b.gap);
}

function partnerPanel() {
  return rideGroup.panel(matches());
}

const panels = { ride: ridePanel, weather: weatherPanel, signal: signalPanel, partners: partnerPanel };

function renderPanel() {
  const panel = $('#sheet-panel');
  panel.setAttribute('aria-labelledby', 'tab-' + state.tab);
  panel.innerHTML = panels[state.tab]();
}

function setEditor(open) {
  $('#route-form').hidden = !open;
  $('#route-summary').hidden = open;
  $('#editor-toggle').setAttribute('aria-expanded', open);
  $('#editor-toggle').setAttribute('aria-label', open ? 'Collapse route inputs' : 'Edit route');
  fitView();
}

function setSheet(size) {
  const expanded = size === 'full';
  $('#sheet').dataset.size = size;
  $('#app').dataset.expanded = expanded;
  const handle = $('#sheet-handle');
  handle.setAttribute('aria-expanded', expanded);
  handle.setAttribute('aria-label', expanded ? 'Collapse ride details' : 'Expand ride details');
  if (expanded) setEditor(false);
}

function selectTab(tab, expand = true) {
  state.tab = tab;
  $('#sheet').dataset.tab = tab;
  for (const button of $$('[data-tab]')) {
    const selected = button.dataset.tab === tab;
    button.setAttribute('aria-selected', selected);
    button.tabIndex = selected ? 0 : -1;
  }
  renderPanel();
  $('#sheet-panel').scrollTop = 0;
  if (expand) setSheet('full');
}

function renderPlan() {
  plan = makePlan(state.from, state.to, state.departure, state.hold);
  if (!plan.stops.some(({ index }) => index === state.forecastTown)) {
    state.forecastTown = plan.rain[0]?.leg.b ?? plan.to;
    state.forecastOffset = 0;
  }
  $('#time-label').textContent = clock(state.departure);
  $('#places-label').textContent = `${towns[plan.from].name} → ${towns[plan.to].name}`;
  $('#summary-time').textContent = clock(state.departure);
  $('#edit-time').setAttribute('aria-label', `Edit departure, ${clock(state.departure)} IST`);
  $('#route-kicker').textContent = `ETA ${clock(plan.finish)} IST`;
  $('#route-metrics').innerHTML = `${duration(plan.total)} <span>${plan.km} km</span>`;
  const suggestion = suggestedTime();
  $('#glance').innerHTML = `
    <button type="button" class="status-chip ${plan.rain.length ? 'rain' : ''}" data-glance="weather">${icon(plan.rain.length ? 'rain' : 'check')} ${plan.rain.length ? 'Rain ' + duration(plan.rain.reduce((total, event) => total + event.end - event.begin, 0)) : 'No rain overlap'}</button>
    <button type="button" class="status-chip ${plan.signal.length ? 'signal' : ''}" data-glance="signal">${icon('signal')} ${plan.signal.length} dead ${plan.signal.length === 1 ? 'zone' : 'zones'}</button>
    ${suggestion === null ? '' : `<button type="button" class="status-chip suggestion" data-glance="ride">${icon('clock')} Dry ${clock(suggestion)}</button>`}`;
  renderPanel();
  drawMap();
}

function changeDeparture(departure) {
  if (departure === state.departure) return;
  state.departure = departure;
  state.hold = null;
  state.reminder = false;
  state.forecastOffset = 0;
  renderPlan();
  announce(`Departure updated to ${clock(departure)} IST.`);
}

function downloadPlan() {
  const route = `${towns[plan.from].name} → ${towns[plan.to].name}`;
  const template = document.createElement('template');
  template.innerHTML = mapMarkup({ rain: true, signal: true });
  const mapCopy = template.content.firstElementChild;
  const routeTowns = plan.stops.map(stop => towns[stop.index]);
  const xs = routeTowns.map(town => town.x);
  const ys = routeTowns.map(town => town.y);
  const left = Math.min(...xs) - 86;
  const top = Math.min(...ys) - 35;
  mapCopy.setAttribute('viewBox', `${left} ${top} ${Math.max(...xs) - left + 92} ${Math.max(...ys) - top + 35}`);
  const zones = [...plan.rain, ...plan.signal].sort((a,b) => a.begin - b.begin).map(event =>
    `<li><strong>${event.kind === 'rain' ? 'Rain' : 'No signal'} · ${stretch(event)}</strong><span>${clock(event.begin)}–${clock(event.end)}</span></li>`).join('');
  const stops = plan.stops.map(stop => `<li>${towns[stop.index].name}<span>${clock(stop.eta)}</span></li>`).join('');
  const hold = state.hold ? `<p>Chai stop in ${towns[state.hold.index].name} · ${duration(state.hold.wait)} · Leave ${clock(state.hold.resume)}</p>` : '';
  const saved = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${route} · Offline itinerary</title><style>
  :root{color-scheme:dark}body{margin:16px auto;max-width:700px;padding:0 16px;background:#142421;color:#f5f7ed;font:16px/1.5 system-ui,sans-serif}
  h1{font-size:26px;font-weight:600}h2{font-size:17px}p{color:#b5c8be}svg{display:block;width:100%;border-radius:12px}
  .map-label{font-size:12px;fill:#f1f7e9;stroke:#253b34;stroke-width:3px;paint-order:stroke}.map-label.minor{font-size:8px;fill:#a8bab0}
  ul{padding:0;list-style:none}li{display:flex;gap:8px;justify-content:space-between;padding:8px 0;border-bottom:1px solid #3a554b}
  span{flex:none;color:#b5c8be}small{color:#b5c8be} @media(max-width:425px){li{flex-wrap:wrap}}
  </style><main><small>Offline snapshot · Simulated data · IST</small><h1>${route}</h1>
  <p>${plan.km} km · ${duration(plan.total)} · ETA ${clock(plan.finish)}</p>${mapCopy.outerHTML}
  <p>Lavender: rain · Amber: no signal</p>${hold}<h2>Checkpoints</h2><ul>${stops}</ul>
  <h2>Rain and no-signal zones</h2>${zones ? `<ul>${zones}</ul>` : '<p>None in this scenario.</p>'}</main></html>`;
  const url = URL.createObjectURL(new Blob([saved], { type: 'text/html' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ridewindow-offline-route.html';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  announce('Offline itinerary prepared.');
}

function rideEvents() {
  const events = [...plan.rain, ...plan.signal];
  if (state.reminder && plan.rain.length) {
    const leg = plan.rain[0].leg;
    events.push({ kind: 'liner', leg, begin: leg.start, end: leg.start + 8 });
  }
  if (state.hold) {
    const leg = plan.legs.find(item => item.a === state.hold.index);
    events.push({ kind: 'chai', leg, begin: leg.start - state.hold.wait, end: leg.start });
  }
  const priority = { liner: 0, chai: 1, rain: 2, signal: 3 };
  return events.sort((a, b) => a.begin - b.begin || priority[a.kind] - priority[b.kind]);
}

const eventsUI = {
  liner: { symbol: 'liner', tone: 'rain', label: 'Rain-liner stop' },
  rain: { symbol: 'rain', tone: 'rain', label: 'Rain stretch' },
  signal: { symbol: 'signal', tone: 'signal', label: 'No signal' },
  chai: { symbol: 'coffee', tone: '', label: 'Chai stop' }
};

function remainingDistance(time) {
  return Math.ceil(plan.legs.reduce((total, leg) =>
    total + leg.km * Math.min(1, Math.max(0, (leg.end - time) / leg.travel)), 0));
}

function nextShelter(event, now) {
  const { leg } = event;
  const stops = rainShelters[leg.edge] ?? [];
  const timed = [...stops, { name: `${towns[leg.b].name} covered stop`, fraction: plan.step > 0 ? 1 : 0 }]
    .map(stop => {
      const position = plan.step > 0 ? stop.fraction : 1 - stop.fraction;
      return { ...stop, time: leg.start + position * leg.travel, edge: leg.edge, leg };
    })
    .sort((a, b) => a.time - b.time);
  return timed.find(stop => stop.time > now + .001);
}

function renderShelter(active, now) {
  const area = $('#ride-shelter');
  const ride = state.riding;
  const stop = ride.target ?? (active?.kind === 'rain' ? nextShelter(active, now) : null);
  area.hidden = !stop;
  if (!stop) return;
  const distance = Math.max(1, Math.ceil((stop.time - now) / stop.leg.travel * stop.leg.km));
  $('#shelter-label').textContent = ride.atShelter ? 'At demo shelter' : ride.target ? 'Selected shelter' : 'Next demo shelter';
  $('#shelter-name').textContent = ride.atShelter ? stop.name : `${stop.name} · ${distance} km`;
  const button = $('#shelter-action');
  button.hidden = ride.atShelter;
  button.textContent = ride.target ? 'Cancel' : 'Go to stop';
}

function renderActive() {
  if (!state.riding) return;
  const now = plan.departure + state.riding.elapsed;
  const arrived = now >= plan.finish;
  const active = state.riding.events.find(event => now >= event.begin && now < event.end);
  const next = state.riding.events.find(event => event.begin > now);
  const event = active ?? next;
  const selected = event && eventsUI[event.kind];
  const place = event && (['chai', 'liner'].includes(event.kind) ? towns[event.leg.a].name : stretch(event));
  const destination = towns[plan.to].name;
  const title = arrived ? `Arrived in ${destination}` : selected ? selected.label + (active ? ' now' : ' ahead') : `Continue to ${destination}`;
  const line = selected && !arrived ? `${place}${active ? '' : ' · in ' + duration(event.begin - now)}` : `Simulated ride · ${clock(now)} IST`;
  const instruction = $('#active-instruction');
  instruction.innerHTML = `<div class="instruction-main">${icon(arrived ? 'check' : selected?.symbol ?? 'navigation')}
    <div><strong>${title}</strong><small>${line}</small></div></div>`;
  const dash = $('#ride-metrics');
  dash.innerHTML = `<strong>${arrived ? 'Ride complete' : duration(plan.finish - now)}</strong><small>${remainingDistance(now)} km left · ETA ${clock(plan.finish)} IST</small>`;
  const alert = $('#ride-alert');
  const caption = !active ? `Simulated ride · ${clock(now)} IST` : {
    liner: `Stop safely in ${place} and put on your rain liner.`,
    signal: `No signal for ${duration(active.end - now)} · keep your offline route handy`,
    rain: `Rain for ${duration(active.end - now)}`,
    chai: `Resume at ${clock(active.end)} IST`
  }[active.kind];
  alert.className = `ride-alert ${active ? selected.tone : ''}`;
  alert.innerHTML = `${icon(active ? selected.symbol : 'clock')}<span>${caption}</span>`;
  $('#ride-pause').hidden = arrived;
  $('#ride-next').hidden = arrived || state.riding.atShelter;
  $('#ride-pause').setAttribute('aria-label', state.riding.paused ? 'Resume simulated ride' : 'Pause simulated ride');
  $('#ride-pause').title = state.riding.paused ? 'Resume ride' : 'Pause ride';
  $('#ride-pause').innerHTML = icon(state.riding.paused ? 'play' : 'pause');
  const activeId = active && `${active.kind}-${active.begin}`;
  if (activeId && activeId !== state.riding.lastAlert) announce(caption);
  state.riding.lastAlert = activeId;
  const rain = state.riding.events.find(item => item.kind === 'rain' && now >= item.begin && now < item.end);
  renderShelter(rain, now);
  updateRiderDot();
}

function startRide() {
  state.riding = { elapsed: 0, paused: false, events: rideEvents(), lastAlert: null, target: null, atShelter: false };
  $('#sheet-active').innerHTML = `<div class="ride-dash">
    <div id="ride-metrics"></div><div class="ride-dash-actions">
      <button type="button" class="icon-button" id="ride-pause" data-ride="pause"></button>
      <button type="button" class="icon-button" id="ride-next" data-ride="next" title="Next event" aria-label="Jump to next event">${icon('arrow')}</button>
      <button type="button" class="icon-button" data-ride="end" title="End ride" aria-label="End ride">${icon('close')}</button>
    </div></div><p class="ride-alert" id="ride-alert"></p>
    <div class="ride-shelter" id="ride-shelter" hidden><span class="detail-icon">${icon('pin')}</span><div><small id="shelter-label"></small><strong id="shelter-name"></strong></div><button type="button" class="button quiet" id="shelter-action" data-ride="shelter"></button></div>`;
  $('#active-instruction').hidden = false;
  $('#route-editor').hidden = true;
  $('#sheet-plan').hidden = true;
  $('#sheet-active').hidden = false;
  $('#app').dataset.riding = 'true';
  setSheet('ride');
  resetMap();
  renderActive();
  $('#ride-pause').focus();
  announce('Simulated ride started.');
}

function endRide() {
  state.riding = null;
  $('#active-instruction').hidden = true;
  $('#route-editor').hidden = false;
  $('#sheet-plan').hidden = false;
  $('#sheet-active').hidden = true;
  $('#app').dataset.riding = 'false';
  setSheet('peek');
  setEditor(!compactEditor.matches);
  resetMap();
  renderPlan();
  $('#start-ride').focus();
  announce('Returned to ride planning.');
}

function advance(delta) {
  if (!state.riding) return;
  const ride = state.riding;
  const limit = ride.target && !ride.atShelter ? ride.target.time - plan.departure : plan.total;
  ride.elapsed = Math.min(limit, ride.elapsed + delta);
  if (ride.elapsed === limit) {
    ride.paused = true;
    if (ride.target && !ride.atShelter) {
      ride.atShelter = true;
      announce(`Reached ${ride.target.name}. Ride paused.`);
    }
  }
  renderActive();
}

setInterval(() => {
  if (state.riding && !state.riding.paused) advance(3);
}, 1000);

function resetMap() {
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  fitView();
}

function zoomBy(factor) {
  state.zoom = Math.min(8, Math.max(.8, state.zoom * factor));
  fitView();
}

function placeIndex(value) {
  const normalized = value.trim().toLowerCase();
  const aliases = { gurugram: 'gurgaon', delhi: 'new delhi' };
  return towns.findIndex(town => town.name.toLowerCase() === (aliases[normalized] ?? normalized));
}

function routeFromInputs() {
  const from = placeIndex($('#origin').value);
  const to = placeIndex($('#destination').value);
  const error = $('#route-error');
  error.hidden = true;
  if (from < 0 || to < 0 || from === to) {
    error.textContent = from === to && from >= 0 ? 'Choose two different towns.' : 'Choose towns from the demo route list.';
    error.hidden = false;
    (from < 0 ? $('#origin') : $('#destination')).focus();
    fitView();
    return;
  }
  if (from !== state.from || to !== state.to) {
    state.from = from;
    state.to = to;
    state.hold = null;
    state.reminder = false;
    state.forecastOffset = 0;
  }
  $('#origin').value = towns[from].name;
  $('#destination').value = towns[to].name;
  resetMap();
  selectTab('ride', false);
  setSheet('peek');
  renderPlan();
  announce(`Route updated. ${towns[from].name} to ${towns[to].name}, ${plan.km} kilometres.`);
}

$('#places').innerHTML = towns.map(town => `<option value="${town.name}"></option>`).join('');
for (const field of [$('#origin'), $('#destination')]) {
  field.addEventListener('focus', () => field.select());
}
for (const node of $$('[data-icon]')) node.innerHTML = icon(node.dataset.icon);
$('#route-form').addEventListener('submit', event => {
  event.preventDefault();
  routeFromInputs();
});
$('#swap').addEventListener('click', () => {
  const origin = $('#origin');
  const destination = $('#destination');
  [origin.value, destination.value] = [destination.value, origin.value];
  routeFromInputs();
});
$('#editor-toggle').addEventListener('click', () => {
  const open = $('#route-form').hidden;
  if (open) setSheet('peek');
  setEditor(open);
});
$('#route-summary').addEventListener('click', () => {
  setSheet('peek');
  setEditor(true);
  $('#origin').focus();
});

const handle = $('#sheet-handle');
const sheet = $('#sheet');
let sheetStart;
let sheetMoved = false;
handle.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  sheetStart = { y: event.clientY, height: sheet.offsetHeight };
  sheetMoved = false;
  handle.setPointerCapture(event.pointerId);
});
handle.addEventListener('pointermove', event => {
  if (!sheetStart) return;
  const delta = sheetStart.y - event.clientY;
  if (!sheetMoved && Math.abs(delta) <= 8) return;
  sheetMoved = true;
  sheet.dataset.dragging = 'true';
  sheet.style.setProperty('--drag-height', `${sheetStart.height + delta}px`);
});
handle.addEventListener('pointerup', event => {
  if (!sheetStart) return;
  const delta = event.clientY - sheetStart.y;
  if (Math.abs(delta) > 20) setSheet(delta < 0 ? 'full' : 'peek');
  delete sheet.dataset.dragging;
  sheetStart = undefined;
});
handle.addEventListener('pointercancel', () => {
  delete sheet.dataset.dragging;
  sheetStart = undefined;
  sheetMoved = false;
});
handle.addEventListener('click', () => {
  if (!sheetMoved) setSheet($('#sheet').dataset.size === 'full' ? 'peek' : 'full');
  sheetMoved = false;
});
handle.addEventListener('keydown', event => {
  if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  setSheet(event.key === 'ArrowUp' ? 'full' : 'peek');
});

const tabs = $$('[data-tab]');
tabs.forEach((button, index) => {
  button.addEventListener('click', () => selectTab(button.dataset.tab));
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : (index + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
    selectTab(tabs[next].dataset.tab);
    tabs[next].focus();
  });
});
$('#glance').addEventListener('click', event => {
  const button = event.target.closest('[data-glance]');
  if (!button) return;
  selectTab(button.dataset.glance);
  $('#tab-' + button.dataset.glance).focus();
});

$('#sheet-panel').addEventListener('change', event => {
  if (event.target.id !== 'forecast-town') return;
  state.forecastTown = Number(event.target.value);
  state.forecastOffset = 0;
  $('#forecast-hours').innerHTML = forecastHours();
});
$('#sheet-panel').addEventListener('click', event => {
  const element = event.target.closest('[data-action]');
  if (!element) return;
  const name = element.dataset.action;
  if (name === 'suggestion') {
    changeDeparture(suggestedTime());
    $('#tab-ride').focus();
  } else if (name === 'chai') {
    state.hold = chaiOption();
    state.reminder = false;
    renderPlan();
    $('[data-action="remove-hold"]').focus();
    announce(`Chai stop added in ${towns[state.hold.index].name}. Resume at ${clock(state.hold.resume)}.`);
  } else if (name === 'remove-hold') {
    state.hold = null;
    renderPlan();
    $('[data-action="chai"]').focus();
    announce('Chai stop removed.');
  } else if (name === 'reminder') {
    state.reminder = !state.reminder;
    renderPanel();
    $('[data-action="reminder"]').focus();
    announce(state.reminder ? 'Rain-liner reminder on for the simulated ride.' : 'Rain-liner reminder off.');
  } else if (name === 'download') {
    downloadPlan();
  } else if (name === 'earlier' || name === 'later') {
    state.forecastOffset += name === 'earlier' ? -360 : 360;
    $('#forecast-hours').innerHTML = forecastHours();
    ($(`[data-action="${name}"]:not(:disabled)`) ?? $('#forecast-hours button:not(:disabled)')).focus();
  }
});

$('#download-ride').addEventListener('click', downloadPlan);
$('#start-ride').addEventListener('click', startRide);
$('#sheet-active').addEventListener('click', event => {
  const trigger = event.target.closest('[data-ride]');
  if (!trigger || !state.riding) return;
  const name = trigger.dataset.ride;
  if (name === 'end') endRide();
  else if (name === 'pause') {
    if (state.riding.atShelter) {
      state.riding.target = null;
      state.riding.atShelter = false;
    }
    state.riding.paused = !state.riding.paused;
    renderActive();
  } else if (name === 'shelter') {
    const ride = state.riding;
    const now = plan.departure + ride.elapsed;
    if (ride.target) ride.target = null;
    else {
      const rain = ride.events.find(item => item.kind === 'rain' && now >= item.begin && now < item.end);
      ride.target = rain ? nextShelter(rain, now) : null;
    }
    announce(ride.target ? `Shelter selected: ${ride.target.name}.` : 'Shelter selection cleared.');
    renderActive();
  } else {
    const now = plan.departure + state.riding.elapsed;
    const next = state.riding.events.find(item => item.begin > now);
    advance((next?.begin ?? plan.finish) - now + .0001);
  }
});

const map = $('#map');
let drag;
map.addEventListener('pointerdown', event => {
  if (!mapBounds || event.button !== 0) return;
  drag = { x: event.clientX, y: event.clientY, panX: state.panX, panY: state.panY };
  map.setPointerCapture(event.pointerId);
});
map.addEventListener('pointermove', event => {
  if (!drag) return;
  state.panX = drag.panX - (event.clientX - drag.x) / mapBounds.scale;
  state.panY = drag.panY - (event.clientY - drag.y) / mapBounds.scale;
  fitView();
});
map.addEventListener('lostpointercapture', () => { drag = null; });
map.addEventListener('wheel', event => {
  event.preventDefault();
  zoomBy(event.deltaY < 0 ? 1.12 : 1 / 1.12);
}, { passive: false });
$('#zoom-in').addEventListener('click', () => zoomBy(1.3));
$('#zoom-out').addEventListener('click', () => zoomBy(1 / 1.3));
$('#fit-map').addEventListener('click', resetMap);
for (const layer of $$('[data-layer]')) {
  layer.addEventListener('click', () => {
    const kind = layer.dataset.layer;
    state.layers[kind] = !state.layers[kind];
    layer.setAttribute('aria-pressed', state.layers[kind]);
    drawMap();
  });
}
new ResizeObserver(fitView).observe(map);

const timeDialog = $('#time-dialog');
const hourInput = $('#time-hour');
const minuteInput = $('#time-minute');
const periodInput = $('#time-period');
for (let hour = 1; hour <= 12; hour++) hourInput.add(new Option(hour, hour));
for (let minute = 0; minute < 60; minute++) minuteInput.add(new Option(String(minute).padStart(2, '0'), minute));
$('#edit-time').addEventListener('click', () => {
  const hour = Math.floor(state.departure / 60);
  hourInput.value = String(hour % 12 || 12);
  minuteInput.value = String(state.departure % 60);
  periodInput.value = hour >= 12 ? 'PM' : 'AM';
  timeDialog.showModal();
});
$('#time-form').addEventListener('submit', event => {
  event.preventDefault();
  const hours = Number(hourInput.value) % 12 + (periodInput.value === 'PM' ? 12 : 0);
  changeDeparture(hours * 60 + Number(minuteInput.value));
  timeDialog.close();
});
$('#cancel-time').addEventListener('click', () => timeDialog.close());

const compactEditor = matchMedia('(max-height: 720px) and (max-width: 649px)');
setEditor(!compactEditor.matches);
renderPlan();

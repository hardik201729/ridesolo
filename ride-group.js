const rideGroup = (() => {
  const profileDialog = $('#profile-dialog');
  const roomDialog = $('#room-dialog');
  const storageKey = 'ridewindow-demo-groups-v1';
  let groups = {};
  try {
    groups = JSON.parse(localStorage.getItem(storageKey) || '{}') || {};
  } catch {
    // The shareable HTML also works when the browser blocks local storage.
  }

  let currentProfile;
  let roomKey;
  let roomView = 'chat';
  let roomRider;
  let invitee;
  let calling = false;
  let muted = false;
  const firstName = rider => rider.name.split(' ')[0];
  const key = () => `${plan.from}-${plan.to}`;
  const groupFor = (id = key()) => groups[id] ??= { invitations: {}, messages: [] };
  const accepted = group => partnerProfiles.filter(rider => group.invitations[rider.id] === 'accepted');
  const roster = group => [{
    id: 'host', name: 'Ride organizer', initials: 'RO', base: towns[plan.from].name,
    bike: 'Royal Enfield Himalayan', rides: 12, gender: 'Not shared',
    pace: 'Steady touring', since: 2024, checked: true, from: plan.from, to: plan.to
  }, ...accepted(group)];
  const chevron = () => '<span class="row-arrow">' + icon('chevron') + '</span>';

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(groups)); } catch {}
  }

  function refreshPartners() {
    if (state.tab === 'partners') renderPanel();
  }

  function panel(nearby) {
    const group = groupFor();
    const members = accepted(group);
    const pending = Object.values(group.invitations).filter(status => status === 'pending').length;
    const candidates = [
      ...nearby,
      ...partnerProfiles.filter(rider => group.invitations[rider.id] && !nearby.some(match => match.id === rider.id))
    ];
    const rows = candidates.map(rider => {
      const status = group.invitations[rider.id];
      const route = rider.first !== undefined
        ? `${towns[rider.first].name} → ${towns[rider.last].name} · ${clock(rider.theirTime)}`
        : `${towns[rider.from].name} → ${towns[rider.to].name}`;
      const statusLabel = { accepted: 'Joined', pending: 'Pending', declined: 'Declined' }[status];
      return `<button type="button" class="partner-row profile-row" data-profile="${rider.id}" aria-label="View profile for ${rider.name}">
        <span class="partner-avatar" aria-hidden="true">${rider.initials}</span>
        <div class="partner-copy"><strong class="partner-name">${rider.name}</strong><small>${route}</small>
        ${statusLabel ? `<span class="invite-status ${status}">${statusLabel}</span>` : ''}</div>
        ${chevron()}
      </button>`;
    }).join('');
    return `
      <div class="group-summary">
        <div><h3>Your ride group</h3><p>${members.length + 1} ${members.length ? 'riders' : 'rider'}${pending ? ` · ${pending} pending` : ''}</p></div>
        ${members.length ? '<button class="button primary" type="button" data-open-room>Open room</button>' : ''}
      </div>
      <div class="panel-label">Matching riders <span>Demo profiles</span></div>
      ${rows || '<p class="empty">No matches for this route and departure.</p>'}`;
  }

  function openProfile(id) {
    currentProfile = matches().find(rider => rider.id === id) ?? partnerProfiles.find(rider => rider.id === id);
    if (!currentProfile) return;
    drawProfile();
    profileDialog.showModal();
  }

  function profileDetails(rider, titleId = '') {
    const routeFrom = towns[rider.first ?? rider.from].name;
    const routeTo = towns[rider.last ?? rider.to].name;
    const info = [
      ['Based in', rider.base], ['Gender · self-described', rider.gender],
      ['Motorcycle', rider.bike], ['Completed rides', rider.rides],
      ['Riding pace', rider.pace], ['Member since', rider.since]
    ];
    return `
      <div class="profile-person"><span class="partner-avatar large" aria-hidden="true">${rider.initials}</span>
        <div><h2${titleId ? ` id="${titleId}"` : ''}>${rider.name}</h2><p>${routeFrom} → ${routeTo}</p></div>
      </div>
      <div class="profile-trust"><span class="detail-icon">${icon(rider.checked ? 'check' : 'people')}</span>
        <div><strong>${rider.checked ? 'Identity check complete' : 'Identity check unavailable'}</strong><small>Simulated profile and verification</small></div>
      </div>
      <dl class="profile-facts">${info.map(([label, item]) => `<div><dt>${label}</dt><dd>${item}</dd></div>`).join('')}</dl>`;
  }

  function drawProfile() {
    const rider = currentProfile;
    const status = groupFor().invitations[rider.id];
    const actions = status === 'accepted'
      ? '<button type="button" class="button primary" data-open-room>Open ride room</button>'
      : status === 'pending'
        ? '<button type="button" class="button text-button" data-invite="cancel">Cancel request</button><button type="button" class="button primary" data-invite="preview">Preview invitation</button>'
        : '<button type="button" class="button primary" data-invite="send">Send ride request</button>';
    $('#profile-content').innerHTML = `${profileDetails(rider, 'profile-title')}
      <div class="profile-actions">
        <p role="status">${status === 'accepted' ? 'Joined your ride group' : status === 'pending' ? 'Request pending · Demo' : ''}</p>
        <div>${actions}</div>
      </div>`;
  }

  function invite(operation) {
    const group = groupFor();
    const rider = currentProfile;
    const status = group.invitations[rider.id];
    if (operation === 'preview' && status === 'pending') {
      invitee = rider;
      openRoom('invite');
      return;
    }
    if (operation === 'send' && status !== 'accepted') group.invitations[rider.id] = 'pending';
    if (operation === 'cancel' && status === 'pending') delete group.invitations[rider.id];
    save();
    refreshPartners();
    drawProfile();
    const focus = $('#profile-content .primary');
    focus?.focus();
    announce('Ride request updated.');
  }

  function openRoom(initialView = 'chat') {
    if (initialView === 'chat' && !accepted(groupFor()).length) return;
    roomKey = key();
    roomView = initialView;
    calling = false;
    muted = false;
    const wasProfile = profileDialog.open;
    if (wasProfile) profileDialog.close();
    $('#room-route').textContent = `${towns[plan.from].name} → ${towns[plan.to].name} · Demo room`;
    drawRoom();
    roomDialog.showModal();
    $('#room-messages').scrollTop = $('#room-messages').scrollHeight;
  }

  function roomRow(rider, suffix, control) {
    return `<button type="button" class="partner-row profile-row" ${control}>
      <span class="partner-avatar" aria-hidden="true">${rider.initials}</span>
      <div class="partner-copy"><strong class="partner-name">${rider.name}</strong><small>${suffix}</small></div>
      ${chevron()}
    </button>`;
  }

  function memberRows(group, mode) {
    return roster(group).map(rider => roomRow(rider,
      rider.id === 'host' ? 'Host · ' + rider.base : rider.base + ' · ' + rider.rides + ' rides',
      `data-member="${rider.id}" data-member-view="${mode}" aria-label="View member profile for ${rider.name}"`)).join('');
  }

  function availableRows(group) {
    const invitations = group.invitations;
    const available = matches().filter(rider => invitations[rider.id] !== 'accepted' && invitations[rider.id] !== 'pending');
    const pending = partnerProfiles.filter(rider => invitations[rider.id] === 'pending');
    return `
      ${pending.length ? `<div class="panel-label">Pending invitations</div>${pending.map(rider =>
        roomRow(rider, 'Preview pending invitation', `data-preview="${rider.id}" aria-label="Preview invitation for ${rider.name}"`)).join('')}` : ''}
      <div class="panel-label">Available riders <span>Demo profiles</span></div>
      ${available.length ? available.map(rider => roomRow(rider,
        `${towns[rider.first].name} → ${towns[rider.last].name} · ${clock(rider.theirTime)}`,
        `data-room-rider="${rider.id}" aria-label="Review ${rider.name}"`)).join('') : '<p class="empty">No other riders match this trip.</p>'}`;
  }

  function roomPane(group) {
    if (roomView === 'members') return `<h3>Members · ${roster(group).length}</h3>${memberRows(group, 'members')}`;
    if (roomView === 'add') return availableRows(group);
    if (roomView === 'invite') return `
      <h3>Invitation for ${invitee.name}</h3>
      <p class="invitation-note">Demo invitee view · Review the group before joining.</p>
      <div class="panel-label">Who’s riding <span>${roster(group).length} members</span></div>
      ${memberRows(group, 'invite')}
      <div class="view-actions"><button type="button" class="button text-button" data-response="decline">Decline</button>
      <button type="button" class="button primary" data-response="accept">Accept invitation</button></div>`;
    if (roomView === 'candidate') return `${profileDetails(roomRider)}<div class="view-actions">
      <button type="button" class="button primary" data-request>Send invitation</button></div>`;
    return profileDetails(roomRider);
  }

  function setRoomView(view) {
    roomView = view;
    drawRoom();
    if (view === 'chat') $('[data-room-view="members"]')?.focus();
    else $('[data-room-back]')?.focus();
  }

  function drawRoom() {
    const group = groupFor(roomKey);
    const members = accepted(group);
    const membersList = $('#room-members');
    const isChat = roomView === 'chat';
    const pane = $('#room-pane');
    pane.hidden = isChat;
    $('#room-call').hidden = !isChat;
    $('#room-messages').hidden = !isChat;
    $('#chat-form').hidden = !isChat;
    if (!isChat) {
      const back = { members: 'chat', add: 'chat', candidate: 'add', member: 'members', 'invite-member': 'invite', invite: 'add' }[roomView];
      const canReturnToChat = members.length > 0;
      membersList.innerHTML = canReturnToChat || roomView === 'invite-member'
        ? `<button type="button" class="button text-button" data-room-back="${back}">← Back</button>`
        : '';
      pane.innerHTML = roomPane(group);
      pane.scrollTop = 0;
      return;
    }
    membersList.innerHTML = `<button type="button" class="button text-button" data-room-view="members">${icon('people')} Members · ${members.length + 1}</button>
      <button type="button" class="button text-button accent-text" data-room-view="add">${icon('plus')} Add riders</button>`;
    $('#room-call').innerHTML = calling
      ? `<div class="call-status"><strong>Demo call</strong><small>${members.length + 1} in call · ${muted ? 'Muted' : 'Unmuted'}</small></div>
         <button type="button" class="button quiet" data-call="mute" aria-pressed="${muted}">${muted ? 'Unmute' : 'Mute'}</button>
         <button type="button" class="button danger" data-call="end">End call</button>`
      : `<button type="button" class="button quiet" data-call="start">${icon('phone')} Start demo call</button>`;
    drawMessages();
  }

  function drawMessages() {
    const log = $('#room-messages');
    const records = groupFor(roomKey).messages;
    log.replaceChildren(...records.map(item => {
      const entry = document.createElement('div');
      entry.className = 'message ' + (item.type === 'event' ? 'event' : item.type === 'mine' ? 'mine' : 'theirs');
      if (item.type === 'rider') {
        const author = document.createElement('strong');
        author.textContent = item.author;
        entry.append(author);
      }
      const text = document.createElement('p');
      text.textContent = item.text;
      entry.append(text);
      return entry;
    }));
    log.scrollTop = log.scrollHeight;
  }

  $('#sheet-panel').addEventListener('click', event => {
    const profile = event.target.closest('[data-profile]');
    if (profile) openProfile(profile.dataset.profile);
    if (event.target.closest('[data-open-room]')) openRoom();
  });
  profileDialog.addEventListener('click', event => {
    const inviteButton = event.target.closest('[data-invite]');
    if (inviteButton) invite(inviteButton.dataset.invite);
    if (event.target.closest('[data-open-room]')) openRoom();
    if (event.target.closest('[data-close="profile"]')) profileDialog.close();
  });
  profileDialog.addEventListener('close', () => {
    $(`[data-profile="${currentProfile?.id}"]`)?.focus();
  });
  roomDialog.addEventListener('click', event => {
    if (event.target.closest('[data-close="room"]')) roomDialog.close();
    const navigation = event.target.closest('[data-room-view], [data-room-back]');
    if (navigation) {
      setRoomView(navigation.dataset.roomView ?? navigation.dataset.roomBack);
      return;
    }
    const member = event.target.closest('[data-member]');
    if (member) {
      roomRider = roster(groupFor(roomKey)).find(rider => rider.id === member.dataset.member);
      if (roomRider) setRoomView(member.dataset.memberView === 'invite' ? 'invite-member' : 'member');
      return;
    }
    const candidate = event.target.closest('[data-room-rider]');
    if (candidate) {
      roomRider = matches().find(rider => rider.id === candidate.dataset.roomRider);
      if (roomRider) setRoomView('candidate');
      return;
    }
    const group = groupFor(roomKey);
    if (event.target.closest('[data-request]') && roomRider) {
      group.invitations[roomRider.id] = 'pending';
      save();
      refreshPartners();
      setRoomView('add');
      announce(`Invitation pending for ${roomRider.name}.`);
      return;
    }
    const preview = event.target.closest('[data-preview]');
    if (preview && group.invitations[preview.dataset.preview] === 'pending') {
      invitee = partnerProfiles.find(rider => rider.id === preview.dataset.preview);
      setRoomView('invite');
      return;
    }
    const response = event.target.closest('[data-response]')?.dataset.response;
    if (response && invitee && group.invitations[invitee.id] === 'pending') {
      const joining = response === 'accept';
      group.invitations[invitee.id] = joining ? 'accepted' : 'declined';
      if (joining) group.messages.push({ type: 'event', text: `${invitee.name} joined the ride.` });
      save();
      refreshPartners();
      announce(joining ? `${invitee.name} joined the ride group.` : `${invitee.name} declined the invitation.`);
      if (joining) setRoomView('chat');
      else if (accepted(group).length) setRoomView('add');
      else roomDialog.close();
      return;
    }
    const call = event.target.closest('[data-call]')?.dataset.call;
    if (!call) return;
    if (call === 'start') { calling = true; muted = false; }
    if (call === 'end') calling = false;
    if (call === 'mute') muted = !muted;
    drawRoom();
    $(`[data-call="${call === 'mute' ? 'mute' : calling ? 'end' : 'start'}"]`)?.focus();
  });
  roomDialog.addEventListener('close', () => {
    calling = false;
    $('#sheet-panel [data-open-room]')?.focus();
  });
  $('#chat-form').addEventListener('submit', event => {
    event.preventDefault();
    const field = $('#message');
    const text = field.value.trim();
    if (!text || !roomDialog.open) return;
    const id = roomKey;
    const group = groupFor(id);
    const members = accepted(group);
    const count = group.messages.filter(item => item.type === 'mine').length;
    group.messages.push({ type: 'mine', text });
    field.value = '';
    field.focus();
    save();
    drawMessages();
    const reply = [
      'Let’s meet at the first checkpoint.',
      'I’ll keep the offline route handy.',
      'Sounds good. Let’s check in before we leave.'
    ][count % 3];
    setTimeout(() => {
      const sender = members[count % members.length];
      if (!sender) return;
      group.messages.push({ type: 'rider', author: firstName(sender), text: reply });
      save();
      if (roomDialog.open && roomKey === id) drawMessages();
    }, 650);
  });
  return { panel };
})();

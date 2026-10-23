(function () {
  'use strict';
  var types = {
    x: ['X', 'fa-brands fa-x-twitter'],
    instagram: ['Instagram', 'fa-brands fa-instagram'],
    snapchat: ['Snapchat', 'fa-brands fa-snapchat'],
    tiktok: ['TikTok', 'fa-brands fa-tiktok'],
    tellonym: ['Tellonym', null, './assets/tellonym.svg'],
    discord: ['Discord', 'fa-brands fa-discord'],
    playstation: ['PlayStation', 'fa-brands fa-playstation'],
    xbox: ['Xbox', 'fa-brands fa-xbox'],
    telegram: ['Telegram', 'fa-brands fa-telegram'],
    service: ['Digital service', 'fa-solid fa-briefcase'],
    game: ['Game', 'fa-solid fa-gamepad'],
    facebook: ['Facebook', 'fa-brands fa-facebook-f'],
    youtube: ['YouTube', 'fa-brands fa-youtube']
  };
  function create(type, className) {
    var known = Object.prototype.hasOwnProperty.call(types, type), data = known ? types[type] : types.service;
    var badge = document.createElement('span');
    badge.className = 'listing-platform is-' + (known ? type : 'service') + (className ? ' ' + className : '');
    badge.setAttribute('role', 'img'); badge.setAttribute('aria-label', data[0]); badge.title = data[0];
    var mark = document.createElement(data[2] ? 'img' : 'i');
    if (data[2]) { mark.src = data[2]; mark.alt = ''; }
    else mark.className = data[1];
    mark.setAttribute('aria-hidden', 'true'); badge.append(mark); return badge;
  }
  window.ListingPlatforms = Object.freeze({create: create});
})();

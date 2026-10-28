const navLinks = [...document.querySelectorAll('.contents nav a')];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navLinks.forEach((link) => {
      link.classList.toggle('is-active', link.getAttribute('href') === `#${visible.target.id}`);
    });
  }, { rootMargin: '-20% 0px -65% 0px', threshold: [0, .2, .6] });
  sections.forEach((section) => observer.observe(section));
}

const demoButtons = [...document.querySelectorAll('[data-demo]')];
const demoPanels = [...document.querySelectorAll('.demo-panel')];
if (demoButtons.length) {
  document.querySelector('.demo-selector').hidden = false;
  demoPanels.forEach((panel, index) => { panel.hidden = index !== 0; });
  demoButtons.forEach((button) => {
    button.addEventListener('click', () => {
      demoButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      demoPanels.forEach((panel) => {
        const selected = panel.id === `demo-${button.dataset.demo}`;
        panel.hidden = !selected;
        if (!selected) panel.querySelector('video').pause();
      });
    });
  });
}

// Keep narration and task clips from playing over one another.
document.querySelectorAll('video').forEach((video) => {
  video.addEventListener('play', () => {
    document.querySelectorAll('video').forEach((other) => {
      if (other !== video) other.pause();
    });
  });
});

// Shared manual navigation for method stages and key observations.
function setupPanels({ tabsSelector, panelsSelector, instructionSelector, navigationSelector, prefix, dataKey, panelPrefix, names, label }) {
  const tabs = [...document.querySelectorAll(`${tabsSelector} button`)];
  const panels = [...document.querySelectorAll(panelsSelector)];
  if (!tabs.length) return;
  const tabList = document.querySelector(tabsSelector);
  tabList.hidden = false;
  tabList.setAttribute('role', 'tablist');
  document.querySelector(instructionSelector).hidden = false;
  document.querySelector(navigationSelector).hidden = false;
  const previousButton = document.querySelector(`#${prefix}-previous`);
  const nextButton = document.querySelector(`#${prefix}-next`);
  const progress = document.querySelector(`#${prefix}-progress`);
  let selectedIndex = 0;
  const select = (selected, focus = false) => {
    tabs.forEach((tab) => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.id !== `${panelPrefix}-${selected.dataset[dataKey]}`;
      if (panel.hidden) panel.querySelectorAll('video').forEach((video) => video.pause());
    });
    selectedIndex = tabs.indexOf(selected);
    progress.textContent = `${label} ${selectedIndex + 1} of ${tabs.length} · ${names[selectedIndex]}`;
    previousButton.disabled = selectedIndex === 0;
    nextButton.disabled = selectedIndex === tabs.length - 1;
    previousButton.textContent = selectedIndex > 0 ? `← ${names[selectedIndex - 1]}` : 'Previous';
    nextButton.textContent = selectedIndex < tabs.length - 1 ? `Next: ${names[selectedIndex + 1]} →` : `Final ${label.toLowerCase()}`;
    if (focus) selected.focus();
  };
  tabs.forEach((tab, index) => {
    const panel = document.getElementById(`${panelPrefix}-${tab.dataset[dataKey]}`);
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panel.id);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      select(tabs[next], true);
    });
  });
  previousButton.addEventListener('click', () => {
    if (selectedIndex > 0) select(tabs[selectedIndex - 1], true);
  });
  nextButton.addEventListener('click', () => {
    if (selectedIndex < tabs.length - 1) select(tabs[selectedIndex + 1], true);
  });
  select(tabs[0]);
}
setupPanels({
  tabsSelector: '#method .method-tabs', panelsSelector: '.method-panel',
  instructionSelector: '.method-instruction', navigationSelector: '#method .method-navigation',
  prefix: 'method', dataKey: 'stage', panelPrefix: 'stage', label: 'Step',
  names: ['Collection', 'Preprocessing', 'Policy training', 'Inference']
});
setupPanels({
  tabsSelector: '.observation-tabs', panelsSelector: '.observation',
  instructionSelector: '.observation-instruction', navigationSelector: '.observation-navigation',
  prefix: 'observation', dataKey: 'observation', panelPrefix: 'observation', label: 'Observation',
  names: ['Across hands', 'Contact cameras', 'Contact-surface actions', 'Contact alignment']
});

// Give every video the same launch treatment, retaining native no-script controls.
const playIcon = document.querySelector('.video-cover__play');
document.querySelectorAll('video').forEach((video, index) => {
  let player = video.closest('.video-player');
  if (!player) {
    player = document.createElement('div');
    player.className = 'video-player';
    video.before(player);
    player.append(video);
  }
  if (!video.id) video.id = `clip-video-${index}`;
  video.tabIndex = 0;
  let cover = player.querySelector('.video-cover');
  if (!cover) {
    cover = document.createElement('button');
    cover.className = 'video-cover video-cover--clip';
    cover.type = 'button';
    cover.setAttribute('aria-label', `Play ${video.getAttribute('aria-label') || 'video'}`);
    cover.setAttribute('aria-controls', video.id);
    cover.append(playIcon.cloneNode(true));
    player.append(cover);
  }
  let status = player.parentElement.querySelector('.video-status');
  if (!status) {
    status = document.createElement('p');
    status.className = 'video-status';
    status.setAttribute('role', 'status');
    status.hidden = true;
    player.after(status);
  }
  cover.hidden = false;
  video.controls = false;
  const revealPlayer = () => {
    cover.hidden = true;
    video.controls = true;
  };
  const showCover = () => {
    video.controls = false;
    cover.hidden = false;
  };
  cover.addEventListener('click', () => {
    status.hidden = true;
    revealPlayer();
    video.focus({ preventScroll: true });
    video.play().catch((error) => {
      // Switching panels or starting another clip can interrupt a pending play.
      if (error.name === 'AbortError') {
        if (video.paused) showCover();
        return;
      }
      status.textContent = 'Playback could not start. Use the video controls to retry.';
      status.hidden = false;
    });
  });
  video.addEventListener('play', revealPlayer);
  video.addEventListener('ended', showCover);
  video.addEventListener('error', () => {
    revealPlayer();
    status.textContent = 'The video could not load. Try reloading the page.';
    status.hidden = false;
  });
});

// The retargeting clip starts on request and loops until paused or out of view.
const alignmentAnimation = document.querySelector('.alignment-animation video');
if (alignmentAnimation && 'IntersectionObserver' in window) {
  const animationObserver = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.15)) {
      alignmentAnimation.pause();
    }
  }, { threshold: 0.15 });
  animationObserver.observe(alignmentAnimation);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) alignmentAnimation.pause();
  });
}

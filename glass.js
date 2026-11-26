// Bend the backdrop at a rounded panel's rim while keeping its center clear.
(() => {
  const ns = 'http://www.w3.org/2000/svg';
  if (!window.ResizeObserver || !CSS.supports('backdrop-filter', 'url("#glass")')) return;
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;pointer-events:none;overflow:hidden';
  const defs = document.createElementNS(ns, 'defs');
  svg.append(defs);
  document.body.append(svg);
  const make = (tag, attrs) => {
    const node = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  };
  const targets = [...document.querySelectorAll('.topbar,.card,.info-card,.hero-jump')];
  const pending = new Set();
  let frame = 0;
  function update(element, index) {
    const {width, height} = element.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    const key = `${Math.round(width)}-${Math.round(height)}`;
    if (element.dataset.glassSize === key) return;
    element.dataset.glassSize = key;
    const radius = Math.min(parseFloat(getComputedStyle(element).borderTopLeftRadius) || 30, width / 2, height / 2);
    const bevel = Math.min(22, radius * .75, height / 3);
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(Math.min(width, 800));
    canvas.height = Math.ceil(Math.min(height, 1000));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixels = ctx.createImageData(canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const px = (x + .5) / canvas.width * width - width / 2;
        const py = (y + .5) / canvas.height * height - height / 2;
        const qx = Math.abs(px) - (width / 2 - radius);
        const qy = Math.abs(py) - (height / 2 - radius);
        const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
        const outside = Math.hypot(ox, oy);
        const distance = -(outside + Math.min(Math.max(qx, qy), 0) - radius);
        let nx = 0, ny = 0;
        if (outside > 0) { nx = ox / outside * Math.sign(px); ny = oy / outside * Math.sign(py); }
        else if (qx > qy) nx = Math.sign(px);
        else ny = Math.sign(py);
        const bend = distance > 0 && distance < bevel ? Math.sin(distance / bevel * Math.PI) * .44 : 0;
        const offset = (y * canvas.width + x) * 4;
        pixels.data[offset] = Math.round(127.5 + nx * bend * 255);
        pixels.data[offset + 1] = Math.round(127.5 + ny * bend * 255);
        pixels.data[offset + 2] = 128;
        pixels.data[offset + 3] = 255;
      }
    }
    ctx.putImageData(pixels, 0, 0);
    const id = `liquid-rim-${index}`;
    const old = document.getElementById(id);
    if (old) old.remove();
    const filter = make('filter', {id, x:0, y:0, width, height, filterUnits:'userSpaceOnUse', primitiveUnits:'userSpaceOnUse', 'color-interpolation-filters':'sRGB'});
    filter.append(make('feImage', {href:canvas.toDataURL(), x:0, y:0, width, height, preserveAspectRatio:'none', result:'rim-map'}));
    filter.append(make('feDisplacementMap', {in:'SourceGraphic', in2:'rim-map', scale:26, xChannelSelector:'R', yChannelSelector:'G'}));
    defs.append(filter);
    element.style.backdropFilter = `url(#${id}) saturate(1.08)`;
    element.dataset.glassRefraction = 'ready';
  }
  const observer = new ResizeObserver(entries => {
    entries.forEach(({target}) => pending.add(target));
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      pending.forEach(target => update(target, targets.indexOf(target)));
      pending.clear();
    });
  });
  targets.forEach(element => {
    observer.observe(element);
    element.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      const box = element.getBoundingClientRect();
      element.style.setProperty('--glint-x', `${(event.clientX - box.left) / box.width * 100}%`);
      element.style.setProperty('--glint-y', `${(event.clientY - box.top) / box.height * 100}%`);
    });
  });
})();

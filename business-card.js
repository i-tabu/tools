/* Contact data is generated locally and never persisted or sent to a service. */
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const form = $('contact-form');
  const fields = ['fullName', 'occupation', 'company', 'mobile', 'email', 'website'];
  let current = null;
  const escapeVCard = value => value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  // vCard 3.0 folds physical lines at 75 UTF-8 octets, never inside a character.
  function foldLine(line) {
    const encoder = new TextEncoder();
    let output = '', length = 0;
    for (const char of line) {
      const bytes = encoder.encode(char).length;
      if (length + bytes > 75) { output += '\r\n '; length = 1; }
      output += char;
      length += bytes;
    }
    return output;
  }
  function vcard(data) {
    const parts = data.fullName.split(/\s+/);
    const given = parts.shift();
    const family = parts.join(' ');
    const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${escapeVCard(family)};${escapeVCard(given)};;;`, `FN:${escapeVCard(data.fullName)}`];
    for (const [key, property] of [['occupation', 'TITLE'], ['company', 'ORG'], ['mobile', 'TEL;TYPE=CELL'], ['email', 'EMAIL;TYPE=INTERNET'], ['website', 'URL']]) {
      if (data[key]) lines.push(`${property}:${escapeVCard(data[key])}`);
    }
    return [...lines, 'END:VCARD'].map(foldLine).join('\r\n') + '\r\n';
  }
  function invalidate() {
    current = null;
    $('result').hidden = true;
    $('empty').hidden = false;
    $('status').textContent = '';
    $('mobile').setCustomValidity('');
    $('fullName').setCustomValidity('');
  }
  form.addEventListener('input', invalidate);
  form.addEventListener('reset', invalidate);
  $('example').addEventListener('click', () => {
    invalidate();
    const example = ['Tabu Shaikh', 'Co-founder', 'Symbolists Technology', '+91-9819707024', 'tabu@symbolist.technology', 'https://symbolist.technology'];
    fields.forEach((field, i) => { $(field).value = example[i]; });
    $('fullName').focus();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    invalidate();
    const data = Object.fromEntries(fields.map(field => [field, $(field).value.trim()]));
    if (!data.fullName) $('fullName').setCustomValidity('Please enter your name.');
    if (!data.mobile && !data.email) $('mobile').setCustomValidity('Enter a mobile number or an email address.');
    if (data.mobile && !/^\+?[\d\s().-]{5,40}$/.test(data.mobile)) $('mobile').setCustomValidity('Enter a valid phone number, including its country code.');
    if (!form.reportValidity()) return;
    try {
      const contact = vcard(data);
      const code = qrcode(0, 'M');
      code.addData(contact, 'Byte');
      code.make();
      const canvas = $('qr');
      const count = code.getModuleCount();
      const scale = Math.max(4, Math.floor(640 / (count + 8)));
      canvas.width = canvas.height = (count + 8) * scale;
      canvas.style.width = '288px';
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
        if (code.isDark(row, col)) ctx.fillRect((col + 4) * scale, (row + 4) * scale, scale, scale);
      }
      for (const field of fields) {
        const element = $('card-' + (field === 'fullName' ? 'name' : field));
        element.textContent = data[field];
        element.hidden = !data[field];
      }
      current = { data, contact };
      $('empty').hidden = true;
      $('result').hidden = false;
      $('status').textContent = 'Your business card is ready.';
    } catch (error) {
      $('status').textContent = 'Could not generate the QR code. Try shortening your details, then generate again.';
    }
  });
  function download(blob, suffix) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (current.data.fullName.replace(/[^\p{L}\p{N} -]/gu, '').trim() || 'contact') + suffix;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  $('download-vcf').addEventListener('click', () => {
    if (current) download(new Blob([current.contact], { type: 'text/vcard;charset=utf-8' }), '.vcf');
  });
  function downloadPNG(canvas, suffix) {
    canvas.toBlob(blob => {
      if (blob && current) download(blob, suffix);
      else $('status').textContent = 'Image export failed. Please generate your card again.';
    }, 'image/png');
  }
  $('download-qr').addEventListener('click', () => { if (current) downloadPNG($('qr'), '-qr.png'); });
  // Paint the displayed card's measured layout instead of maintaining a second design.
  function renderCard(card) {
    const bounds = card.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    const scale = 3;
    canvas.width = Math.ceil(bounds.width * scale);
    canvas.height = Math.ceil(bounds.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    const rootStyle = getComputedStyle(card);
    ctx.beginPath();
    ctx.roundRect(0, 0, bounds.width, bounds.height, parseFloat(rootStyle.borderRadius));
    ctx.clip();

    function paintText(node, style) {
      const range = document.createRange();
      ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ctx.fillStyle = style.color;
      ctx.textBaseline = 'alphabetic';
      ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
      const metrics = ctx.measureText('Mg');
      const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
      const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
      let line = '', box = null;
      function flush() {
        if (!box || !line) return;
        const baseline = box.top - bounds.top + (box.height - ascent - descent) / 2 + ascent;
        const text = style.textTransform === 'uppercase' ? line.toLocaleUpperCase()
          : style.textTransform === 'lowercase' ? line.toLocaleLowerCase() : line;
        ctx.fillText(text, box.left - bounds.left, baseline);
      }
      // Range measurements preserve the browser's word wrapping, including long URLs.
      for (let offset = 0; offset < node.length;) {
        const char = String.fromCodePoint(node.textContent.codePointAt(offset));
        range.setStart(node, offset);
        offset += char.length;
        range.setEnd(node, offset);
        const rect = range.getBoundingClientRect();
        if (box && Math.abs(rect.top - box.top) > 1) { flush(); line = ''; box = null; }
        if (!box) box = rect;
        line += char;
      }
      flush();
    }
    function paint(element) {
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      const box = element.getBoundingClientRect();
      const x = box.left - bounds.left, y = box.top - bounds.top;
      ctx.fillStyle = style.backgroundColor;
      ctx.beginPath();
      ctx.roundRect(x, y, box.width, box.height, parseFloat(style.borderRadius) || 0);
      ctx.fill();
      if (element instanceof HTMLCanvasElement) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(element, x, y, box.width, box.height);
        return;
      }
      for (const child of element.childNodes) {
        if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) paintText(child, style);
        else if (child.nodeType === Node.ELEMENT_NODE) paint(child);
      }
    }
    paint(card);
    return canvas;
  }
  $('share-card').addEventListener('click', async () => {
    if (!current) return;
    const snapshot = current;
    const button = $('share-card');
    button.disabled = true;
    try {
      await document.fonts.ready;
      if (current !== snapshot) return;
      const blob = await new Promise(resolve => renderCard($('card')).toBlob(resolve, 'image/png'));
      if (current !== snapshot) return;
      if (!blob) throw new Error('Image export failed');
      const name = snapshot.data.fullName.replace(/[^\p{L}\p{N} -]/gu, '').trim() || 'contact';
      const file = new File([blob], name + '-business-card.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: snapshot.data.fullName + ' · Business card' });
          if (current === snapshot) $('status').textContent = 'Business card shared.';
          return;
        } catch (error) {
          if (error.name === 'AbortError' || current !== snapshot) return;
        }
      }
      download(blob, '-business-card.png');
      $('status').textContent = 'Image sharing is unavailable here. Your card has been downloaded so you can share it.';
    } catch (error) {
      if (current === snapshot) $('status').textContent = 'Could not share your card. Please try again.';
    } finally {
      button.disabled = false;
    }
  });
  $('download-card').addEventListener('click', async () => {
    if (!current) return;
    const snapshot = current;
    try {
      await document.fonts.ready;
      if (current !== snapshot) return;
      downloadPNG(renderCard($('card')), '-business-card.png');
    } catch (error) {
      $('status').textContent = 'Image export failed. Please try downloading your card again.';
    }
  });
})();

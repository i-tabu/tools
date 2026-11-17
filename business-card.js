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
  $('download-card').addEventListener('click', () => {
    if (!current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    const ctx = canvas.getContext('2d');
    // Wrap long details rather than clipping them in the downloaded card.
    const lines = [];
    for (const field of fields) {
      if (!current.data[field]) continue;
      ctx.font = field === 'fullName' ? 'bold 62px sans-serif' : '32px sans-serif';
      let line = '';
      for (const char of current.data[field]) {
        if (ctx.measureText(line + char).width > 1010) { lines.push({ text: line, field }); line = ''; }
        line += char;
      }
      lines.push({ text: line, field });
    }
    canvas.height = 1000 + lines.reduce((height, line) => height + (line.field === 'fullName' ? 80 : 48), 0);
    ctx.fillStyle = '#153f38'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    let y = 100;
    ctx.fillStyle = '#a4d8c7'; ctx.font = '24px sans-serif'; ctx.fillText("LET'S STAY CONNECTED", 80, y);
    y += 90;
    for (const line of lines) {
      ctx.font = line.field === 'fullName' ? 'bold 62px sans-serif' : '32px sans-serif';
      ctx.fillStyle = line.field === 'fullName' ? '#ffffff' : '#d6e6df';
      ctx.fillText(line.text, 80, y); y += line.field === 'fullName' ? 80 : 48;
    }
    y += 20;
    ctx.fillStyle = '#fff'; ctx.fillRect(260, y, 680, 680);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage($('qr'), 280, y + 20, 640, 640);
    ctx.fillStyle = '#d6e6df'; ctx.font = '28px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Scan to add contact', 600, y + 740);
    downloadPNG(canvas, '-business-card.png');
  });
})();

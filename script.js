// script.js - shared by index.html and results.html
(() => {
  const PARTIES = [
    { id: 'nda', name: 'NDA', color:'#0b74de', symbol: ndaSVG() },
    { id: 'mahagathbandhan', name: 'Mahagathbandhan', color:'#de4b0b', symbol: mahagathSVG() },
    { id: 'jansuwraj', name: 'Jansuwraj', color:'#1f9d55', symbol: jansuwrajSVG() },
    { id: 'jjd', name: 'Janshakti Janta Dal (JJD)', color:'#9b5de5', symbol: jjdSVG() },
    { id: 'aimim', name: 'AIMIM', color:'#f59e0b', symbol: aimimSVG() },
    { id: 'others', name: 'Others', color:'#6b7280', symbol: othersSVG() }
  ];

  const VOTE_KEY = 'bv_votes_v1';
  const VOTED_KEY = 'bv_voted_v1';
  const CODER_PASSWORD = 'coder'; // coder password to view results

  // Utility: read/write votes
  function readVotes(){
    try {
      const raw = localStorage.getItem(VOTE_KEY);
      if(!raw) return PARTIES.reduce((acc,p)=> (acc[p.id]=0, acc), {});
      return JSON.parse(raw);
    } catch(e){ return PARTIES.reduce((acc,p)=> (acc[p.id]=0, acc), {}); }
  }
  function writeVotes(obj){ localStorage.setItem(VOTE_KEY, JSON.stringify(obj)); }
  function markVoted(){ localStorage.setItem(VOTED_KEY, '1'); }
  function hasVoted(){ return localStorage.getItem(VOTED_KEY) === '1'; }

  // ---------- VOTING PAGE ----------
  if(document.getElementById('parties')){
    const container = document.getElementById('parties');
    const votes = readVotes();

    PARTIES.forEach(p =>{
      const card = document.createElement('div');
      card.className = 'card';

      const imgWrap = document.createElement('div');
      imgWrap.className = 'party-img';
      imgWrap.innerHTML = p.symbol;
      imgWrap.title = p.name;
      imgWrap.style.cursor = 'pointer';
      card.appendChild(imgWrap);

      const name = document.createElement('div');
      name.className = 'party-name';
      name.textContent = p.name;
      card.appendChild(name);

      const voteRow = document.createElement('div');
      voteRow.className = 'vote-row';

      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = 'Vote';
      btn.onclick = () => {
        if(hasVoted()){ alert('You already voted from this browser.'); return; }
        const cur = readVotes();
        cur[p.id] = (cur[p.id]||0) + 1;
        writeVotes(cur);
        markVoted();
        showAfterVote();
        disableAllButtons();
      };

      voteRow.appendChild(btn);
      card.appendChild(voteRow);

      // show small count (optional)
      const count = document.createElement('div');
      count.style.fontSize = '0.9rem';
      count.style.color = '#64748b';
      count.textContent = `${votes[p.id] || 0} votes (so far)`;
      card.appendChild(count);

      // clicking image also votes
      imgWrap.addEventListener('click', () => btn.click());

      container.appendChild(card);
    });

    function showAfterVote(){
      document.getElementById('after-vote').classList.remove('hidden');
    }

    function disableAllButtons(){
      document.querySelectorAll('.btn').forEach(b => b.disabled = true);
    }

    // if already voted, disable
    if(hasVoted()){
      disableAllButtons();
      showAfterVote();
    }
  }

  // ---------- RESULTS PAGE ----------
  if(document.getElementById('resultsCanvas')){
    // simple password guard
    const allowed = (() => {
      const pass = sessionStorage.getItem('bv_allowed');
      if(pass === '1') return true;
      const attempt = prompt('Enter coder password to view results:');
      if(attempt === CODER_PASSWORD){
        sessionStorage.setItem('bv_allowed','1');
        return true;
      } else {
        alert('Wrong password. Redirecting to voting page.');
        location.href = 'index.html';
        return false;
      }
    })();

    if(!allowed) return;

    const canvas = document.getElementById('resultsCanvas');
    const ctx = canvas.getContext('2d');
    const legendDiv = document.getElementById('legend');
    const resetBtn = document.getElementById('resetBtn');

    function drawChart(){
      const votes = readVotes();
      const totals = PARTIES.map(p => ({...p, votes: votes[p.id]||0}));
      const maxV = Math.max(1, ...totals.map(t => t.votes));
      const padding = 60;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0,0,W,H);
      // background subtle
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0,0,W,H);

      // title
      ctx.fillStyle = '#0f172a';
      ctx.font = '18px Inter, system-ui, Arial';
      ctx.fillText('Votes (as recorded in browser localStorage)', 18, 28);

      // axis
      const barAreaW = W - padding*2;
      const barW = Math.min(80, barAreaW / (totals.length * 1.5));
      const gap = (barAreaW - (barW * totals.length)) / (totals.length - 1 || 1);

      const baseY = H - 60;
      // y labels
      ctx.fillStyle = '#64748b';
      ctx.font = '12px Inter, Arial';
      for(let i=0;i<=4;i++){
        const y = baseY - (i/4)*(baseY - 80);
        const v = Math.round((i/4)*maxV);
        ctx.fillText(String(v), 10, y+4);
        // grid
        ctx.strokeStyle = 'rgba(15,23,42,0.05)';
        ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W-20, y); ctx.stroke();
      }

      // bars
      totals.forEach((t, i) => {
        const x = padding + i*(barW+gap);
        const h = (t.votes / maxV) * (baseY - 90);
        const y = baseY - h;
        // bar fill (rounded)
        roundRect(ctx, x, y, barW, h, 8, t.color);
        // value label
        ctx.fillStyle = '#0f172a';
        ctx.font = '13px Inter, Arial';
        ctx.textAlign = 'center';
        ctx.fillText(String(t.votes), x + barW/2, y - 8);

        // party label (wrap)
        ctx.fillStyle = '#0f172a';
        ctx.font = '12px Inter, Arial';
        ctx.textAlign = 'center';
        wrapText(ctx, t.name, x + barW/2, baseY + 18, barW + 10, 14);
      });

      // legend
      legendDiv.innerHTML = '';
      totals.forEach(t => {
        const it = document.createElement('div');
        it.className = 'item';
        const sw = document.createElement('span');
        sw.className = 'sw';
        sw.style.background = t.color;
        it.appendChild(sw);
        const label = document.createElement('span');
        label.textContent = `${t.name} — ${t.votes}`;
        it.appendChild(label);
        legendDiv.appendChild(it);
      });
    }

    function roundRect(ctx, x, y, w, h, r, color){
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    function wrapText(ctx, text, x, y, maxWidth, lineHeight){
      const words = text.split(' ');
      let line = '';
      let curY = y;
      ctx.textAlign = 'center';
      for(let n=0;n<words.length;n++){
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if(metrics.width > maxWidth && n > 0){
          ctx.fillText(line, x, curY);
          line = words[n] + ' ';
          curY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, curY);
    }

    drawChart();

    // update when reset
    resetBtn.onclick = () => {
      if(!confirm('Reset votes and voting flag? This clears localStorage entries used by this demo.')) return;
      localStorage.removeItem(VOTE_KEY);
      localStorage.removeItem(VOTED_KEY);
      sessionStorage.removeItem('bv_allowed');
      alert('Votes cleared. Redirecting to voting page.');
      location.href = 'index.html';
    };
  }

  // ---------- helper SVGs for symbols (simple shapes) ----------
  function ndaSVG(){ return `<svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="88" height="88" rx="12" fill="#0b74de"/>
    <circle cx="50" cy="40" r="20" fill="#fff"/>
    <rect x="40" y="62" width="20" height="8" rx="3" fill="#fff"/>
  </svg>` }
  function mahagathSVG(){ return `<svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="88" height="88" rx="12" fill="#de4b0b"/>
    <path d="M20 72 L50 28 L80 72 Z" fill="#fff"/>
  </svg>` }
  function jansuwrajSVG(){ return `<svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="88" height="88" rx="12" fill="#1f9d55"/>
    <g transform="translate(12,18)">
      <rect x="10" y="10" width="56" height="20" rx="6" fill="#fff"/>
      <circle cx="38" cy="60" r="10" fill="#fff"/>
    </g>
  </svg>` }
  function jjdSVG(){ return `<svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="88" height="88" rx="12" fill="#9b5de5"/>
    <path d="M22 30 C38 10, 62 10, 78 30 L78 70 L22 70 Z" fill="#fff"/>
  </svg>` }
  function aimimSVG(){ return `<svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="88" height="88" rx="12" fill="#f59e0b"/>
    <path d="M50 22 L66 70 L34 70 Z" fill="#fff"/>
  </svg>` }
  function othersSVG(){ return `<svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="88" height="88" rx="12" fill="#6b7280"/>
    <g fill="#fff">
      <circle cx="35" cy="38" r="8"/>
      <circle cx="65" cy="38" r="8"/>
      <rect x="30" y="60" width="40" height="8" rx="4"/>
    </g>
  </svg>` }
})();
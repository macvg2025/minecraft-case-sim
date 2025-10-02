/* script.js - core game logic (cases, inventory, daily bonus, UI) */
"use strict";

/* Paths: your images should go under assets/, sounds under snd/ */
const PLACEHOLDER_IMG = 'assets/ui/logo.png'; // put a small placeholder in assets/ui/logo.png
const SOUND = {
  click: 'snd/click.mp3',
  open: 'snd/scroll.mp3',
  chest: 'snd/open_chest.mp3',
  sell: 'snd/sell.mp3'
};

/* small helpers */
function $(s){return document.querySelector(s)}
function $all(s){return Array.from(document.querySelectorAll(s))}
function fmt(n){
  if(n>=1_000_000) return (n/1_000_000).toFixed(2).replace(/\.00$/,'')+'mil';
  if(n>=1000) return (n/1000).toFixed(2).replace(/\.00$/,'')+'k';
  return '$'+(Math.round(n*100)/100);
}
function rand(min,max){ return Math.random()*(max-min)+min; }
function randint(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function todayStr(){ const d=new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
function daysBetween(a,b){ return Math.floor((new Date(b)-new Date(a))/(24*3600*1000)); }

/* Minimal data: We'll paste the CASES data into this file (abbreviated for readability).
   Replace images for cases/items by updating item.img to 'assets/items/<case>/<item>.png' */
const CASES = [
  { key:'resources', title:'Resources Case', price:12, img:'assets/cases/resources.png', items:[
    {name:'Coil', min:2, max:6, rarity:'common', img:'assets/items/resources/coil.png'},
    {name:'Flint', min:3, max:8, rarity:'common', img:'assets/items/resources/flint.png'},
    {name:'Iron', min:10, max:16, rarity:'uncommon', img:'assets/items/resources/iron.png'},
    {name:'Slimeball', min:10, max:16, rarity:'uncommon', img:'assets/items/resources/slimeball.png'},
    {name:'Redstone', min:12, max:22, rarity:'uncommon', img:'assets/items/resources/redstone.png'},
    {name:'Lapis Lazuli', min:20, max:28, rarity:'rare', img:'assets/items/resources/lapis.png'},
    {name:'Glowstone', min:30, max:43, rarity:'rare', img:'assets/items/resources/glowstone.png'},
    {name:'Gold', min:70, max:110, rarity:'rare', img:'assets/items/resources/gold.png'},
    {name:'Diamond', min:280, max:450, rarity:'superrare', img:'assets/items/resources/diamond.png'},
    {name:'Emerald', min:380, max:600, rarity:'superrare', img:'assets/items/resources/emerald.png'},
    {name:'Nether Star', min:400, max:750, rarity:'legendary', img:'assets/items/resources/nether_star.png'} // lowered for balance
  ]},
  /* Add the other cases similarly. For brevity in this starter file you can copy/paste your full list later. */
];

/* Rarity -> popup class mapping */
const POP_CLASS = {
  'common':'popup-common',
  'uncommon':'popup-uncommon',
  'rare':'popup-rare',
  'superrare':'popup-superrare',
  'legendary':'popup-legendary'
};

/* Local storage keys */
const LS = { money:'mc_money_v1', inv:'mc_inv_v1', daily:'mc_daily_v1' };

/* State */
let state = {
  money: parseFloat(localStorage.getItem(LS.money) || '1000') || 1000,
  inventory: JSON.parse(localStorage.getItem(LS.inv) || '[]'),
  daily: JSON.parse(localStorage.getItem(LS.daily) || '{}'),
  currentCase: null
};

/* Sounds */
const aud = {};
Object.keys(SOUND).forEach(k => {
  const a = new Audio(SOUND[k]||'');
  a.preload = 'auto';
  aud[k] = a;
});
function play(s){ try{ if(aud[s] && aud[s].src) { aud[s].currentTime=0; aud[s].play().catch(()=>{}); } }catch(e){} }

/* UI elements */
const moneyEl = $('#moneyDisplay');
const dailyEl = $('#dailyBadge');
const casesGrid = $('#casesGrid');
const inventoryGrid = $('#inventoryGrid');
const casePage = $('#casePage');
const scrollerInner = $('#scrollerInner');
const caseTitle = $('#caseTitle');
const caseCost = $('#caseCost');
const lastWin = $('#lastWin');
const resultPrice = $('#resultPrice');
const itemPopup = $('#itemPopup');
const popupInner = $('#popupInner');

function persist(){
  localStorage.setItem(LS.money, state.money);
  localStorage.setItem(LS.inv, JSON.stringify(state.inventory));
  localStorage.setItem(LS.daily, JSON.stringify(state.daily));
}

/* DAILY bonus (50$ times streak) */
function claimDaily(){
  const today = todayStr();
  if(!state.daily.lastDate){
    state.daily = { lastDate: today, streak: 1 };
    const bonus = 50*state.daily.streak;
    state.money += bonus;
    toast(`Daily bonus: $${bonus} (streak ${state.daily.streak})`);
  } else {
    const diff = daysBetween(state.daily.lastDate, today);
    if(diff === 0){
      // already claimed today
    } else if(diff === 1){
      state.daily.streak = (state.daily.streak||1)+1;
      state.daily.lastDate = today;
      const bonus = 50*state.daily.streak;
      state.money += bonus;
      toast(`Daily bonus: $${bonus} (streak ${state.daily.streak})`);
    } else {
      // missed -> reset
      state.daily.streak = 1;
      state.daily.lastDate = today;
      const bonus = 50*state.daily.streak;
      state.money += bonus;
      toast(`Daily bonus: $${bonus} (streak reset)`);
    }
  }
  persist();
  renderTop();
}

/* Render top UI */
function renderTop(){
  moneyEl.innerText = fmt(state.money);
  if(state.daily && state.daily.streak) dailyEl.innerText = `Daily: $${50*state.daily.streak} (x${state.daily.streak})`;
  else dailyEl.innerText = 'Daily: —';
}

/* Render cases */
function renderCases(){
  casesGrid.innerHTML = '';
  CASES.forEach(c => {
    const card = document.createElement('div');
    card.className = 'case-card';
    card.innerHTML = `
      <img src="${c.img || PLACEHOLDER_IMG}" alt="${c.title}" onerror="this.src='${PLACEHOLDER_IMG}'" />
      <div class="title">${c.title}</div>
      <div class="price small">${fmt(c.price)}</div>
    `;
    card.addEventListener('click', ()=> openCasePage(c));
    casesGrid.appendChild(card);
  });
}

/* Open the full-page case view */
function openCasePage(c){
  play('click');
  state.currentCase = c;
  caseTitle.innerText = c.title;
  caseCost.innerText = `Price: ${fmt(c.price)}`;
  // build scrollerInner: repeat items multiple times for long scroll
  scrollerInner.innerHTML = '';
  const repeated = [];
  for(let r=0;r<6;r++) c.items.forEach(it => repeated.push(it));
  repeated.forEach(it => {
    const div = document.createElement('div');
    div.className = 'scroller-item ' + (it.rarity ? ('rarity-' + it.rarity) : '');
    div.innerHTML = `<div style="font-weight:800">${it.name}</div><div class="small">${it.min}-${it.max}$</div>`;
    scrollerInner.appendChild(div);
  });
  casePage.style.display = 'flex'; casePage.setAttribute('aria-hidden','false');
}

/* Close case page */
$('#caseBack').addEventListener('click', ()=>{
  play('click');
  casePage.style.display = 'none';
  casePage.setAttribute('aria-hidden','true');
  state.currentCase = null;
});

/* Open Case animation and reward */
$('#openCaseBtn').addEventListener('click', ()=>{
  if(!state.currentCase) return;
  if(state.money < state.currentCase.price){ alert('Not enough money'); return; }
  play('open');
  state.money -= state.currentCase.price;
  persist(); renderTop();
  // select index to land on
  const items = Array.from(scrollerInner.children);
  const total = items.length;
  const pick = randint(Math.floor(total*0.4), Math.floor(total*0.95));
  const itemNode = items[pick];
  // compute translateX target to center picked item
  const itemW = itemNode.getBoundingClientRect().width + 8;
  const scrollerW = $('#scroller').getBoundingClientRect().width;
  const targetX = - (pick * itemW) + scrollerW/2 - itemW/2;
  // animate using requestAnimationFrame with ease out
  const start = performance.now();
  const duration = 3000;
  const startX = 0;
  function step(now){
    const t = Math.min(1,(now-start)/duration);
    const eased = 1 - Math.pow(1-t,3);
    const curX = startX + (targetX - startX)*eased;
    scrollerInner.style.transform = `translateX(${curX}px)`;
    if(t<1) requestAnimationFrame(step);
    else {
      // reward
      const name = itemNode.querySelector('div').innerText;
      // find original item prototype from currentCase by name
      const proto = state.currentCase.items.find(it => it.name === name) || {};
      const price = Math.round((rand(proto.min||1, proto.max||1))*100)/100;
      const inventoryItem = {
        id: 'it_'+Date.now()+'_'+Math.floor(Math.random()*9999),
        name: proto.name || name,
        price: price,
        min: proto.min || price,
        max: proto.max || price,
        rarity: proto.rarity || 'common',
        img: proto.img || PLACEHOLDER_IMG
      };
      state.inventory.push(inventoryItem);
      persist();
      lastWin.innerText = `Last win: ${inventoryItem.name}`;
      resultPrice.innerText = fmt(inventoryItem.price);
      play('chest');
      renderInventory();
      // show small popup colored by rarity
      showPopup(inventoryItem);
    }
  }
  requestAnimationFrame(step);
});

/* Show item popup */
function showPopup(it){
  const popup = $('#itemPopup');
  popup.style.display = 'block';
  popup.setAttribute('aria-hidden','false');
  $('#popupImg').src = it.img || PLACEHOLDER_IMG;
  $('#popupName').innerText = it.name;
  $('#popupPrice').innerText = fmt(it.price);
  const cls = POP_CLASS[it.rarity] || POP_CLASS.common;
  $('#popupInner').className = 'popup-inner ' + cls;
}

/* Popup close */
$('#popupClose').addEventListener('click', ()=>{
  $('#itemPopup').style.display = 'none';
  $('#itemPopup').setAttribute('aria-hidden','true');
  play('click');
});

/* Render inventory */
function renderInventory(){
  inventoryGrid.innerHTML = '';
  if(state.inventory.length === 0){
    inventoryGrid.innerHTML = '<div class="small">Inventory empty. Open some cases.</div>';
    return;
  }
  state.inventory.forEach((it, idx) => {
    const card = document.createElement('div'); card.className = 'inv-card';
    card.innerHTML = `
      <img src="${it.img || PLACEHOLDER_IMG}" onerror="this.src='${PLACEHOLDER_IMG}'" />
      <div style="flex:1">
        <div class="name">${it.name}</div>
        <div class="small">${fmt(it.price)} • ${it.rarity}</div>
        <div class="bar-wrap" style="background:rgba(255,255,255,0.03); height:8px; border-radius:8px; margin-top:8px">
          <div class="bar" style="width:${Math.max(2, Math.round(((it.price - it.min)/(it.max - it.min || 1))*100))}%; height:100%; background:linear-gradient(90deg,#1fb96b,#2b7be9)"></div>
        </div>
      </div>
    `;
    card.addEventListener('click', ()=>{
      card.classList.toggle('selected');
    });
    inventoryGrid.appendChild(card);
  });
}

/* Sell selected */
$('#sellSelected').addEventListener('click', ()=>{
  const cards = $all('#inventoryGrid .inv-card');
  const selectedIdx = [];
  cards.forEach((c,i)=>{ if(c.classList.contains('selected')) selectedIdx.push(i); });
  if(selectedIdx.length === 0){ alert('Select items first.'); return; }
  // sell from highest index to avoid reindexing
  selectedIdx.sort((a,b)=>b-a).forEach(i => {
    state.money += state.inventory[i].price;
    state.inventory.splice(i,1);
  });
  play('sell');
  persist(); renderInventory(); renderTop();
});

/* Sell all */
$('#sellAll').addEventListener('click', ()=>{
  if(state.inventory.length === 0) { alert('No items.'); return; }
  let total = 0;
  state.inventory.forEach(it => total += it.price);
  state.money += total;
  state.inventory = [];
  play('sell');
  persist(); renderInventory(); renderTop();
});

/* Tabs behavior */
$('#tabCases').addEventListener('click', ()=>{ $('#casesView').style.display='block'; $('#inventoryView').style.display='none'; $('#tabCases').classList.add('active'); $('#tabInventory').classList.remove('active'); play('click'); });
$('#tabInventory').addEventListener('click', ()=>{ $('#casesView').style.display='none'; $('#inventoryView').style.display='block'; $('#tabInventory').classList.add('active'); $('#tabCases').classList.remove('active'); play('click'); });

/* Luck button (fake) */
$('#luckBtn').addEventListener('click', ()=>{
  const btn = $('#luckBtn');
  btn.innerText = 'Luck ↑ (boosted)';
  btn.style.boxShadow = '0 8px 30px rgba(47, 157, 84, 0.15)';
  play('click');
  setTimeout(()=>{ btn.innerText = 'Luck ↑'; btn.style.boxShadow='none'; }, 1600);
});

/* Little toast */
function toast(msg){
  const el = document.createElement('div'); el.innerText = msg;
  Object.assign(el.style, {position:'fixed',left:'50%',transform:'translateX(-50%)',bottom:'24px',padding:'8px 12px',background:'#06132a',color:'#fff',borderRadius:'8px',zIndex:9999});
  document.body.appendChild(el);
  setTimeout(()=> el.style.opacity='0',2200); setTimeout(()=> el.remove(),2600);
}

/* Init */
function init(){
  renderCases();
  renderInventory();
  renderTop();
  claimDaily();
}
document.addEventListener('DOMContentLoaded', init);


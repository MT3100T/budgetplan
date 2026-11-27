const groups = [
  ['Bolig og forsyning','⌂','#8667e8','Husleje|Boliglån og realkredit|Boligforening / fællesudgifter|Ejendomsskat og kommunale afgifter|El|Varme|Vand og afløb|Renovation|Husforsikring|Service af varmeanlæg|Vedligeholdelse og reparationer|Have og udearealer'],
  ['Bil og transport','◈','#50b4aa','Billån eller leasing|Bilforsikring|Vejafgifter, bompenge og broer|Ejerafgift / vægtafgift|Brændstof|Offentlig opladning|Parkering|Service og reparationer|Dæk og dækskifte|Syn|Vejhjælp|Bilvask|Offentlig transport|Cykel og anden transport'],
  ['Mad og husholdning','◒','#ef9774','Dagligvarer|Takeaway og restaurant|Madpakker og kantine|Rengøringsmidler|Husholdningsartikler|Personlig pleje'],
  ['Børn og fritidsaktiviteter','✿','#de77ad','Vuggestue, børnehave og dagpleje|SFO / fritidsordning|Skolebetaling|Skolemad og udflugter|Sport og kontingenter|Sportsudstyr og stævner|Musik, dans og andre hold|Lejr og ferieaktiviteter|Børnetøj og sko|Bleer og babyudstyr|Lommepenge|Fødselsdage og gaver|Børnebidrag'],
  ['Forsikringer og sundhed','✚','#608ae4','Indboforsikring|Ulykkesforsikring|Livsforsikring|Rejseforsikring|Sundhedsforsikring|Medicin|Tandlæge|Briller og linser|Behandling og fysioterapi'],
  ['Abonnementer og medlemskaber','▤','#a28adf','Internet|Mobilabonnementer|TV og streaming|Apps, spil og cloud|Aviser og magasiner|Fitness og klubber|Fagforening og a-kasse'],
  ['Tøj, hjem og fritid','✧','#d58867','Voksentøj og sko|Frisør|Møbler og boligudstyr|Elektronik|Oplevelser og underholdning|Hobbyer|Ferie og rejser|Jul, gaver og fester|Donationer'],
  ['Kæledyr','♡','#a76eae','Foder og udstyr|Dyrlæge og medicin|Kæledyrsforsikring|Pasning og pleje'],
  ['Øvrige lån og gebyrer','▣','#7a83aa','Studielån|Forbrugslån og afbetaling|Kreditkortafdrag|Bankgebyrer|Anden gæld'],
  ['Opsparing og buffer','✦','#45a17e','Nødopsparing|Børneopsparing|Privat pension|Investering|Opsparing til større køb|Uforudsete udgifter']
];
const periods = [['month','Måned',1],['quarter','Kvartal',3],['year','År',12]];
const key = 'familiebudget-v1';
const fresh = () => ({count:1,currency:'NOK',pump:false,values:{},custom:[]});
const byId = id => document.getElementById(id);
let own = fresh();
try { own = JSON.parse(localStorage.getItem(key)) || own; } catch {}
let budget = own;
let demo = false;

function save() {
  if (!demo) {
    try { localStorage.setItem(key, JSON.stringify(own)); }
    catch { byId('save-status').textContent = 'Browseren kunne ikke gemme budgettet.'; }
  }
}

function monthly(id) {
  const entry = budget.values[id];
  if (!entry) return 0;
  const amount = Number(String(entry.amount).trim().replace(/\s/g,'').replace(',','.'));
  const divisor = periods.find(p => p[0] === entry.period)?.[2] || 1;
  return Number.isFinite(amount) && amount >= 0 ? amount / divisor : 0;
}

function money(amount) {
  return new Intl.NumberFormat('da-DK',{
    style:'currency',currency:budget.currency, currencyDisplay:'narrowSymbol',
    minimumFractionDigits:0,maximumFractionDigits:2
  }).format(Math.abs(amount) < .005 ? 0 : amount);
}

function element(tag, className, label) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (label) node.textContent = label;
  return node;
}

function row(id, label, custom) {
  const wrapper = element('div','row');
  const caption = element('label','',label);
  caption.htmlFor = 'amount-' + id;
  if (custom) {
    const remove = element('button','remove','×');
    remove.type = 'button';
    remove.setAttribute('aria-label','Fjern ' + label);
    remove.onclick = event => {
      event.preventDefault();
      if (budget.values[id]?.amount && !confirm('Vil du fjerne ' + label + ' og det indtastede beløb?')) return;
      budget.custom = budget.custom.filter(item => item.id !== id);
      delete budget.values[id];
      save();
      render();
    };
    caption.append(remove);
  }
  const input = element('input','amount');
  input.id = caption.htmlFor;
  input.inputMode = 'decimal';
  input.placeholder = '0';
  input.autocomplete = 'off';
  input.value = budget.values[id]?.amount || '';
  input.oninput = () => {
    const entry = budget.values[id] ||= {};
    entry.amount = input.value;
    save();
    update();
  };
  const select = element('select','period');
  select.setAttribute('aria-label','Periode for ' + label);
  for (const [value,name] of periods) select.add(new Option(name,value));
  select.value = budget.values[id]?.period || 'month';
  select.onchange = () => {
    const entry = budget.values[id] ||= {};
    entry.period = select.value;
    save();
    update();
  };
  wrapper.append(caption,input,select);
  return wrapper;
}

function items(index) {
  return groups[index][3].split('|').map((label, item) => ({id:index+'-'+item,label}))
    .filter(item => !(budget.pump && item.id === '0-5'))
    .map(item => budget.pump && item.id === '0-4' ? {...item,label:'El inkl. varmepumpe'} : item)
    .concat(budget.custom.filter(item => item.group === index));
}

function render() {
  const open = new Set([...document.querySelectorAll('details[open]')].map(detail => detail.id));
  const wrap = byId('groups');
  wrap.replaceChildren();
  byId('currency').value = budget.currency;
  byId('demo').hidden = demo;
  byId('demo-bar').hidden = !demo;
  byId('reset-panel').hidden = demo;
  for (const button of document.querySelectorAll('[data-count]')) {
    button.setAttribute('aria-pressed',String(+button.dataset.count === budget.count));
  }
  const incomeFields = byId('income-fields');
  incomeFields.replaceChildren(row('income1','Nettoindtægt 1'));
  if (budget.count === 2) incomeFields.append(row('income2','Nettoindtægt 2'));
  incomeFields.append(row('benefits','Børnepenge / børnetilskud'),row('otherIncome','Øvrig indtægt efter skat'));

  groups.forEach(([title,icon,color],index) => {
    const detail = element('details');
    detail.id = 'group-' + index;
    detail.open = open.has(detail.id);
    detail.ontoggle = updateExpand;
    const summary = element('summary');
    const emblem = element('span','icon lavender',icon);
    emblem.style.color = color;
    emblem.setAttribute('aria-hidden','true');
    const total = element('output');
    total.id = 'subtotal-' + index;
    summary.append(emblem,element('b','',title),total);
    const fields = element('div','fields');
    if (index === 0) {
      const heatLabel = element('label');
      const heat = element('input');
      heat.type = 'checkbox';
      heat.checked = budget.pump;
      heat.onchange = () => {
        budget.pump = heat.checked;
        save();
        render();
        byId('heat-pump').focus();
      };
      heat.id = 'heat-pump';
      heatLabel.append(heat,' Varmepumpe: el og varme på samme regning');
      fields.append(heatLabel);
    }
    for (const item of items(index)) fields.append(row(item.id,item.label,item.group !== undefined));
    const add = element('form','custom');
    const name = element('input');
    name.placeholder = 'Tilføj egen post';
    name.setAttribute('aria-label','Ny post i ' + title);
    name.maxLength = 65;
    const submit = element('button','','Tilføj');
    add.onsubmit = event => {
      event.preventDefault();
      const label = name.value.trim();
      if (!label) return;
      const id = 'custom-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      budget.custom.push({id,label,group:index});
      save();
      render();
      byId('amount-' + id).focus();
    };
    add.append(name,submit);
    fields.append(add);
    detail.append(summary,fields);
    wrap.append(detail);
  });
  updateExpand();
  update();
}

function update() {
  const income = monthly('income1') + (budget.count === 2 ? monthly('income2') : 0) + monthly('benefits') + monthly('otherIncome');
  const sums = groups.map((_,index) => items(index).reduce((total,item) => total + monthly(item.id),0));
  const total = sums.reduce((sum,value) => sum + value,0);
  byId('income-total').textContent = money(income);
  byId('expense-total').textContent = money(total - sums.at(-1));
  byId('balance').textContent = money(income - total);
  byId('balance').parentElement.classList.toggle('negative',income - total <= -.005);
  byId('donut-total').textContent = money(total);
  const legend = byId('legend');
  legend.replaceChildren();
  const segments = [];
  let end = 0;
  sums.forEach((value,index) => {
    byId('subtotal-' + index).textContent = money(value);
    if (value <= 0) return;
    const [title,,color] = groups[index];
    const line = element('div','legend-row');
    const dot = element('span','dot');
    dot.style.backgroundColor = color;
    line.append(dot,element('span','',title),element('strong','',money(value)));
    legend.append(line);
    const start = end;
    end += value / total * 100;
    segments.push(color + ' ' + start + '% ' + end + '%');
  });
  byId('donut').style.background = segments.length ? 'conic-gradient(' + segments.join(',') + ')' : '#edeaf6';
  if (!total) legend.append(element('p','legend-empty','Dine kategorier vises her, når du indtaster beløb.'));
}

function updateExpand() {
  byId('expand').textContent = document.querySelector('details:not([open])') ? 'Vis alle poster' : 'Luk alle poster';
}
byId('expand').onclick = () => {
  const open = Boolean(document.querySelector('details:not([open])'));
  document.querySelectorAll('details').forEach(detail => { detail.open = open; });
  updateExpand();
};
for (const button of document.querySelectorAll('[data-count]')) button.onclick = () => {
  budget.count = +button.dataset.count;
  save();
  render();
};
byId('currency').onchange = event => {
  budget.currency = event.target.value;
  save();
  update();
};
byId('demo').onclick = () => {
  demo = true;
  budget = {...fresh(),currency:own.currency,count:2,pump:true};
  const values = {income1:31600,income2:24900,benefits:1550,'0-1':14300,'0-4':1900,'0-6':540,'0-8':750,'1-0':3400,'1-1':830,'1-2':450,'1-4':1250,'2-0':7600,'2-1':850,'3-0':2650,'3-6':720,'4-0':400,'4-5':240,'5-0':450,'5-1':470,'6-6':2300,'7-0':510,'8-0':950,'9-0':2500,'9-1':800};
  for (const [id,amount] of Object.entries(values)) budget.values[id] = {amount};
  render();
  byId('close-demo').focus();
};
byId('close-demo').onclick = () => {
  demo = false;
  budget = own;
  render();
  byId('demo').focus();
};
byId('reset-budget').onclick = () => {
  if (!confirm('Vil du slette alle indtastede beløb, egne poster og budgetvalg? Det kan ikke fortrydes.')) return;
  try {
    localStorage.removeItem(key);
  } catch {
    byId('reset-status').textContent = 'Browseren kunne ikke slette det gemte budget.';
    return;
  }
  own = fresh();
  budget = own;
  byId('groups').replaceChildren();
  render();
  byId('reset-status').textContent = 'Budgettet er nulstillet.';
  byId('amount-income1').focus();
};
byId('print').onclick = () => window.print();
let closedBeforePrint = [];
window.addEventListener('beforeprint', () => {
  closedBeforePrint = [...document.querySelectorAll('details:not([open])')];
  closedBeforePrint.forEach(detail => { detail.open = true; });
});
window.addEventListener('afterprint', () => {
  closedBeforePrint.forEach(detail => { detail.open = false; });
  closedBeforePrint = [];
});
render();

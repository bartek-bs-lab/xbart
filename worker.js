// XBART Upload Test Worker — ISOLATED TEST on workers.dev
// Pricing: XBART starting price list NL 2026
// D1 binding: env.DB (database "xbart-test-db")
// R2 binding: env.PHOTOS (bucket "xbart-test-photos", PRIVATE)
// Admin auth: env.ADMIN_TOKEN (secret) — required for /api/submissions
// Email: DISABLED (test mode)
// NEW: /privacy endpoint with NL/EN/IT privacy policy
// Production worker xbart-booking is NOT touched.

const PR = {
  driveway_normal: {
    nl: "Privé oprit/terras — normaal vuil",
    en: "Private driveway/patio — normal dirt",
    it: "Vialetto privato — sporchezza normale",
    min: 6, max: 8, minOrder: 225, vat: 21, manual: false, ct: "consumer"
  },
  driveway_heavy: {
    nl: "Privé bestrating — zware aanslag/alg",
    en: "Private paving — heavy soiling/algae",
    it: "Lastricata privata — sporchezza pesante",
    min: 8, max: 10, minOrder: 225, vat: 21, manual: false, ct: "consumer"
  },
  parking_open_standard: {
    nl: "Open bedrijfsparking — standaard",
    en: "Open business parking — standard",
    it: "Parcheggio aziendale aperto — standard",
    min: 0.75, max: 1.25, minOrder: 450, vat: 0, manual: false, ct: "business"
  },
  parking_open_intensive: {
    nl: "Open parking — intensief + vlekken",
    en: "Open parking — intensive + stains",
    it: "Parcheggio aperto — intensivo + macchie",
    min: 1.25, max: 2, minOrder: 450, vat: 0, manual: false, ct: "business"
  },
  parking_underground_standard: {
    nl: "Ondergrondse parking — standaard",
    en: "Underground parking — standard",
    it: "Parcheggio sotterraneo — standard",
    min: 1.50, max: 2.50, minOrder: 750, vat: 0, manual: true, ct: "business"
  },
  parking_underground_intensive: {
    nl: "Ondergrondse parking — intensief",
    en: "Underground parking — intensive",
    it: "Parcheggio sotterraneo — intensivo",
    min: 2.50, max: 4, minOrder: 750, vat: 0, manual: true, ct: "business"
  },
  industrial_floor_standard: {
    nl: "Hal/magazijn — normaal vuil",
    en: "Industrial floor — normal dirt",
    it: "Capannone/magazzino — sporchezza normale",
    min: 1.25, max: 2.25, minOrder: 500, vat: 0, manual: false, ct: "business"
  },
  industrial_floor_heavy: {
    nl: "Hal/magazijn — moeilijk vuil/sporen",
    en: "Industrial floor — heavy dirt/tracks",
    it: "Capannone/magazzino — sporchezza pesante",
    min: 2.25, max: 3.75, minOrder: 500, vat: 0, manual: false, ct: "business"
  },
  oil_stains_addon: {
    nl: "Olievlekken — aanvullend op groter werk",
    en: "Oil stains — add-on to larger job",
    it: "Macchie d'olio — extra su lavoro grande",
    min: 25, max: 60, minOrder: 0, vat: 0, manual: true, ct: "business"
  },
  oil_stains_standalone: {
    nl: "Olievlekken — zelfstandig bezoek",
    en: "Oil stains — standalone visit",
    it: "Macchie d'olio — visita autonoma",
    min: 0, max: 0, minOrder: 225, vat: 0, manual: true, ct: "business"
  }
};

const SERVICE_GROUPS = [
  { label: { nl: "Particulier (incl. BTW)", en: "Consumer (incl. VAT)", it: "Privato (incl. IVA)" }, services: ["driveway_normal", "driveway_heavy"] },
  { label: { nl: "Zakelijk — parking (excl. BTW)", en: "Business — parking (excl. VAT)", it: "Aziendale — parcheggio (escl. IVA)" }, services: ["parking_open_standard", "parking_open_intensive", "parking_underground_standard", "parking_underground_intensive"] },
  { label: { nl: "Zakelijk — hal/magazijn (excl. BTW)", en: "Business — industrial (excl. VAT)", it: "Aziendale — capannone (escl. IVA)" }, services: ["industrial_floor_standard", "industrial_floor_heavy"] },
  { label: { nl: "Olievlekken (excl. BTW)", en: "Oil stains (excl. VAT)", it: "Macchie d'olio (escl. IVA)" }, services: ["oil_stains_addon", "oil_stains_standalone"] }
];

const SV = Object.keys(PR);
const MAX_PHOTOS = 5;
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_REQUEST_BYTES = 36 * 1024 * 1024;
const MAX_TEST_SUBMISSIONS = 100;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const I18N = {
  nl: {
    title: "XBART Cleaning \u2014 Offerte", heading: "XBART Cleaning \u2014 Offerte",
    info: "Indicatieve prijzen \u2014 particulier incl. 21% BTW, zakelijk excl. BTW. Ondergrondse parking & olie: op aanvraag.",
    service: "Dienst", postal: "Postcode", area: "Oppervlak m\u00b2", areaOptional: "(optioneel bij op aanvraag)",
    drain: "Type afvoer", photos: "Foto's (max 5)", photoHint: "Klik of sleep foto's hierheen",
    photoWarn: "Foto-opslag naar R2: actief (priv\u00e9 bucket)",
    photoErrType: "is geen afbeelding (alleen JPG, PNG, GIF, WebP)", photoErrSize: "is groter dan 5 MB",
    photoLimit: "Maximaal 5 foto's toegestaan",
    name: "Naam", email: "E-mail", phone: "Telefoon", clientType: "Type klant",
    consumer: "Particulier", business: "Zakelijk", submit: "Versturen", sent: "Verzonden!",
    drainTypes: { street: "Straatkolom", sewer: "Riool", soil: "Bodem", none: "Geen", unknown: "Weet niet" },
    testMode: "TESTOMGEVING \u2014 alleen fictieve gegevens; e-mail uitgeschakeld; maximaal 100 testaanvragen",
    resultPrice: "Prijs:", resultPhotos: "Foto's ontvangen:", resultSaved: "opgeslagen naar R2:",
    resultEmail: "E-mail verzonden:", resultYes: "JA", resultNo: "NEE", resultNoEmail: "NEE (uitgeschakeld)",
    resultD1: "inzending opgeslagen in D1:", inclVat: "incl. 21% BTW", exclVat: "excl. BTW",
    quoteOnRequest: "Prijs op aanvraag \u2014 we nemen contact op na beoordeling van de foto's",
    privacyLink: "Privacyverklaring", backToForm: "Terug naar het formulier",
    privacyTestNotice: "TESTVERSIE — conceptbeleid. Gebruik alleen fictieve gegevens; automatische verwijdering is nog niet actief."
  },
  en: {
    title: "XBART Cleaning \u2014 Quote", heading: "XBART Cleaning \u2014 Quote",
    info: "Indicative prices \u2014 consumer incl. 21% VAT, business excl. VAT. Underground parking & oil: on request.",
    service: "Service", postal: "Postcode", area: "Area m\u00b2", areaOptional: "(optional for on-request services)",
    drain: "Drain type", photos: "Photos (max 5)", photoHint: "Click or drop photos here",
    photoWarn: "Photo storage to R2: active (private bucket)",
    photoErrType: "is not an image (only JPG, PNG, GIF, WebP allowed)", photoErrSize: "is larger than 5 MB",
    photoLimit: "Maximum 5 photos allowed",
    name: "Name", email: "Email", phone: "Phone", clientType: "Client type",
    consumer: "Consumer", business: "Business", submit: "Send", sent: "Sent!",
    drainTypes: { street: "Street column", sewer: "Sewer", soil: "Soil", none: "None", unknown: "Don't know" },
    testMode: "TEST MODE \u2014 fictional data only; email disabled; limited to 100 test submissions",
    resultPrice: "Price:", resultPhotos: "Photos received:", resultSaved: "saved to R2:",
    resultEmail: "Email sent:", resultYes: "YES", resultNo: "NO", resultNoEmail: "NO (disabled)",
    resultD1: "submission saved to D1:", inclVat: "incl. 21% VAT", exclVat: "excl. VAT",
    quoteOnRequest: "Price on request \u2014 we'll contact you after reviewing the photos",
    privacyLink: "Privacy Policy", backToForm: "Back to form",
    privacyTestNotice: "TEST VERSION — draft policy. Use fictional data only; automatic deletion is not active yet."
  },
  it: {
    title: "XBART Cleaning \u2014 Preventivo", heading: "XBART Cleaning \u2014 Preventivo",
    info: "Prezzi indicativi \u2014 privato incl. 21% IVA, aziendale escl. IVA. Parcheggio sotterraneo & olio: su richiesta.",
    service: "Servizio", postal: "Codice postale", area: "Superficie m\u00b2", areaOptional: "(facoltativo per servizi su richiesta)",
    drain: "Tipo scarico", photos: "Foto (max 5)", photoHint: "Clicca o trascina le foto qui",
    photoWarn: "Salvataggio foto su R2: attivo (bucket privato)",
    photoErrType: "non \u00e8 un'immagine (solo JPG, PNG, GIF, WebP)", photoErrSize: "supera i 5 MB",
    photoLimit: "Massimo 5 foto consentite",
    name: "Nome", email: "Email", phone: "Telefono", clientType: "Tipo cliente",
    consumer: "Privato", business: "Azienda", submit: "Invia", sent: "Inviato!",
    drainTypes: { street: "Colonna stradale", sewer: "Fognatura", soil: "Suolo", none: "Nessuno", unknown: "Non lo so" },
    testMode: "MODALIT\u00c0 TEST \u2014 solo dati fittizi; email disattivata; massimo 100 richieste di test",
    resultPrice: "Prezzo:", resultPhotos: "Foto ricevute:", resultSaved: "salvate su R2:",
    resultEmail: "Email inviata:", resultYes: "S\u00ec", resultNo: "NO", resultNoEmail: "NO (disabilitata)",
    resultD1: "invio salvato in D1:", inclVat: "incl. 21% IVA", exclVat: "escl. IVA",
    quoteOnRequest: "Prezzo su richiesta \u2014 vi contatteremo dopo aver valutato le foto",
    privacyLink: "Informativa sulla privacy", backToForm: "Torna al modulo",
    privacyTestNotice: "VERSIONE TEST — bozza. Usa solo dati fittizi; la cancellazione automatica non è ancora attiva."
  }
};

// --- Privacy policy text (NL/EN/IT) ---
const PRIVACY = {
  nl: {
    title: "Privacyverklaring — XBART Technical Cleaning",
    updated: "Laatst bijgewerkt: 31 oktober 2026",
    sections: [
      { h: "Wie zijn wij?", p: "XBART Technical Cleaning, gevestigd in Rotterdam, Nederland, KvK-nummer 96323817, is verantwoordelijk voor de verwerking van persoonsgegevens via deze website en het offerteformulier. Contact: telefoon +31 6 57670329, e-mail info@xbartcleaning.nl. Voor privacyvragen: privacy@xbartcleaning.nl." },
      { h: "Welke gegevens verwerken wij?", p: "Wanneer u een offerte aanvraagt, kunnen wij uw naam, e-mailadres, telefoonnummer, postcode, gekozen dienst, geschatte oppervlakte, informatie over de locatie en eventuele ge\u00fcploade foto's verwerken. We verwerken deze gegevens om uw aanvraag te beoordelen, contact met u op te nemen en \u2014 wanneer u daarmee verdergaat \u2014 de werkzaamheden voor te bereiden." },
      { h: "Waarom en op welke grondslag?", p: "We gebruiken uw gegevens om op uw verzoek een offerte op te stellen en v\u00f3\u00f3r een mogelijke overeenkomst contact met u op te nemen. De grondslag hiervoor is het nemen van precontractuele maatregelen. Gegevens die nodig zijn voor onze administratie verwerken wij om aan wettelijke verplichtingen te voldoen. Technische gegevens kunnen worden gebruikt om de website te beveiligen en misbruik te voorkomen." },
      { h: "Met wie delen wij gegevens?", p: "De website en het aanvraagformulier kunnen gebruikmaken van diensten van Cloudflare voor hosting, beveiliging en opslag. We delen gegevens alleen met andere dienstverleners wanneer die nodig zijn voor de aanvraag of uitvoering van onze dienstverlening." },
      { h: "Hoe lang bewaren wij gegevens?", p: "Niet-afgeronde of afgewezen aanvragen: 6 maanden na laatste contact. Foto's: 3 maanden na de beslissing over de offerte of na afronding van de werkzaamheden, tenzij ze nodig zijn voor het afhandelen van een geschil. Factuur- en administratiegegevens: 7 jaar volgens wettelijke bewaarplicht (Belastingdienst). Voor sommige documenten gelden langere termijnen. Dit betreft administratieve gegevens, niet alle foto's en aanvragen." },
      { h: "Uw rechten", p: "U kunt ons vragen om inzage, correctie of verwijdering van uw persoonsgegevens en, waar van toepassing, beperking van de verwerking, overdracht of bezwaar. Stuur uw verzoek naar privacy@xbartcleaning.nl. U kunt ook een klacht indienen bij de Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl)." },
      { h: "Cookies en vergelijkbare technieken", p: "We plaatsen geen advertentie cookies of marketingtrackers op deze website. Onze website kan gebruikmaken van beveiligingsdiensten van Cloudflare die technische cookies of vergelijkbare technieken kunnen inzetten. Welke cookies dat concreet zijn, hangt af van de actieve beveiligingsinstellingen. U kunt de huidige cookies bekijken in de instellingen van uw browser. Als we in de toekomst niet-essenti\u00eble cookies gaan gebruiken, zullen we hiervoor eerst toestemming vragen via een cookiebanner." }
    ]
  },
  en: {
    title: "Privacy Policy — XBART Technical Cleaning",
    updated: "Last updated: 31 October 2026",
    sections: [
      { h: "Who are we?", p: "XBART Technical Cleaning, based in Rotterdam, Netherlands, KvK number 96323817, is responsible for processing personal data via this website and the quote form. Contact: phone +31 6 57670329, email info@xbartcleaning.nl. For privacy questions: privacy@xbartcleaning.nl." },
      { h: "What data do we process?", p: "When you request a quote, we may process your name, email address, phone number, postcode, chosen service, estimated area, information about the location and any uploaded photos. We process this data to assess your request, contact you and \u2014 if you proceed \u2014 prepare the work." },
      { h: "Why and on what basis?", p: "We use your data to prepare a quote at your request and to contact you prior to a possible agreement. The basis is taking pre-contractual measures. Data needed for our administration is processed to meet legal obligations. Technical data may be used to secure the website and prevent abuse." },
      { h: "With whom do we share data?", p: "The website and the request form may use Cloudflare services for hosting, security and storage. We only share data with other providers when necessary for the request or execution of our service." },
      { h: "How long do we keep data?", p: "Incomplete or rejected requests: 6 months after last contact. Photos: 3 months after the quote decision or completion of the work, unless needed for dispute resolution. Invoice and accounting records: 7 years per legal retention requirement (Belastingdienst). Some documents require longer retention. This concerns administrative records, not all photos and requests." },
      { h: "Your rights", p: "You can ask us for access, correction or deletion of your personal data and, where applicable, restriction of processing, data portability or objection. Send your request to privacy@xbartcleaning.nl. You can also file a complaint with the Dutch Data Protection Authority (autoriteitpersoonsgegevens.nl)." },
      { h: "Cookies and similar technologies", p: "We do not place advertising cookies or marketing trackers on this website. Our website may use Cloudflare security services that can deploy technical cookies or similar technologies. Which cookies are involved depends on the active security settings. You can view current cookies in your browser settings. If we use non-essential cookies in the future, we will first ask for consent via a cookie banner." }
    ]
  },
  it: {
    title: "Informativa sulla privacy — XBART Technical Cleaning",
    updated: "Ultimo aggiornamento: 31 ottobre 2026",
    sections: [
      { h: "Chi siamo?", p: "XBART Technical Cleaning, con sede a Rotterdam, Paesi Bassi, numero KvK 96323817, \u00e8 responsabile del trattamento dei dati personali tramite questo sito web e il modulo di preventivo. Contatto: telefono +31 6 57670329, email info@xbartcleaning.nl. Per questioni sulla privacy: privacy@xbartcleaning.nl." },
      { h: "Quali dati trattiamo?", p: "Quando richiedi un preventivo, possiamo trattare il tuo nome, indirizzo email, numero di telefono, codice postale, servizio scelto, superficie stimata, informazioni sulla posizione e eventuali foto caricate. Trattiamo questi dati per valutare la tua richiesta, contattarti e \u2014 se procedi \u2014 preparare i lavori." },
      { h: "Perch\u00e9 e su quale base?", p: "Utilizziamo i tuoi dati per preparare un preventivo su tua richiesta e per contattarti prima di un possibile accordo. La base \u00e8 l'adozione di misure precontrattuali. I dati necessari per la nostra amministrazione sono trattati per adempiere obblighi di legge. I dati tecnici possono essere utilizzati per proteggere il sito e prevenire abusi." },
      { h: "Con chi condividiamo i dati?", p: "Il sito web e il modulo di richiesta possono utilizzare servizi Cloudflare per hosting, sicurezza e archiviazione. Condividiamo i dati con altri fornitori solo quando necessario per la richiesta o l'esecuzione del nostro servizio." },
      { h: "Per quanto tempo conserviamo i dati?", p: "Richieste incomplete o rifiutate: 6 mesi dall'ultimo contatto. Foto: 3 mesi dalla decisione sul preventivo o dal completamento dei lavori, a meno che siano necessarie per la risoluzione di controversie. Fatture e documenti contabili: 7 anni secondo l'obbligo legale di conservazione (Belastingdienst). Alcuni documenti richiedono tempi pi\u00f9 lunghi. Questo riguarda i documenti amministrativi, non tutte le foto e le richieste." },
      { h: "I tuoi diritti", p: "Puoi chiederci l'accesso, la correzione o la cancellazione dei tuoi dati personali e, ove applicabile, la limitazione del trattamento, la portabilit\u00e0 o l'opposizione. Invia la tua richiesta a privacy@xbartcleaning.nl. Puoi anche presentare un reclamo all'Autorit\u00e0 garante per la protezione dei dati personali (autoriteitpersoonsgegevens.nl)." },
      { h: "Cookie e tecnologie simili", p: "Non utilizziamo cookie pubblicitari o tracker di marketing su questo sito. Il nostro sito pu\u00f2 utilizzare servizi di sicurezza Cloudflare che possono impiegare cookie tecnici o tecnologie simili. Quali cookie siano coinvolti dipende dalle impostazioni di sicurezza attive. Puoi visualizzare i cookie attuali nelle impostazioni del tuo browser. Se in futuro utilizzeremo cookie non essenziali, chiederemo prima il consenso tramite un banner." }
    ]
  }
};

function form(lang, env) {
  const t = I18N[lang] || I18N.nl;
  const svcOpts = SERVICE_GROUPS.map(g => {
    const opts = g.services.map(k =>
      `<option value="${k}" data-ct="${PR[k].ct}">${PR[k][lang] || PR[k].nl}</option>`
    ).join("");
    return `<optgroup label="${g.label[lang] || g.label.nl}">${opts}</optgroup>`;
  }).join("");
  const drainOpts = Object.entries(t.drainTypes).map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
  const active = (code) => lang === code ? "a" : "";

  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t.title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,sans-serif;background:#f0f4f8;color:#1a1a2e;line-height:1.5}
.c{max-width:520px;margin:24px auto;padding:16px}
.ca{background:#fff;border-radius:14px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,.08)}
.lb{display:flex;gap:6px;margin-bottom:16px}
.lb button{flex:1;padding:7px;border:2px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;font-size:.85rem;font-weight:600}
.lb button.a{border-color:#2563eb;background:#2563eb;color:#fff}
h1{font-size:1.2rem;margin-bottom:10px}
.fg{margin-bottom:12px}
label{display:block;font-size:.8rem;font-weight:600;margin-bottom:4px;color:#444}
input,select{width:100%;padding:9px;border:2px solid #ddd;border-radius:7px;font-size:.9rem}
.ua{border:2px dashed #bbb;border-radius:10px;padding:20px;text-align:center;cursor:pointer;color:#888;font-size:.85rem;transition:border-color .2s,background .2s}
.ua.drag{border-color:#2563eb;background:#eff6ff;color:#2563eb}
.pr{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}
.pr .thumb{position:relative;width:60px;height:60px}
.pr .thumb img{width:60px;height:60px;object-fit:cover;border-radius:6px}
.pr .thumb .rm{position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:#dc2626;color:#fff;border:none;font-size:12px;line-height:18px;text-align:center;cursor:pointer;padding:0}
.bt{width:100%;padding:12px;border:none;border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer;background:#2563eb;color:#fff;margin-top:8px}
.ib{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px;margin-bottom:12px;font-size:.78rem;color:#1e40af}
.wb{background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:10px;margin-bottom:12px;font-size:.78rem;color:#065f46}
.err{background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:8px;margin-top:6px;font-size:.78rem;color:#dc2626;display:none}
.err.show{display:block}
.rs{display:none;padding:20px;border-radius:10px;background:#f0fdf4;border:2px solid #bbf7d0;margin-top:16px}
.rs.a{display:block}
.tm{background:#f3e8ff;border:1px solid #c084fc;border-radius:8px;padding:8px;margin-bottom:12px;font-size:.75rem;color:#6b21a8;text-align:center}
.opt-hint{font-size:.7rem;color:#999;font-weight:400;margin-left:4px}
.footer{text-align:center;margin-top:16px;font-size:.78rem;color:#666}
.footer a{color:#2563eb;text-decoration:none}
.footer a:hover{text-decoration:underline}
</style></head><body><div class="c"><div class="ca">
<div class="tm">${t.testMode}</div>
<div class="lb">
<button class="${active("nl")}" onclick="location.href='/?lang=nl'">NL</button>
<button class="${active("en")}" onclick="location.href='/?lang=en'">EN</button>
<button class="${active("it")}" onclick="location.href='/?lang=it'">IT</button>
</div>
<h1>${t.heading}</h1>
<div class="ib">${t.info}</div>
<div class="wb">${t.photoWarn}</div>
<form id="f">
<div class="fg"><label>${t.service}</label><select id="sv">${svcOpts}</select></div>
<div class="fg"><label>${t.postal}</label><input id="pc"></div>
<div class="fg"><label>${t.area} <span class="opt-hint">${t.areaOptional}</span></label><input type="number" id="ar" min="1" step="0.5"></div>
<div class="fg"><label>${t.drain}</label><select id="drt">${drainOpts}</select></div>
<div class="fg"><label>${t.photos}</label><div class="ua" id="ua">${t.photoHint}</div>
<input type="file" id="pi" accept="image/jpeg,image/png,image/gif,image/webp" multiple style="display:none">
<div class="pr" id="pr"></div>
<div class="err" id="perr"></div></div>
<div class="fg"><label>${t.name}</label><input id="nm"></div>
<div class="fg"><label>${t.email}</label><input type="email" id="em"></div>
<div class="fg"><label>${t.phone}</label><input id="ph"></div>
<div class="fg"><select id="ct"><option value="consumer">${t.consumer}</option><option value="business">${t.business}</option></select></div>
<button type="button" class="bt" onclick="sf()">${t.submit}</button>
</form>
<div class="rs" id="rs"><h2 style="color:#16a34a">${t.sent}</h2><p id="pp" style="white-space:pre-line"></p></div>
<div class="footer"><a href="/privacy?lang=${lang}">${t.privacyLink}</a></div>
</div></div>
<script>
var ua=document.getElementById('ua'),pi=document.getElementById('pi'),pr=document.getElementById('pr'),perr=document.getElementById('perr'),sv=document.getElementById('sv'),ct=document.getElementById('ct');
var photos=[];
var pendingPhotos=0;
var ERR_TYPE=${JSON.stringify(t.photoErrType)};
var ERR_SIZE=${JSON.stringify(t.photoErrSize)};
var ERR_LIMIT=${JSON.stringify(t.photoLimit)};
function showErr(msg){perr.textContent=msg;perr.classList.add('show');setTimeout(function(){perr.classList.remove('show')},4000)}
function clearErr(){perr.classList.remove('show')}
sv.onchange=function(){var opt=sv.options[sv.selectedIndex];var c=opt.getAttribute('data-ct');if(c)ct.value=c};
ua.onclick=function(){pi.click()};
ua.addEventListener('dragover',function(e){e.preventDefault();ua.classList.add('drag')});
ua.addEventListener('dragleave',function(e){e.preventDefault();ua.classList.remove('drag')});
ua.addEventListener('drop',function(e){e.preventDefault();ua.classList.remove('drag');handleFiles(e.dataTransfer.files)});
pi.onchange=function(e){handleFiles(e.target.files);pi.value=''};
function handleFiles(fileList){
  clearErr();
  Array.from(fileList).forEach(function(x){
    if(photos.filter(function(p){return p!==null}).length+pendingPhotos>=${MAX_PHOTOS}){showErr(x.name+': '+ERR_LIMIT);return}
    if(!x.type.startsWith('image/')){showErr(x.name+' '+ERR_TYPE);return}
    if(x.size>${MAX_SIZE}){showErr(x.name+' '+ERR_SIZE);return}
    var r=new FileReader();
    pendingPhotos++;
    r.onload=function(ev){
      pendingPhotos--;
      var idx=photos.push(ev.target.result)-1;
      var wrap=document.createElement('div');wrap.className='thumb';
      var img=document.createElement('img');img.src=ev.target.result;
      var rm=document.createElement('button');rm.className='rm';rm.innerHTML='&times;';
      rm.onclick=function(){photos[idx]=null;wrap.remove()};
      wrap.appendChild(img);wrap.appendChild(rm);pr.appendChild(wrap);
    };
    r.onerror=function(){pendingPhotos--;showErr(x.name+': could not be read')};
    r.readAsDataURL(x);
  });
}
function sf(){
  var ph=photos.filter(function(p){return p!==null});
  var g=function(id){var el=document.getElementById(id);if(!el)return null;return el.value||null};
  var data={lang:"${lang}",service:g('sv'),postal_code:g('pc'),area_m2:parseFloat(g('ar'))||null,
  drain_type:g('drt'),client_name:g('nm'),client_email:g('em'),client_phone:g('ph'),
  client_type:g('ct'),photos:ph};
  fetch('/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
  .then(function(r){return r.json()}).then(function(d){
    document.getElementById('f').style.display='none';
    document.getElementById('rs').classList.add('a');
    var p=document.getElementById('pp');
    var T=${JSON.stringify({price:t.resultPrice,photos:t.resultPhotos,saved:t.resultSaved,email:t.resultEmail,yes:t.resultYes,no:t.resultNo,noEmail:t.resultNoEmail,d1:t.resultD1,quoteOnRequest:t.quoteOnRequest,inclVat:t.inclVat,exclVat:t.exclVat})};
    var lines=[];
    if(d.manualQuote){lines.push(T.quoteOnRequest)}
    else if(d.prelimPrice){lines.push(T.price+' '+d.prelimPrice+' '+(d.priceLabel==='brutto'?T.inclVat:T.exclVat))}
    lines.push(T.photos+' '+d.photoCount);
    lines.push(T.d1+' '+(d.d1Saved?T.yes:T.no));
    lines.push(T.saved+' '+(d.photoSaved?T.yes:T.no));
    lines.push(T.email+' '+(d.emailSent?T.yes:T.noEmail));
    p.textContent=lines.join('\\n');
  }).catch(function(err){alert(err.message)});
}
</script></body></html>`;
}

function privacyPage(lang) {
  const t = I18N[lang] || I18N.nl;
  const pr = PRIVACY[lang] || PRIVACY.nl;
  const active = (code) => lang === code ? "a" : "";
  const sections = pr.sections.map(s => `<h2>${s.h}</h2><p>${s.p}</p>`).join("");

  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${pr.title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,sans-serif;background:#f0f4f8;color:#1a1a2e;line-height:1.6}
.c{max-width:640px;margin:24px auto;padding:16px}
.ca{background:#fff;border-radius:14px;padding:32px;box-shadow:0 4px 20px rgba(0,0,0,.08)}
.lb{display:flex;gap:6px;margin-bottom:20px}
.lb button{flex:1;padding:7px;border:2px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;font-size:.85rem;font-weight:600}
.lb button.a{border-color:#2563eb;background:#2563eb;color:#fff}
h1{font-size:1.3rem;margin-bottom:4px}
.updated{font-size:.8rem;color:#888;margin-bottom:20px}
h2{font-size:1rem;margin-top:18px;margin-bottom:6px;color:#1e40af}
p{font-size:.88rem;margin-bottom:12px;color:#333}
.test-notice{background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:10px;margin:12px 0;font-size:.8rem;color:#9a3412}
.footer{text-align:center;margin-top:24px;font-size:.82rem}
.footer a{color:#2563eb;text-decoration:none}
.footer a:hover{text-decoration:underline}
</style></head><body><div class="c"><div class="ca">
<div class="lb">
<button class="${active("nl")}" onclick="location.href='/privacy?lang=nl'">NL</button>
<button class="${active("en")}" onclick="location.href='/privacy?lang=en'">EN</button>
<button class="${active("it")}" onclick="location.href='/privacy?lang=it'">IT</button>
</div>
<h1>${pr.title}</h1>
<div class="updated">${pr.updated}</div>
${sections}
<div class="test-notice">${t.privacyTestNotice}</div>
<div class="footer"><a href="/?lang=${lang}">${t.backToForm}</a></div>
</div></div></body></html>`;
}

function J(d, s) {
  return new Response(JSON.stringify(d), {
    status: s || 200,
    headers: { "Content-Type": "application/json;charset=utf-8" }
  });
}

function requestError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function readJsonLimited(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw requestError(415, "Expected application/json");
  }
  if (!request.body) throw requestError(400, "Request body is required");

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.byteLength;
    if (total > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw requestError(413, "Request exceeds the 36 MiB test limit");
    }
    chunks.push(part.value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    throw requestError(400, "Request body must contain valid JSON");
  }
}

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!m || !ALLOWED_IMAGE_TYPES.has(m[1])) return null;
  try {
    const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
    return { mime: m[1], bytes };
  } catch {
    return null;
  }
}

function stringField(data, key, maxLength) {
  const value = data[key];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw requestError(400, `${key} must be text`);
  const cleaned = value.trim();
  if (cleaned.length > maxLength) throw requestError(400, `${key} is too long`);
  return cleaned || null;
}

async function ensureSchema(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT (datetime('now')),
      lang TEXT, service TEXT, postal_code TEXT, area_m2 REAL,
      drain_type TEXT, client_name TEXT, client_email TEXT, client_phone TEXT,
      client_type TEXT, status TEXT, prelim_price_min REAL, prelim_price_max REAL,
      price_label TEXT, manual_quote INTEGER DEFAULT 0, photo_count INTEGER, photo_keys TEXT
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS test_limits (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      submissions INTEGER NOT NULL DEFAULT 0
    )
  `).run();
  await env.DB.prepare("INSERT OR IGNORE INTO test_limits (id, submissions) SELECT 1, COUNT(*) FROM submissions").run();
  const cols = ["ALTER TABLE submissions ADD COLUMN price_label TEXT", "ALTER TABLE submissions ADD COLUMN manual_quote INTEGER DEFAULT 0"];
  for (const sql of cols) { try { await env.DB.prepare(sql).run(); } catch(e) {} }
}

function checkAdmin(request, env) {
  if (!env.ADMIN_TOKEN) return { ok: false, code: 404 };
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token !== env.ADMIN_TOKEN) return { ok: false, code: 401 };
  return { ok: true };
}

async function submit(request, env) {
  let d;
  try {
    d = await readJsonLimited(request);
  } catch (error) {
    return J({ error: error.message }, error.status || 400);
  }
  if (!d || typeof d !== "object" || Array.isArray(d)) return J({ error: "Request must be a JSON object" }, 400);
  if (!env.DB || !env.PHOTOS) return J({ error: "Test storage is not fully configured; nothing was saved" }, 503);

  let clientName, clientEmail, clientPhone, postalCode, drainType;
  try {
    clientName = stringField(d, "client_name", 120);
    clientEmail = stringField(d, "client_email", 254);
    clientPhone = stringField(d, "client_phone", 40);
    postalCode = stringField(d, "postal_code", 16);
    drainType = stringField(d, "drain_type", 32);
  } catch (error) {
    return J({ error: error.message }, error.status || 400);
  }
  if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    return J({ error: "client_email is not a valid email address" }, 400);
  }

  const lang = ["nl", "en", "it"].includes(d.lang) ? d.lang : "nl";
  const service = typeof d.service === "string" ? d.service : "";
  const pi = PR[service];
  if (!pi) return J({ error: "Unknown service" }, 400);

  let area = null;
  if (d.area_m2 !== undefined && d.area_m2 !== null && d.area_m2 !== "") {
    area = Number(d.area_m2);
    if (!Number.isFinite(area) || area < 0 || area > 100000) {
      return J({ error: "area_m2 must be a number between 0 and 100000" }, 400);
    }
  }

  let postal = postalCode;
  if (postal && !/^\d{4}\s?[A-Za-z]{2}$/.test(postal)) {
    return J({ error: "Enter a valid Dutch postcode, for example 3011 AB" }, 400);
  }
  const photos = d.photos === undefined || d.photos === null ? [] : d.photos;
  if (!Array.isArray(photos)) return J({ error: "photos must be an array" }, 400);
  if (photos.length > MAX_PHOTOS) return J({ error: `Maximum ${MAX_PHOTOS} photos allowed` }, 413);
  const parsedPhotos = [];
  for (let i = 0; i < photos.length; i++) {
    const parsed = parseDataUrl(photos[i]);
    if (!parsed) return J({ error: `Photo ${i + 1} must be a valid JPG, PNG, WebP, or GIF image` }, 400);
    if (parsed.bytes.byteLength > MAX_SIZE) return J({ error: `Photo ${i + 1} exceeds the 5 MiB limit` }, 413);
    if (parsed.bytes.byteLength === 0) return J({ error: `Photo ${i + 1} is empty` }, 400);
    parsedPhotos.push(parsed);
  }

  let mn = 0, mx = 0, manualQuote = false, priceLabel = "netto";
  if (pi.manual) {
    manualQuote = true;
  } else if (pi.min > 0 && area) {
    mn = pi.min * area; mx = pi.max * area;
    if (mn < pi.minOrder) mn = pi.minOrder;
    if (mx < pi.minOrder) mx = pi.minOrder;
    priceLabel = pi.vat > 0 ? "brutto" : "netto";
  }
  const photoCount = parsedPhotos.length;
  const cmpl = clientName && clientEmail && (area || pi.manual);
  const st = manualQuote ? (cmpl ? "manual_quote" : "draft") : (cmpl ? "complete" : "draft");
  const subId = "test-" + crypto.randomUUID();
  const photoKeys = [];
  try {
    await ensureSchema(env);
    const reservation = await env.DB.prepare(
      "UPDATE test_limits SET submissions = submissions + 1 WHERE id = 1 AND submissions < ? RETURNING submissions"
    ).bind(MAX_TEST_SUBMISSIONS).first();
    if (!reservation) {
      return J({ error: `Test submission limit reached (${MAX_TEST_SUBMISSIONS}); no data was saved` }, 429);
    }
    try {
      await env.DB.prepare(
        "INSERT INTO submissions (id, lang, service, postal_code, area_m2, drain_type, client_name, client_email, client_phone, client_type, status, prelim_price_min, prelim_price_max, price_label, manual_quote, photo_count, photo_keys) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(subId, lang, service, postal, area,
        drainType, clientName, clientEmail, clientPhone,
        ["consumer", "business"].includes(d.client_type) ? d.client_type : pi.ct, st,
        mn || null, mx || null, priceLabel, manualQuote ? 1 : 0, photoCount,
        JSON.stringify(photoKeys)).run();
    } catch (error) {
      await env.DB.prepare("UPDATE test_limits SET submissions = submissions - 1 WHERE id = 1 AND submissions > 0").run();
      throw error;
    }
  } catch (error) {
    return J({ error: "Could not save the test submission to D1" }, 503);
  }

  if (parsedPhotos.length > 0) {
    try {
      for (let i = 0; i < parsedPhotos.length; i++) {
        const parsed = parsedPhotos[i];
        const ext = parsed.mime.split("/")[1];
        const key = `submissions/${subId}/photo-${i}.${ext}`;
        await env.PHOTOS.put(key, parsed.bytes, { httpMetadata: { contentType: parsed.mime } });
        photoKeys.push(key);
      }
      await env.DB.prepare("UPDATE submissions SET photo_keys = ? WHERE id = ?")
        .bind(JSON.stringify(photoKeys), subId).run();
    } catch (error) {
      await Promise.allSettled(photoKeys.map(key => env.PHOTOS.delete(key)));
      await env.DB.prepare("UPDATE submissions SET photo_count = 0, photo_keys = '[]' WHERE id = ?")
        .bind(subId).run().catch(() => {});
      return J({ error: "The test submission was saved, but photo storage failed" }, 503);
    }
  }
  return J({
    id: subId, status: st, lang: lang,
    prelimPrice: manualQuote ? null : (mn > 0 ? `EUR ${mn} - EUR ${mx}` : null),
    priceLabel: manualQuote ? null : priceLabel, manualQuote: manualQuote,
    photoCount: photoCount, photoSaved: photoKeys.length === photoCount && photoCount > 0,
    d1Saved: true, emailSent: false,
    note: manualQuote ? "Manual quote required — price determined after photo review." : "Test mode: email disabled."
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === "OPTIONS") {
      return new Response(null, { status: 405 });
    }
    if (method === "GET") {
      if (path === "/" || path === "/form") {
        const lang = url.searchParams.get("lang") || "nl";
        const valid = ["nl", "en", "it"].includes(lang) ? lang : "nl";
        return new Response(form(valid, env), { headers: { "Content-Type": "text/html;charset=utf-8" } });
      }
      if (path === "/privacy") {
        const lang = url.searchParams.get("lang") || "nl";
        const valid = ["nl", "en", "it"].includes(lang) ? lang : "nl";
        return new Response(privacyPage(valid), { headers: { "Content-Type": "text/html;charset=utf-8" } });
      }
      if (path === "/api/submissions") {
        const auth = checkAdmin(request, env);
        if (!auth.ok) {
          return new Response(JSON.stringify({ error: auth.code === 401 ? "Unauthorized" : "Not found" }), {
            status: auth.code, headers: { "Content-Type": "application/json" }
          });
        }
        if (!env.DB) return J({ error: "D1 not configured" }, 500);
        try {
          const r = await env.DB.prepare("SELECT id, created_at, lang, service, status, manual_quote, photo_count FROM submissions ORDER BY created_at DESC LIMIT 50").all();
          return J(r.results);
        } catch(e) { return J({ error: e.message }, 500); }
      }
    }
    if (method === "POST" && path === "/api/submit") return submit(request, env);
    return new Response("Not found", { status: 404 });
  }
};


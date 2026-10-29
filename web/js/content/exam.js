// Exam facts and domain weights. Data only.
const EXAM = {
  code:'CLF-C02', date:'2026-11-30',
  questions:65, scored:50, minutes:90,
  pass:700, scale:1000, cost:'$100', retakeDays:14
};
const DOMAINS = {
  cc:   {name:'Cloud Concepts',            short:'Concepts', w:24},
  sec:  {name:'Security & Compliance',     short:'Security', w:30},
  tech: {name:'Cloud Technology & Services', short:'Tech',   w:34},
  bill: {name:'Billing, Pricing & Support', short:'Billing', w:12}
};

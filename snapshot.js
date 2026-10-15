/* Snapshot of HubSpot data from Thu 15 Oct 2026. Shown only when the live connection is unavailable. */
var SDRS=[
 {k:'james',name:'James Crawford',short:'James',pod:'Sales Pod 1',lead:'Jason Baaphy',
  assigned:189,contacted:{wk:72,mtd:104},contacts:{wk:118,mtd:188},emails:{wk:79,mtd:188},first:{wk:2,mtd:3},held:1,
  calls:{wk:{conv:1,noans:52,bot:2,other:1,none:4},mtd:{conv:6,noans:212,bot:16,other:8,none:7}},
  cq:{wk:{unique:56,once:54,two:2,three:0,neu:0,neuCalls:0,fu:56,fuCalls:58,same:2,noc:2,convC:1},
      mtd:{unique:146,once:73,two:48,three:25,neu:28,neuCalls:45,fu:118,fuCalls:201,same:8,noc:3,convC:6}},
  status:{pos:9,disq:1,exh:0,work:179},patch:36,eng:17,bot:167,tw:{wk:51,mtd:87},
  review:{stuck:62,newAcc:2,noOutcome:1,noNext:4}},
 {k:'matthew',name:'Matthew Meehan',short:'Matthew',pod:'Sales Pod 2',lead:'Felix Dealtry',
  assigned:358,contacted:{wk:11,mtd:53},contacts:{wk:22,mtd:144},emails:{wk:15,mtd:83},first:{wk:0,mtd:4},held:1,
  calls:{wk:{conv:0,noans:0,bot:0,other:0,none:0},mtd:{conv:3,noans:86,bot:0,other:0,none:4}},
  cq:{wk:{unique:0,once:0,two:0,three:0,neu:0,neuCalls:0,fu:0,fuCalls:0,same:0,noc:0,convC:0},
      mtd:{unique:58,once:31,two:23,three:4,neu:43,neuCalls:69,fu:15,fuCalls:23,same:20,noc:1,convC:3}},
  status:{pos:8,disq:5,exh:0,work:345},patch:36,eng:19,bot:200,tw:{wk:11,mtd:85},
  review:{stuck:264,newAcc:3,noOutcome:2,noNext:1}},
 {k:'nikita',name:'Nikita Rohwer',short:'Nikita',pod:'SA / Partnerships',lead:'',
  assigned:389,contacted:{wk:27,mtd:83},contacts:{wk:33,mtd:123},emails:{wk:78,mtd:180},first:{wk:0,mtd:0},held:0,
  calls:{wk:{conv:2,noans:22,bot:0,other:1,none:0},mtd:{conv:10,noans:110,bot:0,other:2,none:3}},
  cq:{wk:{unique:23,once:21,two:2,three:0,neu:5,neuCalls:6,fu:18,fuCalls:19,same:2,noc:0,convC:2},
      mtd:{unique:87,once:56,two:25,three:6,neu:22,neuCalls:32,fu:65,fuCalls:92,same:8,noc:1,convC:9}},
  status:{pos:4,disq:10,exh:0,work:375},patch:24,eng:21,bot:123,tw:{wk:21,mtd:72},
  review:{stuck:263,newAcc:30,noOutcome:0,noNext:3}},
 {k:'evan',name:'Evan Williams',short:'Evan',pod:'Marketing',lead:'',
  assigned:337,contacted:{wk:32,mtd:79},contacts:{wk:33,mtd:103},emails:{wk:23,mtd:87},first:{wk:0,mtd:0},held:0,
  calls:{wk:{conv:0,noans:11,bot:5,other:5,none:1},mtd:{conv:7,noans:69,bot:17,other:11,none:5}},
  cq:{wk:{unique:21,once:21,two:0,three:0,neu:10,neuCalls:10,fu:11,fuCalls:11,same:0,noc:1,convC:0},
      mtd:{unique:83,once:63,two:18,three:2,neu:38,neuCalls:42,fu:45,fuCalls:63,same:3,noc:4,convC:7}},
  status:{pos:3,disq:17,exh:3,work:314},patch:0,eng:30,bot:154,tw:{wk:10,mtd:45},
  review:{stuck:217,newAcc:13,noOutcome:2,noNext:0}}
];
var NF={james:{wk:{a:[0,47],c:[0,56]},mtd:{a:[14,90],c:[28,118]}},
 nikita:{wk:{a:[4,19],c:[5,18]},mtd:{a:[18,46],c:[22,65]}},
 matthew:{wk:{a:[0,0],c:[0,0]},mtd:{a:[6,3],c:[43,15]}},
 evan:{wk:{a:[4,17],c:[10,11]},mtd:{a:[21,48],c:[38,45]}},
 team:{wk:{a:[8,83],c:[15,85]},mtd:{a:[59,186],c:[131,242]}}};
var TEAM_CQ={wk:{unique:100,neu:15,fu:85},mtd:{unique:373,neu:131,fu:242}};

var OUT={james:{seq:{wk:{enr:27,em:46},mtd:{enr:40,em:106}},rep:{wk:18,mtd:35}},
 matthew:{seq:{wk:{enr:14,em:14},mtd:{enr:14,em:14}},rep:{wk:3,mtd:5}},
 nikita:{seq:{wk:{enr:23,em:71},mtd:{enr:36,em:133}},rep:{wk:15,mtd:33}},
 evan:{seq:{wk:{enr:58,em:7},mtd:{enr:59,em:31}},rep:{wk:3,mtd:12}}};

var SEQS=[
 {n:'Post-Event Sprint · RLX · Oct 2026',s:'evan',cr:'13 Oct',enr:56,st:75,rep:0,mtg:0},
 {n:'Closed Lost Re-open: 45-min catch-up with Felix',s:'matthew',cr:'12 Oct',enr:6,st:14,rep:1,mtg:0},
 {n:'Retail Peak Campaign',s:'matthew',cr:'12 Oct',enr:8,st:16,rep:0,mtg:0},
 {n:'HR indaba coffee invites',s:'nikita',cr:'12 Oct',enr:10,st:19,rep:2,mtg:0},
 {n:'Harri sequence',s:'nikita',cr:'5 Oct',enr:54,st:179,rep:0,mtg:0},
 {n:'HR Indaba Sequence',s:'nikita',cr:'15 Sep',enr:59,st:185,rep:14,mtg:0},
 {n:'SA Market Outbound Sequence',s:'',cr:'25 Aug',enr:23,st:73,rep:0,mtg:0},
 {n:'SDR Nurture Sequence',s:'',cr:'3 Aug',enr:16,st:33,rep:1,mtg:0},
 {n:'SDR Cold Outbound Sequence',s:'',cr:'12 Jun',enr:516,st:3600,rep:22,mtg:1},
 {n:'Bucket 1–5 role sequences (9)',s:'',cr:'15–17 Apr',enr:164,st:890,rep:3,mtg:0}
];

var WINS=[
 {s:'james',t:'book',l:'First meeting booked',c:'Jet2',id:7151970265,x:'Intro on 3 Nov, booked with Jason.'},
 {s:'james',t:'book',l:'First meeting booked',c:'Ramsay Health Care',id:443193098464,x:'Intro on 28 Jan, booked with Jason.'},
 {s:'matthew',t:'held',l:'Meeting held',c:'Mitie',id:6441380079,x:'Demo with Felix on 14 Oct. Pricing call already booked for 21 Oct.'},
 {s:'james',t:'held',l:'Meeting held',c:'Rentokil Initial',id:436083649764,x:'Careers site discussion with Felix on 13 Oct.'},
 {s:'james',t:'held',l:'Meeting held',c:'Highbourne Group',id:8803384033,x:'Proposal meeting with Jason on 13 Oct. Feedback call booked for 3 Nov.'},
 {s:'matthew',t:'today',l:'Demo today',c:'Intertek',id:387892469953,x:'Demo with Felix on 15 Oct.'},
 {s:'james',t:'conv',l:'Real conversation',c:'M Group',id:227047856375,x:'Valuable conversation with Natasha Weeks on 13 Oct.'},
 {s:'nikita',t:'conv',l:'Real conversation',c:'Cell C',x:'Connected with Juba Mashaba on 14 Oct.'},
 {s:'nikita',t:'conv',l:'Real conversation',c:'Dreams',x:'Connected with Harriet Clarke on 14 Oct.'},
 {s:'evan',t:'later',l:'Call back later',c:'4 accounts',x:'Reached people at Assa Abloy, Avery Healthcare, Methodist Homes (MHA) and RSK Group who asked to be called back later.'},
 {s:'evan',t:'seq',l:'Sequence launched',c:'Post-Event Sprint · RLX',x:'56 contacts enrolled on 13 Oct.'},
 {s:'nikita',t:'seq',l:'Sequence launched',c:'HR indaba coffee invites',x:'10 contacts enrolled on 12 Oct, 2 replies so far.'},
 {s:'matthew',t:'seq',l:'Sequences launched',c:'Retail Peak + Closed Lost Re-open',x:'14 contacts enrolled on 12 Oct.'}
];

var LEADS=[
 {n:'Vishwas Deep',id:884894153946,c:'',src:'Event',o:'Matt de la Hey',cr:'13 Oct',r:5.1},
 {n:'Ritesh Kumar',id:884894153925,c:'',src:'Event',o:'Matt de la Hey',cr:'13 Oct',r:5.2},
 {n:'Laura White',id:884893321461,c:'KPMG',src:'Event',o:'Annie Claassens',cr:'12 Oct',r:null},
 {n:'Gabriele Silva',id:884893321418,c:'VF Corporation',src:'Event',o:'Felix Dealtry',cr:'12 Oct',r:19.1},
 {n:'Jon Clement-Hering',id:884873016546,c:'Instant Impact',src:'Partner',o:'No owner',cr:'8 Oct',r:null},
 {n:'Jayanthi Yeshwant',id:884265161945,c:'Ad Astra Consultants',src:'Event',o:'Matt de la Hey',cr:'5 Oct',r:0.01},
 {n:'Rose Baker',id:882261895354,c:'Bristol Airport',src:'Partner',o:'Felix Dealtry',cr:'2 Oct',r:65.8},
 {n:'Barb Hyman',id:879831480506,c:'Sapia.ai',src:'Partner',o:'Joseph Williams',cr:'1 Oct',r:21.7},
 {n:'Beth Phelan',id:869916515522,c:'iCIMS',src:'Partner',o:'Joseph Williams',cr:'18 Sep',r:null}
];

var MEETINGS=[
 {c:'Jet2',id:7151970265,m:'Intro',s:'james',by:'Jason Baaphy',d:'3 Nov',booked:'14 Oct',kind:'First meeting',o:['info','Upcoming'],wk:true},
 {c:'Ramsay Health Care',id:443193098464,m:'Intro',s:'james',by:'Jason Baaphy',d:'28 Jan',booked:'15 Oct',kind:'First meeting',o:['info','Upcoming'],wk:true},
 {c:'Paramount',id:183315659977,m:'Demo',s:'james',by:'Felix Dealtry',d:'24 Nov',booked:'8 Oct',kind:'First meeting',o:['info','Upcoming']},
 {c:'Rentokil Initial',id:436083649764,m:'Careers site discussion',s:'james',by:'Felix Dealtry',d:'13 Oct',booked:'29 Jul',kind:'First meeting',o:['ok','Held'],wk:true},
 {c:'Mitie',id:6441380079,m:'Demo',s:'matthew',by:'Felix Dealtry',d:'14 Oct',booked:'7 Oct',kind:'First meeting',o:['ok','Held'],x:['warn','Outcome only on Gong copy'],wk:true},
 {c:'Intertek',id:387892469953,m:'Demo',s:'matthew',by:'Felix Dealtry',d:'15 Oct',booked:'7 Oct',kind:'First meeting',o:['info','Today'],wk:true},
 {c:'VF Corporation',id:7715068402,m:'Demo',s:'matthew',by:'Felix Dealtry',d:'16 Oct',booked:'8 Oct',kind:'First meeting',o:['info','Upcoming']},
 {c:'Eurocell',id:421667456204,m:'Demo',s:'matthew',by:'Felix Dealtry',d:'20 Oct',booked:'7 Oct',kind:'First meeting',o:['info','Upcoming']}
];

var DEALS=[
 {n:'SLR Consulting',id:510951564492,s:'matthew',st:'ROI / Value',a:45,arr:'£100k',cr:'17 Jul'},
 {n:'Harrods Careers Hub RFI',id:517402096830,s:'james',st:'Deep Dive',a:65,arr:'£100k',cr:'19 Aug'},
 {n:'Babcock',id:521546108152,s:'james',st:'Discovery',a:50,arr:'',cr:'15 Sep'},
 {n:'ABM UK',id:515109561543,s:'james',st:'Proposal',a:46.4,arr:'£46.4k',cr:'5 Aug'},
 {n:'Highbourne Group',id:515018677438,s:'james',st:'Proposal',a:30,arr:'£25k',cr:'4 Aug'},
 {n:'Samworth Brothers',id:469818370294,s:'nikita',st:'Proposal',a:21,arr:'£21k',cr:'13 Feb'},
 {n:'Day Lewis Pharmacy',id:515175934158,s:'nikita',st:'Proposal',a:20,arr:'',cr:'7 Aug'},
 {n:'Hickorys Smokehouse',id:514871603411,s:'nikita',st:'ROI / Value',a:12,arr:'',cr:'3 Aug'}
];

var SNAPSHOT_AT='2026-10-15T10:30:00Z';
var PERIODS={wk:{start:'2026-10-12',end:'2026-10-15'},mtd:{start:'2026-10-01',end:'2026-10-15'},dayOfMonth:15,daysInMonth:31};
var PIPE={closedWon:0,createdMtd:0};

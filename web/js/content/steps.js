// Step by step: the hands-on widgets some lessons add to their screens (drawn by views/player.js). Data only.
// demand: a day of visitors; drag the hour and watch a fixed data center and the cloud cope (or not).
// sort: tap each job, then who does it. ask: the screen's task; then: what it shows, said after it is done.
const STEPS = {
 l1:{hook:'You run an online shop. Some hours are quiet, lunchtime is a rush. How many servers should you buy?',
  widget:{kind:'demand', fixed:6, need:[1, 1, 1, 1, 1, 1, 2, 3, 4, 5, 6, 7, 9, 8, 6, 5, 5, 6, 7, 6, 4, 3, 2, 1],
   ask:'Drag through the day. Stop at the lunch rush (12:00), then at night (3:00).',
   then:'Owning servers means guessing: too few at lunch (visitors turned away), too many at night (paid for, idle). The cloud follows the need: that is <b>elasticity</b>, and you pay only for what runs.'}},
 l5:{hook:'You rent a hotel room. The hotel guards the building; you lock your own door. AWS works the same way.',
  widget:{kind:'sort', ask:'Tap each job, then tap who is responsible for it on Amazon EC2.',
   items:[
    {t:'Guards and cameras at the data centers', who:'aws', why:'Physical security of the facilities is always AWS.'},
    {t:'Patching the guest operating system', who:'you', why:'On EC2 you manage the OS and everything above it.'},
    {t:'Replacing failed server hardware', who:'aws', why:'The hardware is part of the cloud itself.'},
    {t:'Who can log in (IAM users and permissions)', who:'you', why:'Access to your account is yours to manage.'},
    {t:'The hypervisor that runs the virtual machines', who:'aws', why:'The virtualization layer is AWS\'s.'},
    {t:'Security group rules for your instance', who:'you', why:'You choose what traffic reaches your servers.'},
    {t:'Encrypting your data', who:'you', why:'AWS gives the tools (KMS); turning them on for your data is your job.'},
    {t:'The cables and network between Regions', who:'aws', why:'The global network is AWS infrastructure.'}],
   then:'AWS secures <b>the cloud</b> (buildings, hardware, network, hypervisor). You secure what you put <b>in the cloud</b> (OS on EC2, data, access, firewall rules).'}}
};

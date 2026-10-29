// "How it works": one step-through picture per lesson and one per exam domain, drawn by web/js/views/flow.js.
// Data only. Each row is one step: tapping Next adds the row, says `say`, and links it to the row above
// with an arrow (labelled `via` when given). `name` is the step's short name for the put-in-order game.
// rank: steps with the same rank may go in either order in the game (default: the step's position).
// Nodes: t = title, k = kind (picks the icon), n = one-line note, lesson = opens that lesson (domain flows).
// Kinds: user, onprem, compute, storage, db, net, sec, money, watch, ai, place, doc, code, help.
const FLOWS = {
 l1:{title:'A new app: your own data center or the cloud', rows:[
  {name:'Need servers', say:'You need servers for a new app. Here are the two ways to get them.',
   nodes:[{t:'Your own data center', k:'onprem', n:'Buy servers up front'}, {t:'AWS Cloud', k:'compute', n:'Rent them when you need them'}]},
  {name:'Get started', say:'Your own servers take weeks to order and cost money up front (CapEx). In the cloud they start in minutes and you pay as you go (OpEx).',
   nodes:[{t:'Weeks, paid up front', k:'onprem'}, {t:'Minutes, pay as you go', k:'money'}]},
  {name:'Busy day', say:'Traffic jumps. Your data center is stuck with what you bought. In the cloud, Auto Scaling adds servers as demand grows: that is elasticity.', via:'more users',
   nodes:[{t:'Stuck at what you bought', k:'onprem'}, {t:'Grows with demand', k:'compute', n:'Elasticity'}]},
  {name:'Quiet day', say:'Traffic drops. Idle servers in your data center still cost money. In the cloud they are removed and you stop paying for them.', via:'fewer users',
   nodes:[{t:'Idle servers still paid for', k:'onprem'}, {t:'Shrinks, you pay less', k:'money'}]},
  {name:'Go global', say:'Customers in another country? You would build a new data center. In AWS you deploy to another Region in minutes: go global in minutes.', via:'new country',
   nodes:[{t:'Build abroad', k:'onprem'}, {t:'Another Region in minutes', k:'place'}]}]},

 l2:{title:'Running a blog three ways', rows:[
  {name:'Want a blog', say:'You want to run a blog. How much do you want to run yourself?', nodes:[{t:'You', k:'user'}]},
  {name:'IaaS', say:'IaaS, for example Amazon EC2: you get a virtual server. You patch the OS, install the web server and run the blog.',
   nodes:[{t:'IaaS: EC2', k:'compute', n:'You manage the OS and everything above it'}]},
  {name:'PaaS', say:'PaaS, for example Elastic Beanstalk: you upload your code. AWS runs the servers, OS and runtime.',
   nodes:[{t:'PaaS: Elastic Beanstalk', k:'code', n:'You bring code, AWS runs the platform'}]},
  {name:'SaaS', say:'SaaS, for example a hosted blog service: you sign up and write. Everything else is run for you.',
   nodes:[{t:'SaaS: a blog service', k:'doc', n:'You only use the finished app'}]},
  {name:'Where it runs', say:'Deployment models: all in the cloud, hybrid (cloud connected to your own data center), or on-premises.', via:'and where it runs',
   nodes:[{t:'Cloud', k:'place'}, {t:'Hybrid', k:'net', n:'Joined by VPN or Direct Connect'}, {t:'On-premises', k:'onprem'}]}]},

 l3:{title:'Opening a website served from Frankfurt', rows:[
  {name:'User in Berlin', say:'You open a website from Berlin.', nodes:[{t:'You in Berlin', k:'user'}]},
  {name:'Edge location', say:'CloudFront answers from an edge location near you. If it has a cached copy, you get it fast and the request stops here.',
   nodes:[{t:'Edge location', k:'net', n:'Many more of them than Regions'}]},
  {name:'Region', say:'No cached copy? The edge location fetches it from the app\'s Region, eu-central-1 (Frankfurt), keeps a copy for the next user, and sends it to you.', via:'not cached',
   nodes:[{t:'Region eu-central-1', k:'place', n:'Chosen for law, latency, services, price'}]},
  {name:'Two AZs', say:'The app runs in two Availability Zones. Each AZ is one or more separate data centers.',
   nodes:[{t:'AZ a: server', k:'compute'}, {t:'AZ b: server', k:'compute'}]},
  {name:'AZ fails', say:'AZ a loses power. AZ b keeps serving: spreading across AZs is high availability.', via:'AZ a fails',
   nodes:[{t:'AZ a: down', k:'place'}, {t:'AZ b: still serving', k:'compute', n:'High availability'}]},
  {name:'Second Region', say:'For a disaster that hits a whole Region, keep a copy in a second Region: disaster recovery.', via:'whole Region lost',
   nodes:[{t:'Second Region', k:'place', n:'Disaster recovery'}]}]},

 l4:{title:'Moving a company to AWS', rows:[
  {name:'Plan with CAF', say:'Plan the move with the Cloud Adoption Framework: business, people and governance on the business side; platform, security and operations on the technical side.',
   nodes:[{t:'Cloud Adoption Framework', k:'doc', n:'6 perspectives'}]},
  {name:'Pick a strategy', say:'Pick one of the 7 Rs for each app. For example: rehost a server as it is, replatform a database onto RDS, retire an app nobody uses.',
   nodes:[{t:'Rehost', k:'compute', n:'Lift and shift'}, {t:'Replatform', k:'db', n:'Lift, tinker, shift'}, {t:'Retire', k:'onprem', n:'Switch it off'}]},
  {name:'Move the data', say:'Move databases with AWS DMS while they keep running. Huge amounts of data go offline on an AWS Snow family device.',
   nodes:[{t:'AWS DMS', k:'db', n:'Databases, little downtime'}, {t:'Snow family', k:'storage', n:'Large offline transfers (exam answer)'}]},
  {name:'Review', say:'Once running, review it against the Well-Architected Framework\'s 6 pillars and improve.',
   nodes:[{t:'Well-Architected review', k:'watch', n:'Checks it against the 6 pillars'}]}]},

 l5:{title:'Who protects each layer of an app on EC2', rows:[
  {name:'Buildings', say:'AWS guards the data center buildings: staff, power and cooling.', nodes:[{t:'Data center', k:'place', n:'AWS'}]},
  {name:'Hardware and network', say:'AWS runs the hardware and the global network, and disposes of old disks safely.', nodes:[{t:'Hardware and network', k:'net', n:'AWS'}]},
  {name:'Hypervisor', say:'AWS secures the virtualization layer that keeps your server apart from others.', nodes:[{t:'Hypervisor', k:'compute', n:'AWS'}]},
  {name:'Guest OS', say:'On EC2 you patch the operating system. On RDS AWS patches the OS and database engine for you.',
   nodes:[{t:'EC2: you patch', k:'user'}, {t:'RDS: AWS patches', k:'db'}]},
  {name:'Firewall rules', say:'You decide what traffic is allowed in, with security groups.', nodes:[{t:'Security groups', k:'sec', n:'You'}]},
  {name:'Your data', say:'Always yours, on every service: your data, who can access it, and whether it is encrypted.', nodes:[{t:'Data and access', k:'sec', n:'Always you'}]}]},

 l6:{title:'How IAM decides yes or no', rows:[
  {name:'Who asks', say:'A request comes from a person or from an app.',
   nodes:[{t:'Person', k:'user', n:'IAM user, signs in with MFA'}, {t:'App on EC2', k:'compute', n:'Uses a role'}]},
  {name:'Credentials', say:'The person has long-term credentials. The app takes on a role and gets temporary credentials, so no keys sit in its code.',
   nodes:[{t:'Password and MFA', k:'sec'}, {t:'Temporary credentials', k:'sec', n:'From the role'}]},
  {name:'The request', say:'The request: read a file from an S3 bucket.', nodes:[{t:'Read a file in S3', k:'storage'}]},
  {name:'Explicit deny?', say:'IAM checks every policy that applies. If any of them denies it, the answer is no: an explicit deny always wins.',
   nodes:[{t:'Any explicit Deny?', k:'sec', n:'Yes: denied'}]},
  {name:'Allow?', say:'No deny, and a policy allows it: yes. Nothing allows it: no. Everything starts as denied.', via:'no deny',
   nodes:[{t:'Allowed', k:'sec', n:'A policy allows it'}, {t:'Denied', k:'sec', n:'Nothing allows it'}]}]},

 l7:{title:'An attack meets the security services', rows:[
  {name:'Flood of traffic', say:'An attacker floods the site. Shield absorbs the DDoS: Standard is free and automatic.',
   nodes:[{t:'Attacker', k:'user'}, {t:'Shield', k:'sec', n:'DDoS protection'}]},
  {name:'Bad requests', say:'Some requests try SQL injection. WAF blocks them before they reach the app.',
   nodes:[{t:'WAF', k:'sec', n:'Web attacks, layer 7'}]},
  {name:'The servers', rank:2, say:'Inspector scans the EC2 servers and container images for known software flaws.',
   nodes:[{t:'EC2 servers', k:'compute'}, {t:'Inspector', k:'sec', n:'Vulnerabilities'}]},
  {name:'The data', rank:2, say:'Macie finds personal data stored in S3. KMS holds the keys that encrypt it.',
   nodes:[{t:'Macie', k:'sec', n:'Personal data in S3'}, {t:'KMS', k:'sec', n:'Encryption keys'}]},
  {name:'Watching logs', rank:2, say:'GuardDuty reads the logs and spots threats with machine learning.',
   nodes:[{t:'GuardDuty', k:'watch', n:'Threat detection'}]},
  {name:'One view', say:'Security Hub collects all the findings in one place. Detective helps find the root cause.',
   nodes:[{t:'Security Hub', k:'watch', n:'All findings'}, {t:'Detective', k:'watch', n:'Root cause'}]}]},

 l8:{title:'A change to a security group, from start to audit', rows:[
  {name:'Guard rails', say:'Organizations service control policies set the most any account may do, for example "nobody can turn off CloudTrail".',
   nodes:[{t:'Organizations SCPs', k:'sec', n:'Maximum permissions'}]},
  {name:'The change', say:'An admin opens a port in a security group.', nodes:[{t:'Admin', k:'user'}]},
  {name:'CloudTrail', say:'CloudTrail logs the API call: who did it, what, when and from where.', nodes:[{t:'CloudTrail', k:'doc', n:'Audit log'}]},
  {name:'Config', say:'Config records the new setting and flags it if it breaks one of your rules.', nodes:[{t:'Config', k:'watch', n:'Is it set up right?'}]},
  {name:'CloudWatch', say:'CloudWatch watches how the app runs and raises an alarm if it slows down.', nodes:[{t:'CloudWatch', k:'watch', n:'Metrics, logs, alarms'}]},
  {name:'The audit', say:'An auditor asks for proof. Artifact gives AWS\'s own compliance reports; Audit Manager collects your evidence.',
   nodes:[{t:'Artifact', k:'doc', n:'AWS reports: SOC, ISO, PCI'}, {t:'Audit Manager', k:'doc', n:'Your evidence'}]}]},

 l9:{title:'A web app that grows and shrinks', rows:[
  {name:'Users', say:'Users visit the web app.', nodes:[{t:'Users', k:'user'}]},
  {name:'Load balancer', say:'Elastic Load Balancing spreads their requests across the servers.', nodes:[{t:'Elastic Load Balancing', k:'net'}]},
  {name:'Servers', say:'An Auto Scaling group runs the EC2 servers.', nodes:[{t:'EC2', k:'compute'}, {t:'EC2', k:'compute'}]},
  {name:'Scale out', say:'Traffic doubles. Auto Scaling adds servers; later it removes them again.', via:'busy',
   nodes:[{t:'EC2', k:'compute'}, {t:'EC2', k:'compute'}, {t:'+ EC2', k:'compute', n:'Added by Auto Scaling'}]},
  {name:'Lambda', say:'A user uploads a photo. A Lambda function makes a thumbnail: no server to manage, runs up to 15 minutes.', via:'photo uploaded',
   nodes:[{t:'Lambda', k:'code', n:'Pay per request and run time'}]},
  {name:'Containers', say:'Another team runs containers on ECS or EKS, with Fargate so they manage no servers.',
   nodes:[{t:'ECS / EKS', k:'compute', n:'Containers'}, {t:'Fargate', k:'compute', n:'No servers to manage'}]}]},

 l10:{title:'The life of a photo in storage', rows:[
  {name:'Upload', say:'A photo is uploaded to an S3 bucket.', nodes:[{t:'User', k:'user'}, {t:'S3 Standard', k:'storage', n:'Used often'}]},
  {name:'After 30 days', say:'After 30 days it is rarely viewed. A lifecycle rule moves it to S3 Standard-IA: cheaper to keep, small fee to read.', via:'30 days',
   nodes:[{t:'S3 Standard-IA', k:'storage', n:'Infrequent access'}]},
  {name:'After a year', say:'After a year it is kept only for the record. It moves to S3 Glacier Deep Archive: the cheapest, back within 12 hours.', via:'1 year',
   nodes:[{t:'Glacier Deep Archive', k:'storage', n:'Cheapest, standard retrieval within 12 hours'}]},
  {name:'Server disk', rank:3, say:'The web server itself keeps its files on an EBS volume, a disk in one AZ.',
   nodes:[{t:'EC2', k:'compute'}, {t:'EBS', k:'storage', n:'Block disk, one AZ'}]},
  {name:'Shared files', rank:3, say:'Many servers need the same files at once: they mount one EFS file system.',
   nodes:[{t:'EFS', k:'storage', n:'Shared Linux file system'}]}]},

 l11:{title:'Where an online shop keeps its data', rows:[
  {name:'The app', say:'Shoppers use the web app.', nodes:[{t:'Web app', k:'compute'}]},
  {name:'Cache', rank:1, say:'Product pages read the same data again and again. ElastiCache answers them from memory.', nodes:[{t:'ElastiCache', k:'db', n:'In-memory cache'}]},
  {name:'Orders', rank:1, say:'Orders go into tables in RDS or Aurora. Multi-AZ keeps a standby copy in a second AZ that takes over if the first fails.',
   nodes:[{t:'RDS primary, AZ a', k:'db'}, {t:'Standby, AZ b', k:'db', n:'Multi-AZ failover'}]},
  {name:'Shopping carts', rank:1, say:'Millions of shopping carts, looked up by key in milliseconds: DynamoDB.', nodes:[{t:'DynamoDB', k:'db', n:'NoSQL key-value'}]},
  {name:'Reports', say:'Each night the data is copied to Redshift for SQL reports over years of sales.', via:'every night',
   nodes:[{t:'Redshift', k:'db', n:'Data warehouse'}]}]},

 l12:{title:'A request into a VPC and back out', rows:[
  {name:'DNS', say:'The user types the shop\'s name. Route 53 returns its address.', nodes:[{t:'User', k:'user'}, {t:'Route 53', k:'net', n:'DNS'}]},
  {name:'Internet gateway', say:'The request enters the VPC through the internet gateway.', nodes:[{t:'Internet gateway', k:'net'}]},
  {name:'Network ACL', say:'The network ACL checks it at the subnet edge: stateless, so the reply also needs an outbound rule. Allow and deny rules.', nodes:[{t:'Network ACL', k:'sec', n:'Subnet, stateless'}]},
  {name:'Security group', say:'The security group checks it at the server: stateful, so the reply goes back out automatically. Allow rules only.', nodes:[{t:'Security group', k:'sec', n:'Instance, stateful'}]},
  {name:'Web server', say:'The web server in the public subnet answers, reading from the database in the private subnet.',
   nodes:[{t:'Web server', k:'compute', n:'Public subnet'}, {t:'Database', k:'db', n:'Private subnet'}]},
  {name:'Going out', say:'A private server needs updates. It reaches the internet through the NAT gateway; nobody can reach it from outside.', via:'updates',
   nodes:[{t:'NAT gateway', k:'net', n:'Out only'}]},
  {name:'The office', say:'The company office joins the VPC with a Site-to-Site VPN, or a private Direct Connect line.',
   nodes:[{t:'Site-to-Site VPN', k:'net', n:'Encrypted, over the internet'}, {t:'Direct Connect', k:'net', n:'Private line'}]}]},

 l13:{title:'An order, from code to dashboard', rows:[
  {name:'Build', say:'CloudFormation builds the whole setup from a template: infrastructure as code.', nodes:[{t:'CloudFormation', k:'code'}]},
  {name:'Queue', say:'An order arrives. The app puts it in an SQS queue so a worker can take it when ready.', nodes:[{t:'SQS', k:'code', n:'Queue'}]},
  {name:'Notify', say:'When it ships, SNS tells the customer by email or SMS.', nodes:[{t:'SNS', k:'code', n:'Notifications'}]},
  {name:'Store', say:'Order records land in S3. Glue catalogues them.', nodes:[{t:'S3', k:'storage'}, {t:'Glue', k:'code', n:'ETL and catalog'}]},
  {name:'Query', say:'Athena runs SQL straight on those files. QuickSight turns the results into a dashboard.',
   nodes:[{t:'Athena', k:'watch', n:'SQL on S3'}, {t:'QuickSight', k:'watch', n:'Dashboards'}]},
  {name:'AI', say:'Comprehend reads review text for meaning. Bedrock adds generative AI through an API.',
   nodes:[{t:'Comprehend', k:'ai', n:'Meaning in text'}, {t:'Bedrock', k:'ai', n:'Foundation models'}]}]},

 l14:{title:'Choosing how to pay for one app', rows:[
  {name:'Estimate', say:'Before building, estimate the cost with the Pricing Calculator.', nodes:[{t:'Pricing Calculator', k:'money'}]},
  {name:'Steady base', rank:1, say:'Servers that run all day, every day: commit with a Savings Plan or Reserved Instances for 1 or 3 years.',
   nodes:[{t:'Savings Plans', k:'money'}, {t:'Reserved Instances', k:'money'}]},
  {name:'Daily peaks', rank:1, say:'Extra servers for a few busy hours: On-Demand, no commitment.', nodes:[{t:'On-Demand', k:'money'}]},
  {name:'Batch jobs', rank:1, say:'Night jobs that can stop and restart: Spot, up to 90 % off, with a 2-minute warning before it is taken back.',
   nodes:[{t:'Spot Instances', k:'money', n:'Can be interrupted'}]},
  {name:'Licences', rank:1, say:'Software licensed per physical core: Dedicated Hosts, a whole server for you.', nodes:[{t:'Dedicated Hosts', k:'money'}]},
  {name:'Data transfer', rank:1, say:'Data coming in is generally free; data going out to the internet costs money.',
   nodes:[{t:'In: free', k:'net'}, {t:'Out: paid', k:'net'}]}]},

 l15:{title:'A month of AWS bills, and getting help', rows:[
  {name:'Budget', say:'Set a budget. AWS Budgets alerts you when spending passes it, or is forecast to.', nodes:[{t:'AWS Budgets', k:'money'}]},
  {name:'Tags', say:'Tag each resource with its project, then turn the tags on as cost allocation tags in Billing: the bill splits by team.', nodes:[{t:'Cost allocation tags', k:'money'}]},
  {name:'Alert', say:'Halfway through the month an alert arrives. Cost Explorer shows which service grew.', via:'over budget',
   nodes:[{t:'Cost Explorer', k:'watch', n:'Charts and forecasts'}]},
  {name:'Detail', say:'For line-by-line detail, open the Cost and Usage Report (Data Exports).', nodes:[{t:'Cost and Usage Report', k:'doc'}]},
  {name:'Many accounts', say:'With many accounts, consolidated billing in Organizations gives one bill and combined volume discounts.',
   nodes:[{t:'Consolidated billing', k:'money', n:'One bill'}]},
  {name:'Getting help', say:'Production goes down. With Business support you get a response in under 1 hour.', via:'outage',
   nodes:[{t:'Business support', k:'help', n:'24/7, under 1 h'}]}]},

 // One per exam domain: how its lessons fit together. Each node opens its lesson.
 cc:{title:'Cloud Concepts: why, what, where, how', rows:[
  {name:'Why', say:'Why move to the cloud: pay as you go, scale with demand, go global in minutes.', nodes:[{t:'Why the cloud', k:'money', lesson:'l1'}]},
  {name:'What', say:'What you rent: IaaS, PaaS or SaaS, deployed in the cloud, hybrid or on-premises.', nodes:[{t:'Service models', k:'code', lesson:'l2'}]},
  {name:'Where', say:'Where it runs: Regions, Availability Zones and edge locations.', nodes:[{t:'Global infrastructure', k:'place', lesson:'l3'}]},
  {name:'How', say:'How to do it well and move there: Well-Architected, CAF and the 7 Rs.', nodes:[{t:'Well-Architected and migration', k:'doc', lesson:'l4'}]}]},
 sec:{title:'Security: who does what, and how it is proved', rows:[
  {name:'Split', say:'First the split: AWS secures the cloud, you secure what you put in it.', nodes:[{t:'Shared responsibility', k:'sec', lesson:'l5'}]},
  {name:'Identity', rank:1, say:'Then who may do what: users, roles, policies and MFA.', nodes:[{t:'IAM', k:'user', lesson:'l6'}]},
  {name:'Protect', rank:1, say:'Services that detect and block threats.', nodes:[{t:'Security services', k:'sec', lesson:'l7'}]},
  {name:'Prove', say:'Logs, settings checks and reports that prove it to an auditor.', nodes:[{t:'Compliance and governance', k:'doc', lesson:'l8'}]}]},
 tech:{title:'Technology: the parts of one app', rows:[
  {name:'Compute', rank:0, say:'Something runs the code.', nodes:[{t:'Compute', k:'compute', lesson:'l9'}]},
  {name:'Storage and data', rank:0, say:'It keeps files and data.', nodes:[{t:'Storage', k:'storage', lesson:'l10'}, {t:'Databases', k:'db', lesson:'l11'}]},
  {name:'Network', rank:0, say:'A network connects it to users, safely.', nodes:[{t:'Networking', k:'net', lesson:'l12'}]},
  {name:'Run and learn', rank:0, say:'Tools build it, connect its parts and learn from its data.', nodes:[{t:'Management, analytics, AI', k:'watch', lesson:'l13'}]}]},
 bill:{title:'Billing: choose, watch, get help', rows:[
  {name:'Choose', say:'Choose how to pay for each workload.', nodes:[{t:'Pricing models', k:'money', lesson:'l14'}]},
  {name:'Watch and help', say:'Watch the bill and know which support plan to call.', nodes:[{t:'Billing and support', k:'help', lesson:'l15'}]}]}
};

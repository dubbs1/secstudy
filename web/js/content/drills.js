// Drills: lookalike sets, exam key-phrase questions and one "guess first" question per lesson. Data only.
const LOOKALIKES = [
 {id:'findings', t:'Who finds the problem?', items:[
   {n:'Amazon GuardDuty', cue:'Spots threats by watching logs and network activity'},
   {n:'Amazon Inspector', cue:'Scans EC2, container images and Lambda for software vulnerabilities'},
   {n:'Amazon Macie', cue:'Finds sensitive data, such as personal data, in S3'},
   {n:'Amazon Detective', cue:'Investigates a finding to find its root cause'},
   {n:'AWS Security Hub', cue:'Gathers all findings in one place and checks best practices'}],
  qs:[
   {q:'An EC2 instance suddenly starts talking to an IP address known for crypto mining. Which service raises an alert by itself?', a:'Amazon GuardDuty', x:'GuardDuty watches CloudTrail, VPC Flow Logs and DNS logs for threats. Inspector looks for flaws in software, not for live attacks.'},
   {q:'Before each release, a team wants to know which of its container images have known software vulnerabilities.', a:'Amazon Inspector', x:'Inspector scans EC2, container images and Lambda for known vulnerabilities. GuardDuty looks at activity, not at the software you installed.'},
   {q:'GuardDuty raised a finding about an IAM role. The team wants to see everything that role did over the past weeks to understand how it happened.', a:'Amazon Detective', x:'Detective links log data into a graph so you can investigate the root cause. Security Hub collects findings but does not dig into them.'},
   {q:'A company with 20 accounts wants one view of findings from GuardDuty, Inspector and Macie, plus checks against best-practice standards.', a:'AWS Security Hub', x:'Security Hub gathers findings and runs best-practice checks. Detective is for investigating one finding, not for the overview.'}]},

 {id:'protection', t:'Which wall stops it?', items:[
   {n:'AWS Shield', cue:'Protects against DDoS attacks; Standard is free, Advanced is paid with a response team'},
   {n:'AWS WAF', cue:'Filters web requests: SQL injection, cross-site scripting, bad IPs'},
   {n:'AWS Firewall Manager', cue:'Rolls firewall rules out across all accounts in an Organization'},
   {n:'AWS Network Firewall', cue:'Filters traffic in and out of a whole VPC'},
   {n:'Security group', cue:'Firewall on the instance: stateful, allow rules only'},
   {n:'Network ACL', cue:'Firewall on the subnet: stateless, allow and deny rules'}],
  qs:[
   {q:'A news site expects large DDoS attacks on election night. It wants 24/7 help from an AWS response team and protection from the extra scaling costs.', a:'AWS Shield', x:'Shield Advanced adds the Shield Response Team and cost protection. WAF filters web requests but is not the DDoS service with a response team.'},
   {q:'A web app behind an Application Load Balancer must block SQL injection attempts.', a:'AWS WAF', x:'WAF inspects web requests at layer 7. Network Firewall filters VPC traffic and is not the usual answer for web attacks like SQL injection.'},
   {q:'A security team wants the same WAF rules and security group rules applied in all 40 accounts of its Organization, including accounts added later.', a:'AWS Firewall Manager', x:'Firewall Manager sets the rules once and applies them across the Organization. WAF alone is set up app by app.'},
   {q:'Traffic from one known bad IP address must be explicitly denied for every instance in a subnet, using a free, built-in VPC feature with a simple rule.', a:'Network ACL', x:'Network ACLs work at the subnet, support deny rules and cost nothing. Security groups have allow rules only. Network Firewall could also do it, but it is a paid service for filtering a whole VPC.'}]},

 {id:'keys', t:'Keys, certificates or secrets?', items:[
   {n:'AWS Key Management Service (KMS)', cue:'Creates and manages encryption keys, built into most AWS services'},
   {n:'AWS CloudHSM', cue:'Your own dedicated hardware security module, single-tenant'},
   {n:'AWS Certificate Manager (ACM)', cue:'Provides and renews TLS certificates for websites'},
   {n:'AWS Secrets Manager', cue:'Stores secrets and rotates them automatically'},
   {n:'AWS Systems Manager Parameter Store', cue:'Stores settings and secrets at low cost, no automatic rotation'}],
  qs:[
   {q:'Company rules say its encryption keys must be kept in single-tenant hardware that only the company controls.', a:'AWS CloudHSM', x:'CloudHSM gives you dedicated HSMs that only you control. KMS is a shared, managed service.'},
   {q:'A team wants S3 and EBS data encrypted with keys AWS manages for it, and every use of a key logged in CloudTrail.', a:'AWS Key Management Service (KMS)', x:'KMS is built into S3 and EBS and logs key use in CloudTrail. CloudHSM is only needed when you must have dedicated hardware.'},
   {q:'An app\'s database password must change every 30 days automatically, without changing the app\'s code.', a:'AWS Secrets Manager', x:'Secrets Manager rotates secrets automatically. Parameter Store can hold the password too, but does not rotate it for you.'},
   {q:'A website needs HTTPS on its load balancer, and the team never wants to renew a certificate by hand.', a:'AWS Certificate Manager (ACM)', x:'ACM issues TLS certificates and renews them automatically. KMS manages encryption keys, not website certificates.'}]},

 {id:'watch', t:'Watch, record or prove?', items:[
   {n:'AWS CloudTrail', cue:'Records API calls: who did what, when and from where'},
   {n:'Amazon CloudWatch', cue:'Metrics, logs and alarms for performance'},
   {n:'AWS Config', cue:'Records resource settings over time and checks them against rules'},
   {n:'AWS Audit Manager', cue:'Collects evidence from your accounts for your audits'},
   {n:'AWS Artifact', cue:'Download AWS\'s own compliance reports and agreements'}],
  qs:[
   {q:'The team wants an alarm when an instance\'s CPU stays above 80 % for 10 minutes.', a:'Amazon CloudWatch', x:'CloudWatch collects metrics and raises alarms. CloudTrail records API calls, not CPU use.'},
   {q:'Someone stopped a production instance at 3 a.m. The security team needs to know which user did it.', a:'AWS CloudTrail', x:'CloudTrail logs every API call with the user and time. Config shows that the resource changed, but CloudTrail is the record of who acted.'},
   {q:'A company wants to be told whenever an S3 bucket becomes public, and to see how the bucket was set up last month.', a:'AWS Config', x:'Config records configuration history and checks it against rules. CloudWatch watches performance, not settings.'},
   {q:'An auditor asks for AWS\'s own PCI DSS report about its data centers.', a:'AWS Artifact', x:'Artifact is where you download AWS\'s compliance reports. Audit Manager collects evidence about your own use of AWS, not AWS\'s reports.'}]},

 {id:'cost', t:'Which cost tool?', items:[
   {n:'AWS Cost Explorer', cue:'Charts past spending and forecasts it'},
   {n:'AWS Budgets', cue:'Alerts when cost or usage passes, or is forecast to pass, a limit'},
   {n:'AWS Cost and Usage Report', cue:'The most detailed line-by-line billing data'},
   {n:'AWS Pricing Calculator', cue:'Estimates the cost before you build'},
   {n:'AWS Billing Conductor', cue:'Custom billing views with your own rates'}],
  qs:[
   {q:'Before moving to AWS, a manager wants an estimate of the monthly cost of 10 EC2 instances and a database.', a:'AWS Pricing Calculator', x:'The Pricing Calculator estimates costs before anything runs. Cost Explorer only shows spending that has already happened (and forecasts from it).'},
   {q:'Finance wants a chart of how spending changed over the last 12 months by service, with a forecast for next quarter.', a:'AWS Cost Explorer', x:'Cost Explorer charts and forecasts spending. Budgets sends alerts against a limit; it is not the place to explore trends.'},
   {q:'An analytics team wants every hourly line item of the bill delivered to S3 so it can query it with Athena.', a:'AWS Cost and Usage Report', x:'The Cost and Usage Report (now delivered through Data Exports) is the most detailed billing data. Cost Explorer shows summaries in charts.'},
   {q:'A company resells AWS to its own customers and wants to show each one a bill with the company\'s own rates.', a:'AWS Billing Conductor', x:'Billing Conductor builds custom (pro forma) bills with your own rates. Budgets only warns about limits.'}]},

 {id:'advisors', t:'Who gives the advice?', items:[
   {n:'AWS Trusted Advisor', cue:'Checks your accounts for cost, security, performance, fault tolerance and service limits'},
   {n:'AWS Compute Optimizer', cue:'Recommends the right size for EC2, EBS, Lambda and more'},
   {n:'AWS Health Dashboard', cue:'Tells you about AWS events that affect your resources'},
   {n:'AWS Well-Architected Tool', cue:'A guided review of one workload against the six pillars'}],
  qs:[
   {q:'An admin wants an automatic check of whether any S3 bucket is open to everyone and whether the account is close to a service limit.', a:'AWS Trusted Advisor', x:'Trusted Advisor checks security, cost, performance, fault tolerance and service limits. Compute Optimizer only looks at resource sizes.'},
   {q:'Many EC2 instances use under 10 % CPU. The team wants machine-learning advice on which smaller instance types to use.', a:'AWS Compute Optimizer', x:'Compute Optimizer uses machine learning on usage history to recommend sizes. Trusted Advisor can flag idle instances, but rightsizing advice is Compute Optimizer\'s job.'},
   {q:'An app slowed down. The team wants to know whether AWS has a problem or scheduled maintenance affecting its instances.', a:'AWS Health Dashboard', x:'The Health Dashboard shows AWS-side events for your account. Trusted Advisor checks your own setup, not AWS outages.'},
   {q:'An architect wants to review a new workload against AWS best practices, pillar by pillar, and keep a list of improvements.', a:'AWS Well-Architected Tool', x:'The Well-Architected Tool guides a review against the six pillars. Trusted Advisor runs automatic checks but is not a pillar-by-pillar review.'}]},

 {id:'support', t:'Which support plan?', note:'The five plans the exam uses. AWS changed its plans in December 2025: see lesson 15.', items:[
   {n:'Basic', cue:'Free: billing help, re:Post, core Trusted Advisor checks'},
   {n:'Developer', cue:'Business-hours email support, for testing and early development'},
   {n:'Business', cue:'24/7 phone, chat and email, all Trusted Advisor checks, under 1 hour for production system down'},
   {n:'Enterprise On-Ramp', cue:'A pool of TAMs, under 30 minutes for business-critical system down'},
   {n:'Enterprise', cue:'Your own designated TAM, under 15 minutes for business-critical system down'}],
  qs:[
   {q:'A student wants to try AWS and only needs help with billing and the community forums.', a:'Basic', x:'Basic is free and includes billing support, re:Post and the core Trusted Advisor checks. Developer adds technical email support the student does not need.'},
   {q:'A startup runs its shop in production and must be able to phone an engineer at 2 a.m. when the site is down, at the lowest cost.', a:'Business', x:'Business is the cheapest plan with 24/7 phone support and a response under 1 hour for production down. Developer is business-hours email only.'},
   {q:'A company wants advice from a pool of Technical Account Managers and a 30-minute response for business-critical outages, but not its own designated TAM.', a:'Enterprise On-Ramp', x:'Enterprise On-Ramp gives a pool of TAMs and under 30 minutes. Enterprise gives a designated TAM and under 15 minutes.'},
   {q:'A bank needs its own designated Technical Account Manager and a response within 15 minutes when a business-critical system is down.', a:'Enterprise', x:'Only Enterprise has a designated TAM and the 15-minute response. Enterprise On-Ramp has a pool of TAMs and 30 minutes.'}]},

 {id:'pillars', t:'Which Well-Architected pillar?', items:[
   {n:'Operational Excellence', cue:'Run and monitor systems, improve processes, operations as code'},
   {n:'Security', cue:'Protect data, systems and assets'},
   {n:'Reliability', cue:'Recover from failures and meet demand'},
   {n:'Performance Efficiency', cue:'Use computing resources efficiently as needs change'},
   {n:'Cost Optimization', cue:'Avoid paying for what you don\'t need'},
   {n:'Sustainability', cue:'Lower the environmental impact of workloads'}],
  qs:[
   {q:'Teams make small, frequent changes that are easy to undo, and write their runbooks as code.', a:'Operational Excellence', x:'Small reversible changes and operations as code are Operational Excellence ideas. Reliability is about recovering from failure.'},
   {q:'An app must recover by itself when an Availability Zone fails, and scale to meet demand.', a:'Reliability', x:'Recovering from failure and meeting demand is Reliability. Performance Efficiency is about using the right resources efficiently.'},
   {q:'A team picks the best instance types for the job and tries new options, such as serverless, as they appear, to get the most from its resources.', a:'Performance Efficiency', x:'Choosing and evolving the right resource types is Performance Efficiency. Cost Optimization focuses on spending, not speed.'},
   {q:'A company wants its workloads to use less energy by keeping servers busy and picking more efficient instance types.', a:'Sustainability', x:'Reducing energy use and environmental impact is Sustainability, the sixth pillar. Cost Optimization may also benefit, but its goal is money.'}]},

 {id:'caf', t:'Which CAF perspective?', items:[
   {n:'Business', cue:'Cloud investments drive business outcomes'},
   {n:'People', cue:'Culture, skills, training and organisation change'},
   {n:'Governance', cue:'Manage programs, risk and cloud spending'},
   {n:'Platform', cue:'Build the cloud platform and architecture'},
   {n:'Security', cue:'Keep data and workloads confidential, intact and available'},
   {n:'Operations', cue:'Run cloud services at agreed service levels'}],
  qs:[
   {q:'Company leaders want to be sure the cloud investment speeds up business goals, and want a business case and strategy for the move.', a:'Business', x:'Linking cloud investment to business outcomes is the Business perspective. Governance manages risk and spending once the program runs.'},
   {q:'Staff need new cloud skills, so the company plans training and changes to job roles.', a:'People', x:'Skills, training, culture and roles belong to the People perspective. Operations is about running the services.'},
   {q:'A program office tracks the benefits of the move, manages risk and keeps cloud spending under control.', a:'Governance', x:'Program management, risk and cloud financial management are in Governance. Business sets the goals; Governance steers the program.'},
   {q:'Engineers design the landing zone and the standard patterns teams will use to build new apps.', a:'Platform', x:'Architecture and the cloud platform belong to the Platform perspective. Operations runs and supports workloads afterwards.'}]},

 {id:'migrate', t:'Which migration strategy?', items:[
   {n:'Rehost', cue:'Lift and shift: move it as it is'},
   {n:'Replatform', cue:'Lift, tinker and shift: small changes, such as moving the database to RDS'},
   {n:'Refactor', cue:'Re-architect, for example to serverless, for new features or scale'},
   {n:'Repurchase', cue:'Drop the old app and move to a SaaS product'},
   {n:'Retain', cue:'Keep it where it is for now'},
   {n:'Retire', cue:'Switch it off'},
   {n:'Relocate', cue:'Move a whole virtualized (for example VMware) environment to AWS without changing the apps'}],
  qs:[
   {q:'A company must leave its data center in three months. It moves its servers to EC2 without changing them.', a:'Rehost', x:'Moving without changes is Rehost (lift and shift). Replatform would make small changes on the way.'},
   {q:'Nobody has used an old reporting app for a year. The team switches it off instead of moving it.', a:'Retire', x:'Switching off what is not needed is Retire. Retain means keeping it running where it is.'},
   {q:'A company replaces the customer database it runs on its own servers with a SaaS CRM product.', a:'Repurchase', x:'Moving to a different product, usually SaaS, is Repurchase. Refactor would rebuild the same app.'},
   {q:'While moving, the team switches the app\'s self-run database to Amazon RDS but leaves the app\'s code as it is.', a:'Replatform', x:'A small change for a cloud benefit, like a managed database, is Replatform. Refactor would mean re-architecting the app.'}]},

 {id:'connect', t:'How do networks connect?', items:[
   {n:'AWS Site-to-Site VPN', cue:'Encrypted tunnel to AWS over the internet, quick to set up'},
   {n:'AWS Direct Connect', cue:'Dedicated private line, steady speed, not over the internet'},
   {n:'AWS Transit Gateway', cue:'Hub connecting many VPCs and on-premises networks'},
   {n:'AWS PrivateLink', cue:'Private access to one service without the internet'},
   {n:'VPC peering', cue:'Links two VPCs directly, one to one'}],
  qs:[
   {q:'An office needs an encrypted connection to its VPC by tomorrow, at low cost, over its existing internet line.', a:'AWS Site-to-Site VPN', x:'A Site-to-Site VPN runs over the internet and is quick to set up. Direct Connect needs a physical line and takes much longer.'},
   {q:'A company moves terabytes every day and needs steady bandwidth that does not travel over the public internet.', a:'AWS Direct Connect', x:'Direct Connect is a dedicated private line with consistent performance. A VPN still travels over the internet.'},
   {q:'Thirty VPCs and two data centers must all reach each other, managed from one central point.', a:'AWS Transit Gateway', x:'Transit Gateway is a hub for many networks. VPC peering links only two VPCs at a time, so 30 VPCs would need hundreds of links.'},
   {q:'A software company wants customers to reach its service from their own VPCs privately, without joining whole networks together.', a:'AWS PrivateLink', x:'PrivateLink exposes one service through an endpoint. VPC peering would join the whole networks.'}]},

 {id:'speed', t:'How do you speed up users?', items:[
   {n:'Amazon CloudFront', cue:'Caches content at edge locations near users'},
   {n:'AWS Global Accelerator', cue:'Static IP addresses and the AWS network for faster, steadier TCP and UDP'},
   {n:'Route 53 latency routing', cue:'DNS sends each user to the fastest Region'},
   {n:'AWS Local Zones', cue:'AWS compute in a big city for single-digit millisecond latency'},
   {n:'AWS Wavelength', cue:'AWS compute inside 5G networks for mobile devices'}],
  qs:[
   {q:'Images and videos on a global website load slowly for users far from the Region.', a:'Amazon CloudFront', x:'CloudFront caches content at edge locations near users. Global Accelerator speeds the path but does not cache.'},
   {q:'A multiplayer game uses UDP and needs fixed IP addresses and fast failover between Regions.', a:'AWS Global Accelerator', x:'Global Accelerator gives static IPs, works for UDP and fails over quickly. CloudFront is for cacheable web content.'},
   {q:'An app runs in three Regions. Each user should be sent by DNS to the Region that answers them fastest.', a:'Route 53 latency routing', x:'Latency routing in Route 53 answers DNS with the fastest Region. Global Accelerator steers traffic too, but not through DNS.'},
   {q:'Video editors in one large city need single-digit millisecond latency to the compute they work on.', a:'AWS Local Zones', x:'Local Zones put AWS compute in large cities. Wavelength is for mobile devices on 5G networks.'}]}
];

const KEYWORDS = [
 {id:'k1', k:'LEAST operational overhead', q:'A team wants to run code each time a file lands in S3 with the <mark>LEAST operational overhead</mark>. Which should it use?',
  o:[['AWS Lambda',''],['An EC2 instance that checks the bucket every minute','You patch and run the server yourself: more overhead.'],['A container on an EC2 cluster the team manages','You still manage the cluster and its servers.'],['A server in the company\'s own data center','The most overhead of all: hardware, OS and network are yours.']],
  a:0, x:'Serverless and managed beat self-managed when the question asks for the least overhead.'},
 {id:'k2', k:'MOST cost-effective', q:'A nightly batch job runs for two hours and can simply restart if it is stopped. Which EC2 option is the <mark>MOST cost-effective</mark>?',
  o:[['On-Demand Instances','Works, but costs much more than Spot for work that can be interrupted.'],['Dedicated Hosts','The most expensive choice; only for licence or compliance needs.'],['Spot Instances',''],['Reserved Instances for 3 years','A 3-year commitment for 2 hours a night wastes most of what you pay for.']],
  a:2, x:'Spot is up to 90 % off. If the work can be interrupted, Spot is the cheapest answer.'},
 {id:'k3', k:'highly available', q:'A web app must stay <mark>highly available</mark> even if one data center fails. What should the company do?',
  o:[['Use one very large EC2 instance','One instance is a single point of failure, however big it is.'],['Run instances in several Availability Zones behind a load balancer',''],['Take daily backups to S3','Backups help you recover later; they don\'t keep the app up.'],['Move the app to a bigger Region','Region size does not matter; spreading across AZs does.']],
  a:1, x:'High availability means no single point of failure: spread across Availability Zones and let a load balancer send traffic to healthy ones.'},
 {id:'k4', k:'fault tolerant', q:'Data must stay readable even if a whole Availability Zone is lost. Which storage choice is <mark>fault tolerant</mark> in that way?',
  o:[['S3 One Zone-Infrequent Access','Stored in one AZ only, so losing that AZ can lose the data.'],['An EBS volume','An EBS volume lives in one AZ.'],['EC2 instance store','Temporary disk; lost when the instance stops, let alone the AZ.'],['S3 Standard','']],
  a:3, x:'S3 Standard stores data across at least three Availability Zones, so it survives the loss of one.'},
 {id:'k5', k:'without long-term commitment', q:'A company needs EC2 capacity for a 3-month project that must not be interrupted, <mark>without long-term commitment</mark>. Which pricing fits?',
  o:[['Reserved Instances for 1 year','A 1-year commitment is longer than the project.'],['A Compute Savings Plan','Savings Plans also need a 1 or 3 year commitment.'],['On-Demand Instances',''],['Spot Instances','No commitment, but AWS can take them back, and this work must not be interrupted.']],
  a:2, x:'On-Demand has no commitment and is never taken back. Commitments start at 1 year.'},
 {id:'k6', k:'least privilege', q:'A Lambda function needs to read items from one DynamoDB table. Which is the <mark>MOST secure</mark> setup that follows <mark>least privilege</mark>?',
  o:[['Attach the AdministratorAccess policy to the function\'s role','Far more access than the function needs.'],['A role allowing read actions on that one table only',''],['Put an IAM user\'s access keys in the function\'s code','Long-term keys in code can leak; use a role instead.'],['A role with full access to all DynamoDB tables','Write and delete on every table is more than reading one table.']],
  a:1, x:'Least privilege: a role (temporary credentials) with only the actions and resources the task needs.'},
 {id:'k7', k:'lowest latency for global users', q:'A company serves images and videos to customers worldwide and wants the <mark>lowest latency for global users</mark>. Which service helps most?',
  o:[['Amazon CloudFront',''],['A larger EC2 instance in one Region','A bigger server does not shorten the distance to far-away users.'],['AWS Direct Connect','A private line from your own data center; it does not help internet users.'],['Multi-AZ for the database','Improves availability, not distance to users.']],
  a:0, x:'CloudFront caches content at edge locations close to users around the world.'},
 {id:'k8', k:'durable long-term archive', q:'Records must be kept for 10 years as a <mark>durable, long-term archive</mark> at the lowest cost. Getting a file back within 48 hours is fine. Where should they go?',
  o:[['S3 Standard','Durable, but you pay for instant access you don\'t need.'],['An EBS volume','Block storage for a running instance; costly and not an archive.'],['EC2 instance store','Temporary: data is lost when the instance stops.'],['S3 Glacier Deep Archive','']],
  a:3, x:'Glacier Deep Archive is the cheapest S3 class, with the same 11 nines durability and retrieval within 12 hours (48 hours with bulk).'},
 {id:'k9', k:'quickly, without upfront investment', q:'A startup wants to test a new idea <mark>quickly and without upfront investment</mark>. What should it do?',
  o:[['Buy servers for the expected peak','Large upfront cost and weeks of delivery time.'],['Sign a 3-year All Upfront Reserved Instance','All Upfront is the opposite of no upfront investment.'],['Use pay-as-you-go cloud resources and switch them off if the idea fails',''],['Build a small data center first','Slow and expensive before a single test runs.']],
  a:2, x:'Pay-as-you-go turns upfront spending into variable cost, and resources are ready in minutes.'},
 {id:'k10', k:'managed', q:'A team is tired of patching and backing up its MySQL database. It wants a <mark>managed</mark> relational database. Which should it choose?',
  o:[['MySQL on an EC2 instance','You still patch the OS and database and run backups yourself.'],['Amazon RDS for MySQL',''],['Amazon DynamoDB','Managed, but NoSQL, not a relational MySQL database.'],['MySQL on a server on premises','Everything stays the team\'s job.']],
  a:1, x:'With RDS, AWS patches the OS and database engine and takes automatic backups.'}
];

const GUESS = {
 l1:{q:'A small shop rents computers by the hour instead of buying them. What is the main money benefit?',
  o:[['It never pays anything at all','Cloud is not free; you pay for what you use.'],['It pays only for what it uses, with no big purchase up front',''],['Its bill is exactly the same every month','Pay-as-you-go bills change with use.'],['It owns the computers after a year','Renting does not turn into owning.']],
  a:1, x:'The cloud swaps a big upfront purchase (CapEx) for paying as you go (OpEx).'},
 l2:{q:'Which of these takes the LEAST work from you to keep running?',
  o:[['Renting a bare server and installing everything yourself','You manage the OS and everything above it.'],['Uploading your code to a platform that runs the servers','Less work, but you still write and maintain the app.'],['Using a finished web app, like web email',''],['Building your own server room','The most work of all.']],
  a:2, x:'The more the provider runs for you (IaaS, then PaaS, then SaaS), the less you manage, and the less you control.'},
 l3:{q:'Why would a company run its app in two buildings several miles apart instead of one?',
  o:[['So a fire, flood or power cut in one building doesn\'t stop the app',''],['Because one building can only hold one server','Data centers hold thousands of servers.'],['To make the app cost less','Running in two places usually costs a bit more.'],['So users must choose which building to use','Users never pick; traffic is routed for them.']],
  a:0, x:'That is the idea behind Availability Zones: separate data centers, so one failure doesn\'t take everything down.'},
 l4:{q:'A company wants to know whether its cloud setup is built well. What helps most?',
  o:[['Buying the biggest servers available','Bigger is not better built; it may just cost more.'],['Asking each developer to guess','Guesses differ and miss things.'],['Copying another company\'s setup exactly','Their needs are not yours.'],['A checklist of best practices grouped into areas such as security, reliability and cost','']],
  a:3, x:'AWS offers this as the Well-Architected Framework: best practices grouped into six pillars.'},
 l5:{q:'You rent a flat. The landlord looks after the building\'s roof and walls. Who should lock your front door?',
  o:[['The landlord','The landlord secures the building, not what you do inside your flat.'],['You',''],['The city council','Not their job at all.'],['Nobody, the building is safe','A safe building does not lock your door for you.']],
  a:1, x:'Cloud works the same way: AWS secures the cloud itself, you secure what you put in it and who you let in.'},
 l6:{q:'A new office worker needs to use the printer but not the payroll system. What should they get?',
  o:[['A master key to every room','Far more access than the job needs.'],['The manager\'s password','Sharing passwords hides who did what.'],['Access only to what their job needs',''],['No access at all until next year','They can\'t do their job.']],
  a:2, x:'Giving only the access a job needs is called least privilege, the core idea of IAM.'},
 l7:{q:'Which job is more like a security camera than a locked door?',
  o:[['Watching activity and raising an alarm when something looks wrong',''],['Blocking all traffic from a bad address','That stops things at the door; it is a firewall.'],['Encrypting files so others can\'t read them','That protects data; it doesn\'t watch for anything.'],['Asking for a password and a code at sign-in','That is a lock: multi-factor authentication.']],
  a:0, x:'Some security services protect (locks), others detect (cameras). The exam asks you to tell them apart.'},
 l8:{q:'Why do companies keep records of who did what and how their systems are set up?',
  o:[['To make systems run faster','Records don\'t speed anything up.'],['Because it is free in every case','Not the reason, and not always free.'],['So they can prove to auditors that rules are followed, and spot changes',''],['To replace backups','Records of actions are not copies of your data.']],
  a:2, x:'Logs and configuration records are the evidence for audits and the way to see what changed.'},
 l9:{q:'You need a computer for only two seconds each time someone uploads a photo. How would you like to pay?',
  o:[['Buy a server and keep it on all year','You pay for every idle hour.'],['Rent a server by the month','Still paying while nothing happens.'],['Rent a large server just in case','Even more idle cost.'],['Pay only for the seconds your code actually runs','']],
  a:3, x:'Serverless compute like Lambda charges per request and run time, so idle time costs nothing.'},
 l10:{q:'What does it mean when storage is called very "durable"?',
  o:[['It is very fast to read','That is performance, not durability.'],['Data stored there is very unlikely ever to be lost',''],['It is always the cheapest','Durability and price are separate.'],['It can be reached from anywhere','That is about access, not keeping data safe.']],
  a:1, x:'Durability is about not losing data. S3 is designed for 11 nines of durability.'},
 l11:{q:'A shop keeps customers, orders and order items that must link to each other exactly. What kind of database fits best?',
  o:[['Tables with rows and links between them (relational)',''],['A plain text file','Hard to keep consistent and to search.'],['A cache that keeps data in memory only','A cache speeds things up but is not the main record.'],['A folder of photos','Not a database for orders at all.']],
  a:0, x:'Relational databases (like RDS and Aurora) store linked tables. NoSQL fits other shapes of data.'},
 l12:{q:'Why would you put your database in a part of the network the internet cannot reach?',
  o:[['To make it faster for users','Users reach the web server, not the database.'],['Because databases can\'t use the internet','They can; you choose not to expose them.'],['To make the database cheaper','Placement is about safety, not price.'],['So outsiders can\'t connect to it directly','']],
  a:3, x:'Web servers go in a public subnet, databases in a private subnet that only your own servers can reach.'},
 l13:{q:'Two parts of an app must keep working even when one of them is busy for a while. What helps?',
  o:[['Make the busy part wait until the other is free','Then both slow down.'],['A queue that holds the messages until the busy part is ready',''],['Merge both parts into one program','Then one problem stops everything.'],['Turn off the busy part','Then the work is lost.']],
  a:1, x:'A queue (like Amazon SQS) decouples the parts, so each can work at its own pace.'},
 l14:{q:'A hotel gives a lower nightly price if you book a whole year ahead. What is the cloud version of that?',
  o:[['Paying by the hour with no commitment','That is the full-price, flexible option.'],['Getting servers for free','Not a real option.'],['Committing to use resources for 1 or 3 years in return for a discount',''],['Paying only on weekends','Cloud pricing does not work by weekday.']],
  a:2, x:'Savings Plans and Reserved Instances trade a 1 or 3 year commitment for a big discount.'},
 l15:{q:'Why would a company pay for a higher support plan?',
  o:[['Faster help from experts when something breaks',''],['To get cheaper servers','Support plans do not lower server prices.'],['To skip the shared responsibility model','Your security tasks stay yours.'],['To get extra Regions','Regions are the same on every plan.']],
  a:0, x:'Higher plans give faster response times, 24/7 phone help and, at the top, a Technical Account Manager.'}
};

// "What if": one hands-on sandbox per lesson, drawn by web/js/views/sim.js. Data only.
// Two kinds:
//   build  switch parts on and off; each goal is met when every part in `needs` is on and no part in `unless` is.
//          `why` says, per part, what goes wrong without it (or, for `unless`, with it). A goal with `never`
//          can't be met by design, and says why.
//   pick   choose one option; each goal lists the options that can do it (`yes`) and says why (`why`).
// Parts and options: t = name, k = icon kind (as in flows.js), does = what it is for, on = starts switched on.
const SIMS = {
 l1:{kind:'pick', title:'Where should the new app run?', options:[
   {id:'dc', t:'Your own data center', k:'onprem', does:'You buy, run and guard the servers.'},
   {id:'aws', t:'AWS Cloud', k:'compute', does:'You rent servers when you need them.'}],
  goals:[
   {t:'New servers in minutes', yes:['aws'], why:'A data center needs weeks to order and set up hardware; in the cloud you launch servers on demand.'},
   {t:'No big payment up front', yes:['aws'], why:'Cloud is pay as you go (variable expense, OpEx). Your own servers are bought first (CapEx).'},
   {t:'Grows and shrinks with demand', yes:['aws'], why:'Elasticity: the cloud adds and removes servers as load changes. A data center is stuck with what you bought.'},
   {t:'Running in another country in minutes', yes:['aws'], why:'Deploy to another AWS Region. Without the cloud you would build or rent a data center there.'},
   {t:'Walk in and touch the physical servers', yes:['dc'], why:'In AWS the physical data centers are AWS\'s to run and guard; customers never get in.'}]},

 l2:{kind:'pick', title:'How much do you want to run yourself?', options:[
   {id:'iaas', t:'IaaS: EC2', k:'compute', does:'A virtual server.'},
   {id:'paas', t:'PaaS: Elastic Beanstalk', k:'code', does:'Upload code; AWS runs the platform.'},
   {id:'saas', t:'SaaS: web email', k:'doc', does:'A finished app you use.'}],
  goals:[
   {t:'Choose and patch the operating system', yes:['iaas'], why:'Only IaaS gives you the OS. In PaaS and SaaS the provider runs it.'},
   {t:'Install any software you like on the server', yes:['iaas'], why:'You control the server in IaaS. PaaS runs your code on a platform it manages; SaaS gives you no server at all.'},
   {t:'Run your own code without managing servers', yes:['paas'], why:'PaaS takes your code and handles servers, OS and runtime. IaaS leaves the servers to you; SaaS runs someone else\'s code.'},
   {t:'Use it without writing any code', yes:['saas'], why:'SaaS is a finished application: you sign in and use it.'},
   {t:'You still decide who can see your data', yes:['iaas', 'paas', 'saas'], why:'Your data and who can access it are always your job, whatever the model.'}]},

 l3:{kind:'build', title:'Keep a website up, wherever trouble hits', parts:[
   {id:'az2', t:'A second Availability Zone', k:'place', does:'A copy of the app in another data center in the same Region.', on:true},
   {id:'region2', t:'A second Region', k:'place', does:'A copy in another part of the world.'},
   {id:'cdn', t:'CloudFront', k:'net', does:'Cached copies at edge locations close to users.'}],
  goals:[
   {t:'Stays up if one data center loses power', needs:['az2'], why:{az2:'With one AZ, losing it takes the whole site down. High availability means at least two AZs.'}},
   {t:'Stays up if a whole Region is lost', needs:['region2'], why:{region2:'Every AZ you use is in the same Region. Surviving a Region-wide disaster needs a second Region.'}},
   {t:'Loads fast for users on another continent', needs:['cdn'], why:{cdn:'Without CloudFront every request crosses the world to the Region. Edge locations serve a cached copy nearby.'}}]},

 l4:{kind:'pick', title:'Pick a migration strategy for one app', options:[
   {id:'rehost', t:'Rehost', k:'compute', does:'Lift and shift, as it is.'},
   {id:'replatform', t:'Replatform', k:'db', does:'Lift, tinker and shift.'},
   {id:'refactor', t:'Refactor', k:'code', does:'Re-architect for the cloud.'},
   {id:'repurchase', t:'Repurchase', k:'doc', does:'Move to a SaaS product.'},
   {id:'retire', t:'Retire', k:'onprem', does:'Switch it off.'}],
  goals:[
   {t:'Moves fastest, no code changes', yes:['rehost'], why:'Rehost copies the server as it is, for example into EC2.'},
   {t:'Small changes to use a managed service', yes:['replatform'], why:'Replatform keeps the app but swaps a part, for example its database onto RDS.'},
   {t:'Gets the most from cloud-native features', yes:['refactor'], why:'Refactoring rewrites the app (serverless, containers): the most work and the most benefit.'},
   {t:'Stop running the software yourself', yes:['repurchase', 'retire'], why:'Repurchase replaces it with a SaaS product; Retire switches it off because nobody needs it.'}]},

 l5:{kind:'pick', title:'Same app, three services: who does what?', options:[
   {id:'ec2', t:'EC2', k:'compute', does:'A virtual server.'},
   {id:'rds', t:'RDS', k:'db', does:'A managed database.'},
   {id:'lambda', t:'Lambda', k:'code', does:'Code that runs on demand.'}],
  goals:[
   {t:'You patch the OS', yes:['ec2'], why:'On EC2 the guest OS is yours. On RDS and Lambda AWS patches what runs under your data or code.'},
   {t:'AWS patches the database engine', yes:['rds'], why:'RDS is managed: AWS patches the OS and database engine. On EC2 a database you install is yours to patch.'},
   {t:'You set who can reach it', yes:['ec2', 'rds', 'lambda'], why:'Security groups, IAM permissions and settings are always yours.'},
   {t:'You choose encryption', yes:['ec2', 'rds', 'lambda'], why:'Your data and encryption choices stay yours on every service.'},
   {t:'AWS guards buildings and hardware', yes:['ec2', 'rds', 'lambda'], why:'Security of the cloud is always AWS\'s part.'}]},

 l6:{kind:'build', title:'Can Alice read the report in S3?', parts:[
   {id:'allow', t:'A policy that allows reading the bucket', k:'doc', does:'Attached to Alice\'s group.', on:true},
   {id:'deny', t:'An explicit Deny on the bucket', k:'sec', does:'Added by the security team.'},
   {id:'mfa', t:'MFA on Alice\'s sign-in', k:'sec', does:'A code from her phone as well as the password.'},
   {id:'role', t:'A role for the reporting app on EC2', k:'user', does:'Gives the app temporary credentials.'}],
  goals:[
   {t:'Alice can read the report', needs:['allow'], unless:['deny'], why:{allow:'Everything starts denied. Without a policy that allows it, the answer is no.', deny:'An explicit deny always wins, even over an allow.'}},
   {t:'A stolen password alone can\'t get in', needs:['mfa'], why:{mfa:'Without MFA the password is all an attacker needs.'}},
   {t:'The app on EC2 reads it with no keys in its code', needs:['role'], unless:['deny'], why:{role:'Without a role the app needs long-term access keys stored on the server: never do that.', deny:'The deny applies to the app\'s role too: deny wins.'}}]},

 l7:{kind:'build', title:'Which attacks are caught?', parts:[
   {id:'waf', t:'WAF', k:'sec', does:'Filters web requests.'},
   {id:'guardduty', t:'GuardDuty', k:'watch', does:'Reads logs for threats.'},
   {id:'inspector', t:'Inspector', k:'sec', does:'Scans for software flaws.'},
   {id:'macie', t:'Macie', k:'sec', does:'Looks for personal data in S3.'},
   {id:'shieldadv', t:'Shield Advanced', k:'sec', does:'Paid DDoS protection with a response team.'}],
  goals:[
   {t:'Basic DDoS protection', needs:[], ok:'Shield Standard is on for everyone, free and automatic.'},
   {t:'Block SQL injection in web requests', needs:['waf'], why:{waf:'Only WAF looks inside web requests (layer 7) and blocks SQL injection and cross-site scripting.'}},
   {t:'Spot a server talking to a bad IP', needs:['guardduty'], why:{guardduty:'GuardDuty watches CloudTrail, VPC Flow Logs and DNS logs for threats.'}},
   {t:'Find an unpatched library on EC2', needs:['inspector'], why:{inspector:'Inspector scans EC2, container images and Lambda for known vulnerabilities.'}},
   {t:'Find card numbers stored in S3', needs:['macie'], why:{macie:'Macie finds sensitive data such as PII in S3.'}},
   {t:'A DDoS response team on call', needs:['shieldadv'], why:{shieldadv:'Shield Standard has no response team; Shield Advanced adds one.'}}]},

 l8:{kind:'build', title:'Can you answer the auditor?', parts:[
   {id:'trail', t:'CloudTrail', k:'doc', does:'Logs API calls.', on:true},
   {id:'config', t:'Config', k:'watch', does:'Records settings over time.'},
   {id:'cw', t:'CloudWatch', k:'watch', does:'Metrics, logs and alarms.'},
   {id:'scp', t:'An Organizations SCP', k:'sec', does:'Sets the most an account may do.'}],
  goals:[
   {t:'Who deleted the bucket, and when?', needs:['trail'], why:{trail:'Only CloudTrail records who made each API call, when and from where.'}},
   {t:'Was this security group open last Tuesday?', needs:['config'], why:{config:'Config keeps a history of each resource\'s settings and checks them against rules.'}},
   {t:'An alarm when CPU stays over 80 %', needs:['cw'], why:{cw:'CloudWatch watches metrics and raises alarms.'}},
   {t:'No account can switch off CloudTrail', needs:['scp'], why:{scp:'An SCP can block that action for every account in the organization, even for their admins.'}},
   {t:'Download AWS\'s SOC 2 report', needs:[], ok:'AWS Artifact gives you AWS\'s compliance reports, such as SOC reports, on demand. Nothing to switch on.'}]},

 l9:{kind:'build', title:'Will the web app survive?', parts:[
   {id:'elb', t:'Elastic Load Balancing', k:'net', does:'Spreads requests across servers and skips unhealthy ones.', on:true},
   {id:'asg', t:'Auto Scaling', k:'compute', does:'Adds and removes servers to match demand.'},
   {id:'az2', t:'Servers in a second AZ', k:'place', does:'Some servers in another Availability Zone.'}],
  goals:[
   {t:'Requests are shared across servers', needs:['elb'], why:{elb:'Without a load balancer users go to one server, and it takes the whole load.'}},
   {t:'A spike adds servers by itself', needs:['asg'], why:{asg:'Without Auto Scaling the number of servers stays fixed until someone changes it.'}},
   {t:'Still serving if one AZ fails', needs:['elb', 'az2'], why:{az2:'All servers sit in the one AZ that failed.', elb:'Without a load balancer, users aren\'t moved to the healthy servers.'}},
   {t:'You pay less at night', needs:['asg'], why:{asg:'Without Auto Scaling the daytime servers keep running, and costing, all night.'}}]},

 l10:{kind:'pick', title:'Where should this data go?', options:[
   {id:'s3', t:'S3', k:'storage', does:'Object storage over the web.'},
   {id:'ebs', t:'EBS', k:'storage', does:'A disk for an EC2 instance.'},
   {id:'efs', t:'EFS', k:'storage', does:'A shared Linux file system.'},
   {id:'store', t:'Instance store', k:'storage', does:'Disk inside the host machine.'}],
  goals:[
   {t:'Keeps the data when the instance stops', yes:['s3', 'ebs', 'efs'], why:'Instance store is temporary: its data is lost when the instance stops.'},
   {t:'Many servers mount one shared drive', yes:['efs'], why:'EFS is the shared file system. EBS is a disk for an instance in one AZ; S3 is object storage reached through an API, not a shared file system.'},
   {t:'Unlimited objects over the web', yes:['s3'], why:'S3 holds objects in buckets with no size to plan; EBS and EFS are disks and file systems for servers.'},
   {t:'The disk an EC2 server starts from', yes:['ebs'], why:'An EC2 root volume is normally an EBS volume in the same AZ.'},
   {t:'Fastest scratch space, fine to lose', yes:['store'], why:'Instance store is disk inside the host: very fast, but temporary. Use it for caches and scratch files.'}]},

 l11:{kind:'pick', title:'Pick a database for the job', options:[
   {id:'rds', t:'RDS or Aurora', k:'db', does:'Relational tables with SQL.'},
   {id:'ddb', t:'DynamoDB', k:'db', does:'Serverless NoSQL key-value.'},
   {id:'rs', t:'Redshift', k:'db', does:'A data warehouse.'},
   {id:'cache', t:'ElastiCache', k:'db', does:'An in-memory cache.'}],
  goals:[
   {t:'Tables joined with SQL for the live app', yes:['rds'], why:'Relational data with joins for a live app is RDS or Aurora.'},
   {t:'Key lookups in milliseconds, any scale', yes:['ddb'], why:'DynamoDB answers key-value lookups in single-digit milliseconds, serverless.'},
   {t:'SQL reports over years of sales', yes:['rs'], why:'Redshift is built for analytics over large amounts of data.'},
   {t:'Answers from memory in front of another database', yes:['cache'], why:'ElastiCache keeps hot data in memory so the database is asked less often.'},
   {t:'Standby in a second AZ takes over', yes:['rds'], why:'RDS Multi-AZ keeps a standby and fails over automatically. (DynamoDB already stores data across several AZs.)'}]},

 l12:{kind:'build', title:'Build the VPC: what can reach what?', parts:[
   {id:'igw', t:'Internet gateway', k:'net', does:'The door between the VPC and the internet.', on:true},
   {id:'sg', t:'Security group: allow HTTPS in', k:'sec', does:'On the web server. Stateful.', on:true},
   {id:'naclout', t:'Network ACL: allow replies out', k:'sec', does:'On the public subnet. Stateless.', on:true},
   {id:'nat', t:'NAT gateway', k:'net', does:'Lets private servers reach out.'}],
  goals:[
   {t:'Users reach the web server', needs:['igw', 'sg', 'naclout'], why:{igw:'No internet gateway: nothing from the internet can enter the VPC.', sg:'The security group denies everything not allowed, so HTTPS is blocked at the server.', naclout:'The network ACL is stateless: the reply is a separate check, and with no outbound rule it is dropped.'}},
   {t:'Private server downloads updates', needs:['nat', 'igw'], why:{nat:'A private subnet has no route out. A NAT gateway gives it one.', igw:'The NAT gateway itself goes out through the internet gateway.'}},
   {t:'The internet opens the private database', never:'Can\'t, by design: a private subnet has no route in from the internet, and a NAT gateway only lets traffic out.'}]},

 l13:{kind:'pick', title:'How should the parts talk?', options:[
   {id:'sqs', t:'SQS', k:'code', does:'A message queue.'},
   {id:'sns', t:'SNS', k:'code', does:'Publish and subscribe.'},
   {id:'eb', t:'EventBridge', k:'code', does:'An event bus with rules.'}],
  goals:[
   {t:'A message waits until a worker is ready', yes:['sqs'], why:'SQS keeps messages in a queue until a worker takes them, so parts work at their own pace.'},
   {t:'One message to many subscribers', yes:['sns'], why:'SNS pushes each message to every subscriber at once.'},
   {t:'Route AWS events by rules', yes:['eb'], why:'EventBridge routes events from AWS services and apps to targets by rules.'},
   {t:'Parts work without waiting on each other', yes:['sqs', 'sns', 'eb'], why:'All three decouple parts of an application.'}]},

 l14:{kind:'pick', title:'Pick how to pay for a server', options:[
   {id:'od', t:'On-Demand', k:'money', does:'Pay per second or hour.'},
   {id:'sp', t:'Savings Plans', k:'money', does:'Commit to $ per hour.'},
   {id:'ri', t:'Reserved Instances', k:'money', does:'Commit to one setup.'},
   {id:'spot', t:'Spot', k:'money', does:'Spare capacity.'}],
  goals:[
   {t:'No commitment', yes:['od', 'spot'], why:'Savings Plans and Reserved Instances need a 1 or 3 year commitment.'},
   {t:'AWS never takes it back mid-job', yes:['od', 'sp', 'ri'], why:'Spot can be taken back with a 2-minute warning when AWS needs the capacity.'},
   {t:'Up to 90 % off', yes:['spot'], why:'Spot gives the deepest discount, in return for interruptions.'},
   {t:'Cheaper for a server that runs all year', yes:['sp', 'ri'], why:'Committing for 1 or 3 years lowers the price of steady use; On-Demand is the full price.'},
   {t:'Discount moves to other families and Regions', yes:['sp'], why:'Compute Savings Plans apply across families and Regions (and Fargate and Lambda). Reserved Instances are for a specific setup.'}]},

 l15:{kind:'pick', title:'Which support plan? (the plans as the exam tests them)', options:[
   {id:'basic', t:'Basic', k:'help', does:'Free.'},
   {id:'dev', t:'Developer', k:'help', does:'Business-hours email.'},
   {id:'bus', t:'Business', k:'help', does:'24/7, for production.'},
   {id:'onramp', t:'Enterprise On-Ramp', k:'help', does:'A pool of TAMs.'},
   {id:'ent', t:'Enterprise', k:'help', does:'Your own TAM.'}],
  goals:[
   {t:'Costs nothing', yes:['basic'], why:'Only Basic is free.'},
   {t:'Cheapest plan with engineer help', yes:['dev'], why:'Developer is the first paid plan: business-hours email. Basic has no technical support cases.'},
   {t:'24/7 phone and chat', yes:['bus', 'onramp', 'ent'], why:'Business is the first plan with 24/7 phone and chat, and all Trusted Advisor checks. Developer is business-hours email.'},
   {t:'Your own TAM', yes:['ent'], why:'Enterprise On-Ramp shares a pool of TAMs; Enterprise gives you a designated one.'},
   {t:'Under 15 min, critical system down', yes:['ent'], why:'Enterprise: under 15 min. Enterprise On-Ramp: under 30 min. Business: under 1 h for production down.'}]}
};

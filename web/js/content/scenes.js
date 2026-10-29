// "Picture it": an everyday scene per lesson, opened at the start of Read. Each thing in the scene is a picture
// (an emoji) of something familiar; tapping it shows the AWS idea it stands for. Data only, drawn by views/path.js.
// e = picture, t = the everyday thing, aws = what it stands for, n = one line that links the two.
// builds: the earlier lessons this one builds on; their first pictures come back as "Remember from before".
const SCENES = {
 l1:{title:'Getting around town', items:[
  {e:'🚗', t:'Buying your own car', aws:'Your own data center', n:'A big cost up front (CapEx), and you pay even when it sits in the garage.'},
  {e:'🚕', t:'Calling a taxi', aws:'The cloud', n:'Nothing up front: pay per ride (OpEx), only when you use it.'},
  {e:'💡', t:'The electricity meter', aws:'Pay as you go', n:'Like a utility bill: you pay for what you use.'},
  {e:'🪑', t:'Extra tables on a busy night', aws:'Elasticity', n:'Capacity grows with demand and shrinks again after.'},
  {e:'✈️', t:'A shop that opens abroad overnight', aws:'Go global in minutes', n:'Launch in another AWS Region instead of building a data center there.'}]},
 l2:{builds:['l1'], title:'Four ways to have pizza', items:[
  {e:'🏠', t:'Making it all at home', aws:'On-premises', n:'You run everything yourself: kitchen, oven, ingredients.'},
  {e:'🍕', t:'Take-and-bake: you bake it', aws:'IaaS (EC2)', n:'You get the basics and do the rest: the OS and everything above it.'},
  {e:'🛵', t:'Delivered: you just set the table', aws:'PaaS (Elastic Beanstalk)', n:'You bring your code; the platform is run for you.'},
  {e:'🍽️', t:'Eating at a restaurant', aws:'SaaS', n:'You just use the finished product, like web email.'}]},
 l3:{builds:['l2'], title:'A company with offices in a city', items:[
  {e:'🏙️', t:'A city', aws:'Region', n:'A geographic area, such as Frankfurt. Pick it for law, latency, services and price.'},
  {e:'🏢', t:'Separate office buildings in that city', aws:'Availability Zones', n:'Each AZ is one or more data centers. A Region has at least three.'},
  {e:'🔌', t:'Each building has its own power supply', aws:'AZs fail on their own', n:'Spread across AZs and one failing doesn\'t take you down: high availability.'},
  {e:'🏪', t:'The corner shop near your home', aws:'Edge location', n:'Close to users: CloudFront and Route 53 serve from here.'},
  {e:'🗺️', t:'A second office in another city', aws:'A second Region', n:'For disaster recovery if a whole Region is lost.'}]},
 l4:{builds:['l1', 'l3'], title:'Moving house', items:[
  {e:'📋', t:'A building inspector\'s checklist', aws:'Well-Architected Framework', n:'Six pillars to check a design against, from security to sustainability.'},
  {e:'🗓️', t:'A moving plan for the whole family', aws:'Cloud Adoption Framework', n:'Six perspectives: business, people, governance, platform, security, operations.'},
  {e:'📦', t:'Moving the furniture as it is', aws:'Rehost', n:'Lift and shift: no changes.'},
  {e:'🔧', t:'Moving, and swapping the old boiler', aws:'Replatform', n:'Small changes on the way, like moving a database onto RDS.'},
  {e:'🗑️', t:'Throwing out what you never use', aws:'Retire', n:'Switch off what nobody needs.'},
  {e:'🚚', t:'A lorry for very heavy loads', aws:'AWS Snow family', n:'The exam answer for moving huge data offline.'}]},
 l5:{builds:['l2'], title:'Staying in a hotel', items:[
  {e:'🏨', t:'The hotel\'s walls, front door and guards', aws:'AWS: security OF the cloud', n:'Buildings, hardware and the network are AWS\'s job.'},
  {e:'🚪', t:'Locking your own room', aws:'You: security IN the cloud', n:'Security groups, IAM and settings are yours.'},
  {e:'💼', t:'Your valuables in the room safe', aws:'Your data', n:'Your data and its encryption are always yours, on every service.'},
  {e:'🧹', t:'A serviced apartment: cleaning done for you', aws:'Managed services (RDS)', n:'AWS also patches the OS and database engine for you.'}]},
 l6:{builds:['l5'], title:'An office building', items:[
  {e:'👑', t:'The owner\'s master key', aws:'Root user', n:'Can do anything. Turn on MFA and lock it away.'},
  {e:'🪪', t:'A staff badge with your name', aws:'IAM user', n:'One person or app with long-term sign-in details.'},
  {e:'👥', t:'A team that shares the same door access', aws:'IAM group', n:'Users who share the same permissions.'},
  {e:'🎫', t:'A visitor pass worn for one job', aws:'IAM role', n:'Temporary permissions a service or person takes on.'},
  {e:'📜', t:'The rule sheet of which doors open', aws:'Policy', n:'A JSON document that allows or denies actions.'},
  {e:'📱', t:'A code from your phone at the door', aws:'MFA', n:'Something you have as well as the password.'}]},
 l7:{builds:['l6'], title:'Guarding a castle', items:[
  {e:'🌊', t:'A flood barrier', aws:'Shield', n:'Holds back DDoS floods. Standard is free and automatic.'},
  {e:'🎒', t:'A guard checking every visitor\'s bag', aws:'WAF', n:'Blocks bad web requests such as SQL injection.'},
  {e:'🕵️', t:'A detective watching the cameras', aws:'GuardDuty', n:'Spots threats in your logs with machine learning.'},
  {e:'🔍', t:'An inspector checking for weak locks', aws:'Inspector', n:'Finds known software flaws on EC2, containers and Lambda.'},
  {e:'🛂', t:'Finding passports left lying around', aws:'Macie', n:'Finds personal data stored in S3.'},
  {e:'🔐', t:'The locked key cabinet', aws:'KMS', n:'Creates and controls encryption keys.'}]},
 l8:{builds:['l7'], title:'Running a block of flats', items:[
  {e:'📹', t:'A camera recording who did what', aws:'CloudTrail', n:'Logs every API call: who, what, when, from where.'},
  {e:'📸', t:'Before-and-after photos of each flat', aws:'Config', n:'Records settings over time and checks them against rules.'},
  {e:'🌡️', t:'A thermostat with an alarm', aws:'CloudWatch', n:'Metrics, logs and alarms.'},
  {e:'📁', t:'The landlord\'s safety certificates', aws:'AWS Artifact', n:'AWS\'s own compliance reports, such as SOC and ISO.'},
  {e:'📏', t:'House rules for every flat', aws:'Organizations SCPs', n:'The most any member account may do.'},
  {e:'🧑‍🔧', t:'An advisor who walks round and suggests fixes', aws:'Trusted Advisor', n:'Checks for cost, security, performance, fault tolerance and service limits.'}]},
 l9:{builds:['l3'], title:'A busy restaurant kitchen', items:[
  {e:'🖥️', t:'Renting a computer for as long as you need it', aws:'EC2', n:'Virtual servers you choose and run.'},
  {e:'🚦', t:'A host seating guests at free tables', aws:'Elastic Load Balancing', n:'Spreads requests across servers.'},
  {e:'👩‍🍳', t:'Calling in more cooks when it gets busy', aws:'Auto Scaling', n:'Adds and removes servers to match demand.'},
  {e:'🧞', t:'A genie who does one task, then vanishes', aws:'Lambda', n:'Code runs when asked, up to 15 minutes; no server to manage.'},
  {e:'📦', t:'Shipping containers: same box on any ship', aws:'Containers (ECS, EKS, Fargate)', n:'Fargate runs them with no servers to manage.'}]},
 l10:{builds:['l9'], title:'Places to keep your things', items:[
  {e:'🏬', t:'A storage warehouse of labelled boxes', aws:'S3', n:'Objects in buckets, virtually unlimited, 11 nines of durability.'},
  {e:'💽', t:'The hard drive inside your laptop', aws:'EBS', n:'A disk for one EC2 instance, in one AZ.'},
  {e:'🗄️', t:'A shared office filing cabinet', aws:'EFS', n:'One file system many servers use at once.'},
  {e:'🧊', t:'A deep freezer in the basement', aws:'S3 Glacier Deep Archive', n:'Cheapest, and slow to get back: within 12 hours.'},
  {e:'📝', t:'A whiteboard wiped when you leave', aws:'Instance store', n:'Fast temporary disk, lost when the instance stops.'}]},
 l11:{builds:['l3', 'l10'], title:'Ways to keep track of things', items:[
  {e:'📒', t:'A spreadsheet with linked tabs', aws:'RDS or Aurora', n:'Tables joined with SQL, for a live app.'},
  {e:'🧥', t:'A coat check: ticket number to your coat', aws:'DynamoDB', n:'Key-value lookups in milliseconds, at any scale.'},
  {e:'🗃️', t:'The archive of every year\'s sales', aws:'Redshift', n:'A data warehouse for analytics.'},
  {e:'🗒️', t:'A sticky note of what you look up most', aws:'ElastiCache', n:'An in-memory cache in front of a database.'},
  {e:'🕸️', t:'A map of who knows who', aws:'Neptune', n:'A graph database for relationships.'}]},
 l12:{builds:['l3', 'l9'], title:'A gated neighbourhood', items:[
  {e:'🏘️', t:'Your own gated neighbourhood', aws:'VPC', n:'Your private network in a Region.'},
  {e:'⛩️', t:'The main gate to the street', aws:'Internet gateway', n:'The door between the VPC and the internet.'},
  {e:'👮', t:'A guard at the corner who checks both ways', aws:'Network ACL', n:'On the subnet. Stateless: replies are checked again.'},
  {e:'🔒', t:'The lock on each house, which remembers who went out', aws:'Security group', n:'On the instance. Stateful: replies are let back in.'},
  {e:'📮', t:'A post box: letters go out, nobody walks in', aws:'NAT gateway', n:'Private servers start connections out and get the replies; nobody outside can start one in.'},
  {e:'📖', t:'The phone book', aws:'Route 53', n:'DNS: turns a name into an address.'}]},
 l13:{builds:['l9', 'l11'], title:'Running a deli', items:[
  {e:'📐', t:'A blueprint you build from again and again', aws:'CloudFormation', n:'Infrastructure as code, from templates.'},
  {e:'🎟️', t:'The ticket queue at the counter', aws:'SQS', n:'Messages wait until a worker is ready.'},
  {e:'📢', t:'A loudspeaker announcement', aws:'SNS', n:'One message reaches every subscriber.'},
  {e:'🔎', t:'Asking questions straight of a filing box', aws:'Athena', n:'SQL on files in S3, serverless.'},
  {e:'📈', t:'A dashboard on the wall', aws:'QuickSight', n:'Charts for business users.'},
  {e:'🤖', t:'A smart assistant you call on the phone', aws:'Bedrock', n:'Foundation models (generative AI) through an API.'}]},
 l14:{builds:['l9'], title:'Ways to pay for a ride', items:[
  {e:'🚕', t:'Hailing a taxi', aws:'On-Demand', n:'No commitment, full price, pay per second or hour.'},
  {e:'🏋️', t:'A year\'s gym membership', aws:'Savings Plans or Reserved Instances', n:'Commit for 1 or 3 years and pay less.'},
  {e:'🎫', t:'A standby ticket: cheap, but you can be bumped', aws:'Spot Instances', n:'Up to 90 % off, taken back with a 2-minute warning.'},
  {e:'🏡', t:'Renting the whole house, not a room', aws:'Dedicated Hosts', n:'A physical server just for you, for licences or compliance.'},
  {e:'🧮', t:'A price calculator before you buy', aws:'Pricing Calculator', n:'Estimate the cost before you build.'}]},
 l15:{builds:['l14'], title:'Managing a household budget', items:[
  {e:'🔔', t:'A spending alert from your bank', aws:'AWS Budgets', n:'Alerts when cost passes, or is forecast to pass, a limit.'},
  {e:'📊', t:'Your bank\'s spending charts', aws:'Cost Explorer', n:'Charts and forecasts of spending.'},
  {e:'🏷️', t:'Labels on each receipt by project', aws:'Cost allocation tags', n:'Split the bill by team or project.'},
  {e:'👨‍👩‍👧', t:'One family phone bill', aws:'Consolidated billing', n:'One bill for many accounts, combined discounts.'},
  {e:'🆘', t:'A 24/7 emergency helpline', aws:'Business support and up', n:'24/7 phone and chat; under 1 hour when production is down.'},
  {e:'🧑‍💼', t:'Your own account manager at the bank', aws:'TAM (Enterprise)', n:'A Technical Account Manager of your own.'}]}
};

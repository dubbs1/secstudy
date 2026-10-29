// "Practise here": each lab done in a practice console inside the app first, with no AWS account and no cost.
// Drawn by web/js/views/labsim.js in the app's own style, labelled as practice: it never imitates the real console.
// Data only. Each step: where (the page, as a breadcrumb), task (what to do), controls, see (what the real console
// would show next) and optional table {cols, rows} drawn under it.
// Controls (every one must be right to finish the step; wrong answers explain themselves):
//   choice  pick one: options [{t, ok, why}]
//   text    type a value: need (a pattern it must match, as text), bad [{re, why}] (checked first), taken [values
//           already in use], hint
//   toggle  a switch: want (true or false), why (shown when it is the wrong way round), on (starting state)
//   cmd     a terminal line: expect (patterns, any one), output (what the terminal prints)
const LAB_SIMS = {
 lab1:{steps:[
  {where:'Sign up', task:'Choose a plan for your new account.', controls:[
    {type:'choice', id:'plan', label:'Account plan', options:[
      {t:'Free plan', ok:true, why:'$100 in credits (up to $200 with activities). It ends after 6 months or when the credits run out, and overruns use credits, not your card.'},
      {t:'Paid plan', why:'The Paid plan bills your card for anything beyond the credits. These labs assume the Free plan.'}]}],
   see:'The Free plan selected, then the next sign-up step.'},
  {where:'Security credentials (root user)', task:'Protect the root user.', controls:[
    {type:'choice', id:'mfa', label:'Next step for root', options:[
      {t:'Assign an MFA device (authenticator app)', ok:true, why:'Root can do anything in the account, so it needs a second factor.'},
      {t:'Create access keys for root', why:'Never create access keys for root: if they leak, someone gets full control of the account.'},
      {t:'Nothing for now', why:'A leaked root password alone would give away the whole account. Turn on MFA first.'}]}],
   see:'The root user listed with an MFA device assigned.'},
  {where:'Billing and Cost Management › Budgets › Create budget', task:'Get an email when anything starts to cost money.', controls:[
    {type:'choice', id:'tpl', label:'Template', options:[
      {t:'Zero spend budget', ok:true, why:'It emails you once your costs go above $0.01. Budgets update a few times a day, not instantly.'},
      {t:'Monthly cost budget', why:'Useful later, with a monthly amount. For a learning account the zero spend budget warns you earliest.'}]},
    {type:'text', id:'email', label:'Email for alerts', need:'^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', bad:[{re:'^\\s*$', why:'Enter the email address where alerts should go.'}], hint:'An email address, e.g. you@example.com'}],
   see:'Your zero spend budget in the Budgets list.'},
  {where:'Sign in', task:'Sign out and back in. Enter the code from your authenticator app.', controls:[
    {type:'text', id:'code', label:'MFA code', need:'^\\d{6}$', bad:[{re:'\\D', why:'The code is digits only.'}], hint:'6 digits'}],
   see:'The console opens: MFA works.'}]},

 lab2:{steps:[
  {where:'IAM › User groups › Create group', task:'Create a group for admins.', controls:[
    {type:'text', id:'group', label:'Group name', need:'^[\\w+=,.@-]{1,128}$', bad:[{re:'\\s', why:'IAM names cannot contain spaces.'}], hint:'Admins'},
    {type:'choice', id:'policy', label:'Permissions policy', options:[
      {t:'AdministratorAccess', ok:true, why:'Full access, for the user that replaces root in daily work. In a team you would give each person only what they need (least privilege).'},
      {t:'AmazonS3ReadOnlyAccess', why:'Too little for this lab: the admin user must be able to do everything root does day to day, except the few root-only tasks.'},
      {t:'No policy', why:'A group without a policy gives its members no permissions at all.'}]}],
   see:'Admins in the user groups list, with AdministratorAccess under Permissions.'},
  {where:'IAM › Users › Create user', task:'Create your own user and let it sign in to the console.', controls:[
    {type:'text', id:'user', label:'User name', need:'^[\\w+=,.@-]{1,64}$', bad:[{re:'\\s', why:'IAM names cannot contain spaces.'}], taken:['admin'], hint:'e.g. alex'},
    {type:'toggle', id:'console', label:'Provide user access to the AWS Management Console', want:true, why:'Without console access this user could only use access keys, and could not sign in to the console.'}],
   see:'The Set permissions page.'},
  {where:'IAM › Users › Set permissions', task:'Give the user its permissions.', controls:[
    {type:'choice', id:'how', label:'How', options:[
      {t:'Add user to group: Admins', ok:true, why:'Permissions come from the group: change the group and every member changes with it.'},
      {t:'Attach AdministratorAccess directly to the user', why:'It works, but groups are easier to manage. Attach policies to groups, then put users in them.'}]}],
   see:'The sign-in URL, user name and password, with a Download .csv button.'},
  {where:'Sign in', task:'From now on, how do you sign in for daily work?', controls:[
    {type:'choice', id:'signin', label:'Sign in with', options:[
      {t:'The account\'s IAM sign-in URL, as your new user', ok:true, why:'Daily work as an IAM user; root only for the few tasks that need it.'},
      {t:'The root email and password', why:'That is what this lab replaces: keep root locked away with MFA.'}]}],
   see:'The console with your new user\'s name at the top right, not root.'},
  {where:'IAM › Users › your user › Security credentials', task:'Protect the new user too.', controls:[
    {type:'toggle', id:'umfa', label:'Assign an MFA device', want:true, why:'An admin user is as powerful as it gets after root: it needs MFA too.'}],
   see:'Your user listed with an MFA device assigned.'}]},

 lab3:{steps:[
  {where:'S3 › Create bucket', task:'Name the bucket and pick a Region.', controls:[
    {type:'text', id:'name', label:'Bucket name', need:'^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$',
     bad:[{re:'[A-Z]', why:'Bucket names can only use lowercase letters.'}, {re:'\\s', why:'No spaces in bucket names.'}, {re:'_', why:'No underscores: use hyphens instead.'},
          {re:'^.{0,2}$', why:'At least 3 characters.'}, {re:'^.{64,}$', why:'At most 63 characters.'}, {re:'^[.-]|[.-]$', why:'Start and end with a letter or a number.'},
          {re:'\\.\\.', why:'No two periods in a row.'}, {re:'^\\d+\\.\\d+\\.\\d+\\.\\d+$', why:'Must not look like an IP address.'},
          {re:'^(xn--|sthree-|amzn-s3-demo-)', why:'That prefix is reserved by AWS.'}, {re:'(-s3alias|--ol-s3|\\.mrap|--x-s3|--table-s3)$', why:'That ending is reserved by AWS.'}],
     taken:['test', 'my-bucket', 'bucket', 'photos'], hint:'e.g. alex-notes-2026'},
    {type:'choice', id:'region', label:'AWS Region', options:[
      {t:'The Region nearest to you', ok:true, why:'Lower latency, and it keeps data where your laws expect it.'},
      {t:'The Region on the other side of the world', why:'It works, but every request travels further. Pick the nearest Region unless a law or a service says otherwise.'}]}],
   see:'The bucket settings page.'},
  {where:'S3 › Create bucket › Settings', task:'Keep it private and keep old versions.', controls:[
    {type:'toggle', id:'block', label:'Block all public access', want:true, on:true, why:'Turning it off lets a bucket policy or ACL make your files public to anyone. Leave it on unless you mean to publish them.'},
    {type:'toggle', id:'ver', label:'Bucket Versioning', want:true, why:'With versioning on, uploading a file with the same name keeps the old one as a version.'}],
   see:'Your new bucket in the bucket list.'},
  {where:'S3 › your bucket › Upload', task:'Upload notes.txt.', controls:[
    {type:'choice', id:'up', label:'Action', options:[{t:'Upload notes.txt', ok:true, why:'Uploaded.'}]}],
   see:'The file listed inside the bucket.', table:{cols:['Name', 'Size'], rows:[['notes.txt', '1 KB']]}},
  {where:'S3 › your bucket › Upload', task:'Change the file on your computer and upload it again with the same name.', controls:[
    {type:'choice', id:'up2', label:'Action', options:[{t:'Upload notes.txt again', ok:true, why:'Uploaded. The list still shows one file: the new copy is now the current version.'}]}],
   see:'Still one file in the list.', table:{cols:['Name', 'Size'], rows:[['notes.txt', '2 KB']]}},
  {where:'S3 › your bucket › Objects', task:'See both copies.', controls:[
    {type:'toggle', id:'show', label:'Show versions', want:true, why:'The older copy is only listed with Show versions on.'}],
   see:'Two versions of the file, the newest marked as the latest.', table:{cols:['Name', 'Version', 'Size'], rows:[['notes.txt', 'Latest version', '2 KB'], ['notes.txt', 'Older version', '1 KB']]}},
  {where:'S3 › Buckets', task:'Clean up: what do you do first?', controls:[
    {type:'choice', id:'clean', label:'First', options:[
      {t:'Empty bucket (delete every object and version)', ok:true, why:'A bucket must be empty before it can be deleted.'},
      {t:'Delete bucket', why:'S3 refuses: a bucket must be empty, old versions included, before it can be deleted.'}]}],
   see:'Empty, then Delete: the bucket gone from the bucket list.'}]},

 lab4:{steps:[
  {where:'EC2 › Launch instance', task:'Name it and choose the operating system.', controls:[
    {type:'text', id:'iname', label:'Name', need:'^.{1,255}$', bad:[{re:'^\\s*$', why:'Give the instance a name, e.g. test.'}], hint:'test'},
    {type:'choice', id:'ami', label:'Operating system image', options:[
      {t:'Amazon Linux', ok:true, why:'Free tier eligible, and the next steps use Linux commands.'},
      {t:'Windows Server', why:'It works, but the next steps use a Linux terminal, and Windows licences cost more.'}]}],
   see:'The launch form with Amazon Linux selected.'},
  {where:'EC2 › Launch instance › Instance type', task:'Pick a size.', controls:[
    {type:'choice', id:'type', label:'Instance type', options:[
      {t:'A small type the console marks Free tier eligible', ok:true, why:'Small and cheap: plenty for a test.'},
      {t:'A large type with 16 vCPUs and 64 GiB', why:'Far more than a test needs, and it uses your credits quickly. Right-size: pick the smallest that does the job.'}]}],
   see:'The type you picked, labelled Free tier eligible.'},
  {where:'EC2 › Launch instance › Network settings', task:'Let yourself connect, nothing more.', controls:[
    {type:'choice', id:'sg', label:'Security group rule', options:[
      {t:'Allow SSH (port 22) from Anywhere, or from the EC2 Instance Connect prefix list', ok:true, why:'Instance Connect in the browser comes from AWS\'s own addresses, so port 22 must be open to them. A security group allows nothing else in.'},
      {t:'Allow all traffic from anywhere', why:'That opens every port to the whole internet. Allow only what you need.'}]},
    {type:'choice', id:'key', label:'Key pair', options:[
      {t:'Proceed without a key pair', ok:true, why:'This lab connects with EC2 Instance Connect from the browser, which needs no key pair.'},
      {t:'Create a new key pair', ok:true, why:'Fine too, for SSH from your own computer later; Instance Connect in the browser doesn\'t need it.'}]}],
   see:'A success message with the new instance ID.'},
  {where:'EC2 › Instances › Connect › EC2 Instance Connect', task:'You are on the server. Type uname -a and press Enter.', controls:[
    {type:'cmd', id:'uname', expect:['^\\s*uname\\s+-a\\s*$'], output:'Linux ip-172-31-5-20 6.1.0 x86_64 GNU/Linux'}],
   see:'A line that starts with Linux: you are on a Linux server in AWS.'},
  {where:'EC2 › Instances › Instance state', task:'Finish without leaving anything that costs credits.', controls:[
    {type:'choice', id:'end', label:'Instance state', options:[
      {t:'Terminate instance', ok:true, why:'Deletes the instance, and its root disk with it.'},
      {t:'Stop instance', why:'A stopped instance costs nothing to run, but its EBS disk is still stored and billed. Terminate to remove it all.'}]}],
   see:'Instance state: Terminated. Elastic Block Store › Volumes shows no disk left from it.'}]},

 lab5:{steps:[
  {where:'Lambda › Create function › Author from scratch', task:'Pick a language for the function.', controls:[
    {type:'choice', id:'rt', label:'Runtime', options:[
      {t:'Python', ok:true, why:'The code in this lab is Python.'},
      {t:'Node.js', why:'Lambda runs Node.js too, but this lab\'s code is Python.'}]}],
   see:'The function page with a code editor.'},
  {where:'Lambda › your function › Code', task:'Inside the handler, add a line that prints hello from lambda.', controls:[
    {type:'cmd', id:'code', expect:['^\\s*print\\(\\s*"hello from lambda"\\s*\\)\\s*$', '^\\s*print\\(\\s*\'hello from lambda\'\\s*\\)\\s*$'], output:'Successfully updated the function.', prompt:'code'}],
   see:'A message that the function was updated (after Deploy).'},
  {where:'Lambda › your function › Test', task:'Run it with a test event.', controls:[
    {type:'choice', id:'test', label:'Action', options:[{t:'Test', ok:true, why:'Status: Succeeded. Function Logs: hello from lambda.'}]}],
   see:'Status: Succeeded in the output panel, with Function Logs underneath.'},
  {where:'Lambda › your function › Monitor', task:'Where do the printed lines end up?', controls:[
    {type:'choice', id:'logs', label:'Look in', options:[
      {t:'CloudWatch Logs', ok:true, why:'Lambda sends what your code prints to a CloudWatch log group.'},
      {t:'CloudTrail', why:'CloudTrail records API calls (who did what), not what your code prints.'},
      {t:'An S3 bucket', why:'Not by default: Lambda writes to CloudWatch Logs.'}]}],
   see:'A log stream with the line hello from lambda.'},
  {where:'Clean up', task:'Delete everything the lab created.', controls:[
    {type:'toggle', id:'f', label:'Delete the function', want:true, why:'Leave nothing behind.'},
    {type:'toggle', id:'lg', label:'Delete its log group in CloudWatch', want:true, why:'Logs are stored, and storage is billed. Delete the log group too.'},
    {type:'toggle', id:'role', label:'Delete the role Lambda created in IAM', want:true, why:'Unused roles are a security risk: delete them.'}],
   see:'The function, its log group and its role gone.'}]},

 lab6:{steps:[
  {where:'AWS Pricing Calculator', task:'Before building, what does the Pricing Calculator give you?', controls:[
    {type:'choice', id:'calc', label:'It gives you', options:[
      {t:'An estimate of what it will cost', ok:true, why:'Estimate before you build.'},
      {t:'Your bill for last month', why:'That is in Billing and Cost Management: Bills and Cost Explorer.'}]}],
   see:'A monthly cost estimate for the instance.'},
  {where:'Billing and Cost Management', task:'You want charts of what you spent, by service.', controls:[
    {type:'choice', id:'ce', label:'Open', options:[
      {t:'Cost Explorer', ok:true, why:'Charts and forecasts of spending, by service and more.'},
      {t:'AWS Budgets', why:'Budgets alert you about a limit; Cost Explorer shows the charts.'},
      {t:'Cost and Usage Report', why:'The most detailed line-by-line data, not charts.'}]}],
   see:'A cost chart. A new account can take up to a day to fill it in.'},
  {where:'Trusted Advisor', task:'On Basic support, which checks do you get?', controls:[
    {type:'choice', id:'ta', label:'Checks', options:[
      {t:'The core checks only', ok:true, why:'Basic gets the service quota checks and a few core security checks; Business (Business Support+ today) and up get all of them.'},
      {t:'All checks', why:'All checks come with Business (Business Support+ today) and up.'}]}],
   see:'Check categories such as Security and Service limits; some are locked on Basic support.'},
  {where:'Support › Support plans', task:'Production is down and you need 24/7 phone help. The cheapest plan, as the exam tests it?', controls:[
    {type:'choice', id:'plan', label:'Plan', options:[
      {t:'Business (Business Support+ for new accounts today)', ok:true, why:'The first plan with 24/7 phone and chat, under 1 hour when production is down.'},
      {t:'Developer', why:'Business-hours email only.'},
      {t:'Basic', why:'No technical support cases.'}]}],
   see:'Basic as your plan, next to the plans available since December 2025.'}]}
};

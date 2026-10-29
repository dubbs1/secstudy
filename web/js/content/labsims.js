// "Practise here": each lab done first in a practice console inside the app, with no AWS account and no cost.
// Drawn by web/js/views/labsim.js. It follows the real console's layout, wording and flow (menus, breadcrumbs, form
// sections, the main button, the page you land on, success and error banners), so the real thing looks familiar.
// It has no AWS logo or colours and says "Practice console" at the top, so it can't be mistaken for the real site.
// Sign-in pages stay generic on purpose. Data only.
//
// Lab: service (shown in the top bar), nav (the service's left menu), steps.
// Step: crumbs, title, nav (the menu item that is open), task (what to do), controls, action (the main button; none
//   when a control is the action itself), see (what the real console shows next, for the coach), after (the page you
//   land on: {title, crumbs, flash, table {cols, rows, empty}, panel [lines], mono}). {id} in any text is replaced by
//   the value typed for that control (e.g. {name} becomes the bucket name).
// Controls (all must be right to finish the step; each wrong one explains itself in the coach):
//   choice  options [{t, ok, why, err}]; style: radio (default), tiles, buttons (a toolbar on the list in `list`),
//           menu (a dropdown such as Instance state). err: the console's own error banner for a wrong button.
//   text    need (a pattern, as text), bad [{re, why}], taken [names in use], same (must equal another control's
//           value, e.g. typing the bucket name to confirm), hint, desc (the console's helper text)
//   toggle  want, on (starting state), why; style: checkbox (default) or switch
//   cmd     expect (patterns), output; prompt; window (the terminal's title) or editor {file, before, after} (a code
//           editor with one line to write, indented inside the handler)
//   note    read-only text the page shows (e.g. the Region a bucket is created in)
// pre: the option or state the real console starts with (the learner must change it when it is wrong).
// Lab region: what the top bar shows ('Global' for IAM and Billing).
// Any control may have a section (the box it sits in) and a desc.
const LAB_SIMS = {
 lab1:{service:'Account setup', region:'Global', nav:['Console Home', 'Billing and Cost Management', 'Budgets', 'Security credentials'], steps:[
  {crumbs:['Sign up', 'Choose a plan'], title:'Choose your account plan', task:'Choose a plan for your new account.', action:'Continue', controls:[
    {type:'choice', id:'plan', style:'tiles', section:'Account plan', options:[
      {t:'Free plan', ok:true, why:'$100 in credits (up to $200 with activities). It ends after 6 months or when the credits run out, and overruns use credits, not your card.'},
      {t:'Paid plan', why:'The Paid plan bills your card for anything beyond the credits. These labs assume the Free plan.'}]}],
   see:'The Free plan selected, then the next sign-up step.'},
  {crumbs:['IAM', 'Security credentials'], nav:'Security credentials', title:'My security credentials (root user)', task:'Protect the root user.',
   list:{title:'Multi-factor authentication (MFA) (0)', cols:['Device type', 'Identifier'], rows:[], empty:'No MFA devices. Assign an MFA device to improve the security of your account.'},
   controls:[
    {type:'choice', id:'mfa', style:'buttons', options:[
      {t:'Assign MFA device', ok:true, why:'Root can do anything in the account, so it needs a second factor.'},
      {t:'Create access key', why:'Never create access keys for root: if they leak, someone gets full control of the account.', err:'Root user access keys are not recommended. Use an IAM user or role instead.'}]}],
   see:'The root user listed with an MFA device assigned.',
   after:{title:'My security credentials (root user)', flash:'MFA device assigned.', table:{title:'Multi-factor authentication (MFA) (1)', cols:['Device type', 'Identifier'], rows:[['Authenticator app', 'root-phone']]}}},
  {crumbs:['Billing and Cost Management', 'Budgets', 'Create budget'], nav:'Budgets', title:'Create budget', task:'Get an email when anything starts to cost money.', action:'Create budget', controls:[
    {type:'choice', id:'tpl', style:'tiles', section:'Templates', options:[
      {t:'Zero spend budget', ok:true, why:'It emails you once your costs go above $0.01. Budgets update a few times a day, not instantly.'},
      {t:'Monthly cost budget', why:'Useful later, with a monthly amount. For a learning account the zero spend budget warns you earliest.'}]},
    {type:'text', id:'email', label:'Email recipients', section:'Zero spend budget', desc:'Enter the email addresses to notify when spending goes above $0.01.', need:'^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', bad:[{re:'^\\s*$', why:'Enter the email address where alerts should go.'}], hint:'you@example.com'}],
   see:'Your zero spend budget in the Budgets list.',
   after:{title:'Budgets', crumbs:['Billing and Cost Management', 'Budgets'], flash:'Your budget My Zero-Spend Budget has been created.', table:{title:'Budgets (1)', cols:['Name', 'Type', 'Amount', 'Alerts to'], rows:[['My Zero-Spend Budget', 'Cost', '$0.01', '{email}']]}}},
  {crumbs:['Sign in'], title:'Check that MFA works', task:'Sign out and back in. Type the 6-digit code your authenticator app shows (any 6 digits here).', action:'Submit', controls:[
    {type:'text', id:'code', label:'MFA code', desc:'The code changes every 30 seconds.', need:'^\\d{6}$', bad:[{re:'\\D', why:'The code is digits only.'}], hint:'6 digits'}],
   see:'The console opens: MFA works.', after:{title:'Console Home', crumbs:['Console Home'], flash:'Signed in with MFA.', panel:['Recently visited: Budgets, IAM', 'Explore AWS: activities that earn credits']}}]},

 lab2:{service:'IAM', region:'Global', nav:['Dashboard', 'User groups', 'Users', 'Roles', 'Policies'], steps:[
  {crumbs:['IAM', 'User groups', 'Create user group'], nav:'User groups', title:'Create user group', task:'Create a group for admins.', action:'Create user group', controls:[
    {type:'text', id:'group', label:'User group name', section:'Name the group', desc:'Maximum 128 characters. Use alphanumeric and +=,.@-_ characters.', need:'^[\\w+=,.@-]{1,128}$', bad:[{re:'\\s', why:'IAM names cannot contain spaces.'}], hint:'Admins'},
    {type:'choice', id:'policy', section:'Attach permissions policies', options:[
      {t:'AdministratorAccess', ok:true, why:'Full access, for the user that replaces root in daily work. In a team you would give each person only what they need (least privilege).'},
      {t:'AmazonS3ReadOnlyAccess', why:'Too little for this lab: the admin user must be able to do everything root does day to day, except the few root-only tasks.'},
      {t:'(No policy selected)', why:'A group without a policy gives its members no permissions at all.'}]}],
   see:'The group in the user groups list, with AdministratorAccess under Permissions.',
   after:{title:'User groups', crumbs:['IAM', 'User groups'], flash:'{group} user group created.', table:{title:'User groups (1)', cols:['Group name', 'Users', 'Permissions'], rows:[['{group}', '0', 'Defined']]}}},
  {crumbs:['IAM', 'Users', 'Create user'], nav:'Users', title:'Specify user details', task:'Create your own user and let it sign in to the console.', action:'Next', controls:[
    {type:'text', id:'user', label:'User name', section:'User details', desc:'The user name can have up to 64 characters. Valid characters: A-Z, a-z, 0-9, and + = , . @ _ -', need:'^[\\w+=,.@-]{1,64}$', bad:[{re:'\\s', why:'IAM names cannot contain spaces.'}], taken:['admin'], hint:'e.g. alex'},
    {type:'toggle', id:'console', label:'Provide user access to the AWS Management Console - optional', section:'User details', want:true, why:'Without console access this user could only use access keys, and could not sign in to the console.'},
    {type:'choice', id:'kind', section:'User details', label:'Are you providing console access to a person?', pre:0, options:[
      {t:'Specify a user in Identity Center - Recommended', why:'Identity Center is the recommended way for people in organisations with many accounts. This lab makes a single IAM user in your own account, so choose the IAM user option.'},
      {t:'I want to create an IAM user', ok:true, why:'An IAM user in this account, with its own console password: what this lab is about.'}]},
    {type:'choice', id:'pw', section:'User details', label:'Console password', options:[
      {t:'Autogenerated password', ok:true, why:'Shown once at the end; the user sets a new one at first sign-in.'},
      {t:'Custom password', ok:true, why:'Fine too: you choose it now.'}]}],
   see:'The Set permissions page.'},
  {crumbs:['IAM', 'Users', 'Create user'], nav:'Users', title:'Set permissions', task:'Give the user its permissions.', action:'Next', controls:[
    {type:'choice', id:'how', style:'tiles', section:'Permissions options', options:[
      {t:'Add user to group', ok:true, why:'Permissions come from the group ({group}): change the group and every member changes with it.'},
      {t:'Attach policies directly', why:'It works, but groups are easier to manage. Attach policies to groups, then put users in them.'}]}],
   see:'The Review and create page.'},
  {crumbs:['IAM', 'Users', 'Create user'], nav:'Users', title:'Review and create', task:'Check the summary, then create the user.', action:'Create user',
   list:{title:'User details', cols:['Setting', 'Value'], rows:[['User name', '{user}'], ['Console password type', 'Autogenerated'], ['Require password reset', 'Yes'], ['Permissions summary', 'Group: {group}']]}, controls:[],
   see:'The sign-in URL, user name and password, with a Download .csv button.',
   after:{title:'Retrieve password', crumbs:['IAM', 'Users', 'Create user'], flash:'User created successfully.', panel:['Console sign-in URL: https://123456789012.signin.aws.amazon.com/console', 'User name: {user}', 'Console password: ******** (shown once)', '[ Download .csv file ]']}},
  {crumbs:['Sign in'], title:'How you sign in from now on', task:'From now on, how do you sign in for daily work?', action:'Sign in', controls:[
    {type:'choice', id:'signin', options:[
      {t:'The account\'s IAM sign-in URL, as {user}', ok:true, why:'Daily work as an IAM user; root only for the few tasks that need it.'},
      {t:'The root email and password', why:'That is what this lab replaces: keep root locked away with MFA.'}]}],
   see:'The console with your new user\'s name at the top right, not root.', after:{title:'Console Home', crumbs:['Console Home'], flash:'Signed in as {user}.', panel:['Top right: {user} @ 1234-5678-9012']}},
  {crumbs:['IAM', 'Users', '{user}'], nav:'Users', title:'{user}', task:'Protect the new user too.',
   list:{title:'Multi-factor authentication (MFA) (0)', cols:['Device type', 'Identifier'], rows:[], empty:'No MFA devices.'},
   controls:[
    {type:'choice', id:'umfa', style:'buttons', options:[
      {t:'Assign MFA device', ok:true, why:'An admin user is as powerful as it gets after root: it needs MFA too.'},
      {t:'Create access key', why:'Access keys are for programs (the CLI and SDKs); they do nothing to protect your sign-in. This step is about MFA.', err:'Access keys are for the CLI and SDKs. They don\'t protect console sign-in.'}]}],
   see:'Your user listed with an MFA device assigned.', after:{title:'{user}', flash:'MFA device assigned.', table:{title:'Multi-factor authentication (MFA) (1)', cols:['Device type', 'Identifier'], rows:[['Authenticator app', '{user}-phone']]}}}]},

 lab3:{service:'Amazon S3', nav:['General purpose buckets', 'Access Points', 'Storage Lens', 'Block Public Access settings'], steps:[
  {crumbs:['Amazon S3', 'Buckets', 'Create bucket'], nav:'General purpose buckets', title:'Create bucket', task:'Name the bucket, pick the Region, keep it private, turn on versioning, create it.', action:'Create bucket', controls:[
    {type:'note', id:'region', section:'General configuration', label:'AWS Region', t:'Europe (Frankfurt) eu-central-1', desc:'The bucket is made in the Region chosen at the top right. Pick the one nearest your users before you start.'},
    {type:'choice', id:'btype', style:'tiles', section:'General configuration', label:'Bucket type', pre:0, options:[
      {t:'General purpose', ok:true, why:'The usual bucket, for most uses and every storage class.'},
      {t:'Directory', why:'Directory buckets are for S3 Express One Zone: very fast, in a single Availability Zone. Not this lab.'}]},
    {type:'text', id:'name', label:'Bucket name', section:'General configuration', desc:'Bucket names must be 3 to 63 characters and unique within the global namespace. They must begin and end with a letter or number. Valid characters are a-z, 0-9, periods (.) and hyphens (-).',
     need:'^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$',
     bad:[{re:'[A-Z]', why:'Bucket names can only use lowercase letters.'}, {re:'\\s', why:'No spaces in bucket names.'}, {re:'_', why:'No underscores: use hyphens instead.'},
          {re:'^.{0,2}$', why:'At least 3 characters.'}, {re:'^.{64,}$', why:'At most 63 characters.'}, {re:'^[.-]|[.-]$', why:'Start and end with a letter or a number.'},
          {re:'\\.\\.', why:'No two periods in a row.'}, {re:'^\\d+\\.\\d+\\.\\d+\\.\\d+$', why:'Must not look like an IP address.'},
          {re:'^(xn--|sthree-|amzn-s3-demo-)', why:'That prefix is reserved by AWS.'}, {re:'(-s3alias|--ol-s3|\\.mrap|--x-s3|--table-s3)$', why:'That ending is reserved by AWS.'}],
     taken:['test', 'my-bucket', 'bucket', 'photos'], hint:'myawsbucket'},
    {type:'toggle', id:'block', label:'Block all public access', section:'Block Public Access settings for this bucket', want:true, on:true, why:'Turning it off lets a bucket policy or ACL make your files public to anyone. Leave it on unless you mean to publish them.'},
    {type:'choice', id:'ver', section:'Bucket Versioning', desc:'Versioning keeps every version of an object, so you can recover from mistakes.', pre:0, options:[
      {t:'Disable', why:'With versioning off, uploading a file with the same name overwrites the old one for good.'},
      {t:'Enable', ok:true, why:'With versioning on, uploading a file with the same name keeps the old one as a version.'}]}],
   see:'Your new bucket in the bucket list.',
   after:{title:'General purpose buckets', crumbs:['Amazon S3', 'Buckets'], flash:'Successfully created bucket "{name}"', table:{title:'General purpose buckets (1)', cols:['Name', 'AWS Region', 'Creation date'], rows:[['{name}', 'Europe (Frankfurt) eu-central-1', 'Just now']]}}},
  {crumbs:['Amazon S3', 'Buckets', '{name}', 'Upload'], nav:'General purpose buckets', title:'Upload', task:'Upload notes.txt.', action:'Upload',
   list:{title:'Files and folders (1)', cols:['Name', 'Type', 'Size'], rows:[['notes.txt', 'text/plain', '1.0 KB']]}, controls:[],
   see:'The file listed inside the bucket.',
   after:{title:'{name}', crumbs:['Amazon S3', 'Buckets', '{name}'], flash:'Upload succeeded', table:{title:'Objects (1)', cols:['Name', 'Type', 'Size', 'Storage class'], rows:[['notes.txt', 'txt', '1.0 KB', 'Standard']]}}},
  {crumbs:['Amazon S3', 'Buckets', '{name}', 'Upload'], nav:'General purpose buckets', title:'Upload', task:'Change the file on your computer and upload it again with the same name.', action:'Upload',
   list:{title:'Files and folders (1)', cols:['Name', 'Type', 'Size'], rows:[['notes.txt', 'text/plain', '2.0 KB']]}, controls:[],
   see:'Still one file in the list: the new copy is now the current version.',
   after:{title:'{name}', crumbs:['Amazon S3', 'Buckets', '{name}'], flash:'Upload succeeded', table:{title:'Objects (1)', cols:['Name', 'Type', 'Size', 'Storage class'], rows:[['notes.txt', 'txt', '2.0 KB', 'Standard']]}}},
  {crumbs:['Amazon S3', 'Buckets', '{name}'], nav:'General purpose buckets', title:'{name}', task:'See both copies of notes.txt.',
   list:{title:'Objects (1)', cols:['Name', 'Type', 'Size'], rows:[['notes.txt', 'txt', '2.0 KB']]}, controls:[
    {type:'toggle', id:'show', label:'Show versions', style:'switch', want:true, why:'The older copy is only listed with Show versions on.'}],
   see:'Two versions of the file, the newest marked as the latest.',
   after:{title:'{name}', crumbs:['Amazon S3', 'Buckets', '{name}'], table:{title:'Objects (2)', cols:['Name', 'Version ID', 'Size'], rows:[['notes.txt', '3sL4kqtJlcpXroDTDmJ (Current version)', '2.0 KB'], ['notes.txt', 'Q7xNb2LvR0eCq5yWm8A', '1.0 KB']]}}},
  {crumbs:['Amazon S3', 'Buckets'], nav:'General purpose buckets', title:'General purpose buckets', task:'Clean up. The bucket is selected: what do you do first?',
   list:{title:'General purpose buckets (1)', cols:['Name', 'AWS Region'], rows:[['{name}', 'Europe (Frankfurt) eu-central-1']], selected:0}, controls:[
    {type:'choice', id:'clean', style:'buttons', options:[
      {t:'Empty', ok:true, why:'A bucket must be empty, old versions included, before it can be deleted.'},
      {t:'Delete', why:'S3 refuses: a bucket must be empty, old versions included, before it can be deleted.', err:'This bucket is not empty. Buckets must be empty before they can be deleted.'}]}],
   see:'The Empty bucket page, where you type permanently delete to confirm; then every object and version deleted.', after:{title:'Empty bucket', crumbs:['Amazon S3', 'Buckets', 'Empty bucket'], flash:'Successfully emptied bucket "{name}"', panel:['Objects deleted: 2 (both versions of notes.txt)']}},
  {crumbs:['Amazon S3', 'Buckets', 'Delete bucket'], nav:'General purpose buckets', title:'Delete bucket', task:'Now delete it. S3 asks you to type the bucket name to confirm.', action:'Delete bucket', controls:[
    {type:'text', id:'confirm', label:'To confirm deletion, enter the name of the bucket in the text input field.', section:'Delete bucket "{name}"', same:'name', hint:'{name}'}],
   see:'The bucket gone from the bucket list.', after:{title:'General purpose buckets', crumbs:['Amazon S3', 'Buckets'], flash:'Successfully deleted bucket "{name}"', table:{title:'General purpose buckets (0)', cols:['Name', 'AWS Region'], rows:[], empty:'No buckets'}}}]},

 lab4:{service:'EC2', nav:['EC2 Dashboard', 'Instances', 'Launch Templates', 'Security Groups', 'Key Pairs', 'Volumes'], steps:[
  {crumbs:['EC2', 'Instances', 'Launch an instance'], nav:'Instances', title:'Launch an instance', task:'Fill in the launch page: name, image, size, key pair, network. Then launch.', action:'Launch instance', controls:[
    {type:'text', id:'iname', label:'Name', section:'Name and tags', need:'^.{1,255}$', bad:[{re:'^\\s*$', why:'Give the instance a name, e.g. test.'}], hint:'test'},
    {type:'choice', id:'ami', style:'tiles', section:'Application and OS Images (Amazon Machine Image)', options:[
      {t:'Amazon Linux', ok:true, why:'Free tier eligible, and the next steps use Linux commands.'},
      {t:'Windows', why:'It works, but the next steps use a Linux terminal, and Windows licences cost more.'}]},
    {type:'choice', id:'type', section:'Instance type', options:[
      {t:'t3.micro · 2 vCPU · 1 GiB · Free tier eligible', ok:true, why:'Small and cheap: plenty for a test. (The console marks whichever small type is Free tier eligible in your Region.)'},
      {t:'m5.4xlarge · 16 vCPU · 64 GiB', why:'Far more than a test needs, and it uses your credits quickly. Right-size: pick the smallest that does the job.'}]},
    {type:'choice', id:'key', section:'Key pair (login)', options:[
      {t:'Proceed without a key pair', ok:true, why:'This lab connects with EC2 Instance Connect from the browser, which needs no key pair.'},
      {t:'Create new key pair', ok:true, why:'Fine too, for SSH from your own computer later; Instance Connect in the browser doesn\'t need it.'}]},
    {type:'choice', id:'sg', section:'Network settings: Create security group', options:[
      {t:'Allow SSH traffic from Anywhere (0.0.0.0/0)', ok:true, why:'Instance Connect in the browser comes from AWS\'s own addresses, so port 22 must be open to them (Anywhere, or the EC2 Instance Connect prefix list). A security group allows nothing else in.'},
      {t:'Allow HTTP traffic from the internet', why:'That opens port 80 for a website, and this server runs none. Allow only what you need: SSH to connect.'}]}],
   see:'A success message with the new instance ID.',
   after:{title:'Instances', crumbs:['EC2', 'Instances'], flash:'Successfully initiated launch of instance (i-0a1b2c3d4e5f67890)', table:{title:'Instances (1)', cols:['Name', 'Instance ID', 'Instance state', 'Instance type'], rows:[['{iname}', 'i-0a1b2c3d4e5f67890', '● Running', 't3.micro']]}}},
  {crumbs:['EC2', 'Instances', 'i-0a1b2c3d4e5f67890', 'Connect to instance'], nav:'Instances', title:'Connect to instance', task:'Connect from the browser.', action:'Connect', controls:[
    {type:'choice', id:'how', style:'tiles', section:'Connection method', options:[
      {t:'EC2 Instance Connect', ok:true, why:'A terminal in the browser: no key pair or software on your computer.'},
      {t:'SSH client', why:'That needs a key pair and a terminal on your own computer; this lab has neither.'},
      {t:'Session Manager', why:'Also works without opening port 22, but it needs an IAM role and the SSM agent set up first.'}]}],
   see:'A terminal opening in your browser.'},
  {crumbs:['EC2 Instance Connect'], nav:'Instances', title:'EC2 Instance Connect', task:'You are on the server. Type uname -a and press Enter.', controls:[
    {type:'cmd', id:'uname', window:'i-0a1b2c3d4e5f67890 ({iname})', banner:['Amazon Linux 2023', 'https://aws.amazon.com/linux/amazon-linux-2023'], prompt:'[ec2-user@ip-172-31-5-20 ~]$', expect:['^\\s*uname\\s+-a\\s*$'], output:'Linux ip-172-31-5-20 6.1.0 x86_64 GNU/Linux'}],
   see:'A line that starts with Linux: you are on a Linux server in AWS.'},
  {crumbs:['EC2', 'Instances'], nav:'Instances', title:'Instances', task:'Finish without leaving anything that costs credits. The instance is selected: open Instance state.',
   list:{title:'Instances (1)', cols:['Name', 'Instance ID', 'Instance state'], rows:[['{iname}', 'i-0a1b2c3d4e5f67890', '● Running']], selected:0}, controls:[
    {type:'choice', id:'end', style:'menu', label:'Instance state', options:[
      {t:'Stop instance', why:'A stopped instance costs nothing to run, but its EBS disk is still stored and billed. Terminate to remove it all.'},
      {t:'Reboot instance', why:'It restarts and keeps running, and costing.'},
      {t:'Terminate (delete) instance', ok:true, why:'Deletes the instance, and its root disk with it.'}]}],
   see:'Instance state: Terminated. Volumes shows no disk left from it.',
   after:{title:'Instances', crumbs:['EC2', 'Instances'], flash:'Successfully initiated termination of i-0a1b2c3d4e5f67890', table:{title:'Instances (1)', cols:['Name', 'Instance ID', 'Instance state'], rows:[['{iname}', 'i-0a1b2c3d4e5f67890', '○ Terminated']]}}}]},

 lab5:{service:'Lambda', nav:['Dashboard', 'Applications', 'Functions'], steps:[
  {crumbs:['Lambda', 'Functions', 'Create function'], nav:'Functions', title:'Create function', task:'Author a function from scratch in Python.', action:'Create function', controls:[
    {type:'choice', id:'src', style:'tiles', options:[
      {t:'Author from scratch', ok:true, why:'Start with a simple Hello World example: what this lab needs.'},
      {t:'Use a blueprint', why:'Blueprints are sample code for other jobs; this lab starts from scratch.'},
      {t:'Container image', why:'For functions packaged as container images; not this lab.'}]},
    {type:'text', id:'fname', label:'Function name', section:'Basic information', desc:'Function names can be up to 64 characters: letters, numbers, hyphens and underscores.', need:'^[A-Za-z0-9_-]{1,64}$', bad:[{re:'\\s', why:'No spaces in function names.'}], hint:'hello'},
    {type:'choice', id:'rt', section:'Basic information', label:'Runtime', pre:1, options:[
      {t:'Python 3.13', ok:true, why:'The code in this lab is Python.'},
      {t:'Node.js 22.x', why:'Lambda runs Node.js too, but this lab\'s code is Python.'}]}],
   see:'The function page with a code editor.',
   after:{title:'{fname}', crumbs:['Lambda', 'Functions', '{fname}'], flash:'Successfully created the function {fname}. You can now change its code and configuration.', panel:['Code  ·  Test  ·  Monitor  ·  Configuration']}},
  {crumbs:['Lambda', 'Functions', '{fname}'], nav:'Functions', title:'{fname}', task:'Inside the handler, write a line that prints hello from lambda. Then Deploy.', action:'Deploy', controls:[
    {type:'cmd', id:'code', editor:{file:'lambda_function.py', before:['import json', '', 'def lambda_handler(event, context):', '    # TODO implement'], after:['    return {', '        \'statusCode\': 200,', '        \'body\': json.dumps(\'Hello from Lambda!\')', '    }']},
     expect:['^\\s*print\\(\\s*"hello from lambda"\\s*\\)\\s*$', '^\\s*print\\(\\s*\'hello from lambda\'\\s*\\)\\s*$'], output:'Successfully updated the function.'}],
   see:'A message that the function was updated.', after:{title:'{fname}', crumbs:['Lambda', 'Functions', '{fname}'], flash:'Successfully updated the function {fname}.', panel:['Changes deployed']}},
  {crumbs:['Lambda', 'Functions', '{fname}'], nav:'Functions', title:'{fname}', task:'Run it: the first Test asks you to create a test event. Name it, keep the default JSON, then Test.', action:'Test', controls:[
    {type:'text', id:'ev', label:'Event name', section:'Create new test event', desc:'Up to 25 characters: letters, numbers, dots, hyphens and underscores.', need:'^[\\w.-]{1,25}$', bad:[{re:'\\s', why:'No spaces in event names.'}, {re:'^\\s*$', why:'Give the test event a name.'}], hint:'test1'}],
   see:'Status: Succeeded in the output panel, with Function Logs underneath.',
   after:{title:'Execution results', crumbs:['Lambda', 'Functions', '{fname}'], flash:'Executing function: succeeded', mono:true, panel:['Status: Succeeded', 'Function Logs:', 'START RequestId: 6f0c7a1e Version: $LATEST', 'hello from lambda', 'END RequestId: 6f0c7a1e', 'REPORT RequestId: 6f0c7a1e  Duration: 1.42 ms  Billed Duration: 2 ms']}},
  {crumbs:['Lambda', 'Functions', '{fname}', 'Monitor'], nav:'Functions', title:'{fname}', task:'Find the printed line where Lambda keeps it.',
   list:{title:'Monitor', cols:['Metric', 'Last hour'], rows:[['Invocations', '1'], ['Errors', '0'], ['Duration', '1.42 ms']]}, controls:[
    {type:'choice', id:'logs', style:'buttons', options:[
      {t:'View CloudWatch logs', ok:true, why:'Lambda sends what your code prints to a CloudWatch log group.'},
      {t:'View CloudTrail events', why:'CloudTrail records API calls (who did what), not what your code prints.', err:'CloudTrail shows API calls, not your function\'s output.'},
      {t:'View X-Ray traces', why:'X-Ray shows how a request travelled and how long each part took, not what your code prints.', err:'X-Ray shows traces and timings. Printed lines are in CloudWatch Logs.'}]}],
   see:'A log stream with the line hello from lambda.',
   after:{title:'/aws/lambda/{fname}', crumbs:['CloudWatch', 'Log groups', '/aws/lambda/{fname}'], mono:true, panel:['Log stream 2026/10/29/[$LATEST]6f0c7a1e', 'START RequestId: 6f0c7a1e Version: $LATEST', 'hello from lambda', 'END RequestId: 6f0c7a1e']}},
  {crumbs:['Clean up'], title:'Clean up', task:'Delete everything the lab created, then Delete.', action:'Delete', controls:[
    {type:'toggle', id:'f', label:'Lambda › Functions › {fname}', section:'Select what to delete', want:true, why:'Leave nothing behind.'},
    {type:'toggle', id:'lg', label:'CloudWatch › Log groups › /aws/lambda/{fname}', section:'Select what to delete', want:true, why:'Logs are stored, and storage is billed. Delete the log group too.'},
    {type:'toggle', id:'role', label:'IAM › Roles › {fname}-role-a1b2c3d4 (made by Lambda)', section:'Select what to delete', want:true, why:'Unused roles are a security risk: delete them.'}],
   see:'The function, its log group and its role gone.', after:{title:'Clean up', flash:'Deleted the function, its log group and its role.', panel:['Nothing left from this lab.']}}]},

 lab6:{service:'Billing and Cost Management', region:'Global', nav:['Home', 'Bills', 'Cost Explorer', 'Budgets', 'Free Tier', 'Trusted Advisor', 'Support'], steps:[
  {crumbs:['AWS Pricing Calculator', 'Add service'], title:'Before you build', task:'Before building, what does the Pricing Calculator give you?', action:'Check', controls:[
    {type:'choice', id:'calc', options:[
      {t:'An estimate of what it will cost', ok:true, why:'Estimate before you build.'},
      {t:'Your bill for last month', why:'That is in Billing and Cost Management: Bills and Cost Explorer.'}]}],
   see:'A monthly cost estimate for the instance.', after:{title:'Estimate summary', crumbs:['AWS Pricing Calculator', 'My Estimate'], panel:['Amazon EC2: t3.micro, Linux, on-demand, 730 hours a month', 'Monthly cost: about $8 to $9 (varies by Region)']}},
  {crumbs:['Billing and Cost Management', 'Home'], nav:'Home', title:'Billing and Cost Management', task:'You want charts of what you spent, by service. Open the right page.',
   list:{title:'Cost summary', cols:['', 'Amount'], rows:[['Month-to-date cost', '$0.00'], ['Credits remaining', '$100.00']]}, controls:[
    {type:'choice', id:'ce', style:'buttons', options:[
      {t:'Cost Explorer', ok:true, why:'Charts and forecasts of spending, by service and more.'},
      {t:'Budgets', why:'Budgets alert you about a limit; Cost Explorer shows the charts.', err:'Budgets lists your budgets and alerts, not spending charts.'},
      {t:'Data Exports (Cost and Usage Report)', why:'The most detailed line-by-line data, not charts.', err:'Data Exports delivers detailed files to S3, not charts.'}]}],
   see:'A cost chart. A new account can take up to a day to fill it in.', after:{title:'Cost Explorer', crumbs:['Billing and Cost Management', 'Cost Explorer'], panel:['Costs by service, last 6 months (bar chart)', 'A new account can take up to a day to fill it in.']}},
  {crumbs:['Trusted Advisor', 'Recommendations'], nav:'Trusted Advisor', title:'Trusted Advisor', task:'On Basic support, which checks do you get?', action:'Check', controls:[
    {type:'choice', id:'ta', options:[
      {t:'The core checks only', ok:true, why:'Basic gets the service quota checks and a few core security checks; Business (Business Support+ today) and up get all of them.'},
      {t:'All checks', why:'All checks come with Business (Business Support+ today) and up.'}]}],
   see:'Check categories such as Security and Service limits; some are locked on Basic support.'},
  {crumbs:['Support', 'Support plans'], nav:'Support', title:'Support plans', task:'Production is down and you need 24/7 phone help. The cheapest plan, as the exam tests it?', action:'Check', controls:[
    {type:'choice', id:'plan', options:[
      {t:'Business (Business Support+ for new accounts today)', ok:true, why:'The first plan with 24/7 phone and chat, under 1 hour when production is down.'},
      {t:'Developer', why:'Business-hours email only.'},
      {t:'Basic', why:'No technical support cases.'}]}],
   see:'Basic as your plan, next to the plans available since December 2025.'}]}
};

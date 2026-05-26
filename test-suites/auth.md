## [] Authentication Tests

- Manual, Hybrid, API and UI coverage for User auth flows

### User Registration

- Verify User can create New Account

#### Navigate to and Verify "Signup/Login" Page

- Open AutomationExercise Website
- Click "Signup/Login" Button
- Verify "Signup/Login" Page is visible

#### Complete "New User Signup!" Form with valid User data

- Fill "Name" Field
- Fill "Email Address" Field
- Click "Signup" Button

#### Complete Account Information and verify successful Account creation

- Select Title (Mr/Mrs)
- Fill "Password" Field
- Fill "Date of Birth" Fields
- Fill required Address details
- Click "Create Account" Button
- Verify "Account Created Successfully!" Message appears

### Login With Wrong Password

- Verify system rejects Login with incorrect Password
- Existing User credentials are auto-filled with invalid Password

#### Navigate to and Verify "Signup/Login" Page

- Open AutomationExercise Website
- Click "Signup/Login" Button
- Verify "Signup/Login" Page is visible

#### Attempt Login with invalid Password and verify Error Message

- Click "Login" Button
- Verify "Invalid Email or Password!" Error Message appears

### Verify Login Without Email

- Verify system rejects Login without Email

#### Navigate to and Verify "Signup/Login" Page

- Open AutomationExercise Website
- Click "Signup/Login" Button
- Verify "Signup/Login" Page is visible

#### Enter Password without Email and verify validation error

- Leave Email field empty
- Fill "Password" Field
- Click "Login" button
- Verify validation error appears
- Verify user remains on login page

### User Login

- Verify existing User can Login

#### Navigate to and Verify "Signup/Login" Page

- Open AutomationExercise Website
- Click "Signup/Login" Button
- Verify "Signup/Login" Page is visible

#### Enter valid login credentials and verify successful authentication

- Fill "Email Address" Field
- Fill "Password" Field
- Click "Login" Button
- Verify User is redirected to Account Page
- Verify "Logged in as [user name]" Message appears in header

### Delete User Account

- Verify User can delete their Account

#### Navigate to and Verify "Signup/Login" Page

- Open AutomationExercise Website
- Click "Signup/Login" Button
- Verify "Signup/Login" Page is visible

#### Enter valid login credentials and verify successful authentication

- Fill "Email Address" Field
- Fill "Password" Field
- Click "Login" Button
- Verify User is redirected to Account Page
- Verify "Logged in as [user name]" Message appears in header

#### Delete Account and verify Account removal

- Click "Delete Account" Button in header
- Verify Account deletion confirmation Message is displayed
- Verify Login fails with the deleted credentials

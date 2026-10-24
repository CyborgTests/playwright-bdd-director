## Authentication API

Tags: @api

- API coverage of User auth flows: the same rules as auth.md, checked without a browser

---

### Background

#### Verify Login Page is accessible

---

### Register New User

#### Register New User and verify Account is created

- Registration data comes from a fresh random User

---

### Login With Wrong Password

#### Verify Login with wrong Password is rejected

---

### Login Without Email

#### Verify Login without Email is rejected

---

### User Login

Tags: @smoke

#### Verify Login with valid credentials succeeds

---

### Update User City

- Not automated yet: an API test with a step left without definition stays test.fixme

#### Register New User and verify Account is created

#### Update City and verify it is saved

---

### Delete User Account

#### Delete Account and verify Login is rejected afterwards

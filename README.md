# Sneaker Stash

PROJECT OVERVIEW
Build a mobile-first Fintech/Investment web application for Nike sneaker staking platform. Stack: React (Vite), Supabase (PostgreSQL, Auth, Realtime, RLS), Tailwind CSS, Lucide Icons. Theme: White & Nike Blue (#0052FF), Cyan electric (#00E5FF), Slate gray (#64748B).

PROJECT ARCHITECTURE
text
src/
├── pages/
│   ├── auth/
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── client/
│   │   ├── Products.jsx        (Route: /)
│   │   ├── MyProducts.jsx      (Route: /my-products)
│   │   ├── Team.jsx            (Route: /team)
│   │   └── Profile.jsx         (Route: /profile)
│   ├── client/subpages/
│   │   ├── WithdrawRequest.jsx
│   │   ├── Missions.jsx
│   │   ├── AccountDetails.jsx
│   │   ├── RechargeHistory.jsx
│   │   ├── WithdrawHistory.jsx
│   │   ├── AddBank.jsx
│   │   ├── Support.jsx
│   │   └── ChangePassword.jsx
│   └── admin/
│       ├── AdminDashboard.jsx
│       ├── UsersManagement.jsx
│       ├── ProductsManagement.jsx
│       ├── TransactionsValidation.jsx
│       └── GenealogyTree.jsx
├── components/
│   ├── common/
│   │   ├── BottomNav.jsx
│   │   ├── ProductCard.jsx
│   │   └── ProgressBar.jsx
│   ├── modals/
│   │   └── AnnouncementModal.jsx
│   └── admin/
│       └── FraudAlert.jsx
├── context/
│   ├── AuthContext.jsx
│   └── ProductContext.jsx
├── hooks/
│   ├── useAuth.js
│   └── useProducts.js
├── utils/
│   ├── supabase.js
│   └── validators.js
└── types/
    └── index.ts
SUPABASE DATABASE SCHEMA
TABLES
sql
-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  phone VARCHAR(20) UNIQUE NOT NULL,
  country_code VARCHAR(10) NOT NULL,
  referral_code VARCHAR(6) UNIQUE NOT NULL,
  referred_by UUID REFERENCES profiles(id),
  balance DECIMAL(12,2) DEFAULT 0,
  role VARCHAR(20) DEFAULT 'user', -- 'user', 'promoter', 'admin'
  is_frozen BOOLEAN DEFAULT FALSE,
  total_deposits DECIMAL(12,2) DEFAULT 0,
  total_withdrawals DECIMAL(12,2) DEFAULT 0,
  total_bonus DECIMAL(12,2) DEFAULT 1500, -- Welcome bonus
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products (Nike sneakers)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  image_url TEXT,
  price DECIMAL(10,2) NOT NULL,
  daily_yield DECIMAL(5,2) NOT NULL, -- percentage
  total_yield DECIMAL(5,2) NOT NULL,
  vip_level VARCHAR(20), -- 'VIP1' to 'VIP9'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Products (purchased sneakers)
CREATE TABLE user_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  product_id UUID REFERENCES products(id),
  purchase_date TIMESTAMP DEFAULT NOW(),
  last_claim_date TIMESTAMP,
  total_earned DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' -- 'active', 'completed'
);

-- Transactions (all financial movements)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  type VARCHAR(20) NOT NULL, -- 'deposit', 'withdraw', 'bonus', 'commission', 'yield'
  amount DECIMAL(12,2) NOT NULL,
  fee DECIMAL(12,2) DEFAULT 0, -- For withdrawals: 15% fee
  net_amount DECIMAL(12,2), -- For withdrawals: amount - fee
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reference VARCHAR(50),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bank Accounts (Mobile Money/Bank)
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  provider VARCHAR(20) NOT NULL, -- 'Wave', 'Orange', 'MTN', 'Moov'
  account_number VARCHAR(30) NOT NULL,
  account_name VARCHAR(100),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Missions (tasks)
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  requirement_type VARCHAR(30), -- 'referrals', 'vip_purchase'
  requirement_value INTEGER,
  bonus_amount DECIMAL(10,2),
  icon_name VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Missions Progress
CREATE TABLE user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  mission_id UUID REFERENCES missions(id),
  progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  bonus_claimed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW()
);
POSTGRESQL TRIGGERS & FUNCTIONS
Auto-generate Referral Code (6 alphanumeric)
sql
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 6));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_referral_code
BEFORE INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION generate_referral_code();
Auto-credit Welcome Bonus (1,500 FCFA)
sql
CREATE OR REPLACE FUNCTION credit_welcome_bonus()
RETURNS TRIGGER AS $$
BEGIN
  -- Credit 1,500 FCFA welcome bonus
  NEW.balance := NEW.balance + 1500;
  NEW.total_bonus := NEW.total_bonus + 1500;
  
  -- Create bonus transaction
  INSERT INTO transactions (user_id, type, amount, status, description)
  VALUES (NEW.id, 'bonus', 1500, 'approved', 'Welcome bonus - 1,500 FCFA');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER welcome_bonus_trigger
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION credit_welcome_bonus();
Commission Distribution (3-level: 27%, 2%, 1%)
sql
CREATE OR REPLACE FUNCTION distribute_commissions()
RETURNS TRIGGER AS $$
DECLARE
  referrer_id UUID;
  upline_2_id UUID;
  upline_3_id UUID;
  commission_amount DECIMAL(12,2);
BEGIN
  -- Only for approved deposits
  IF NEW.type = 'deposit' AND NEW.status = 'approved' THEN
    SELECT referred_by INTO referrer_id FROM profiles WHERE id = NEW.user_id;
    
    IF referrer_id IS NOT NULL THEN
      -- Level 1: 27%
      commission_amount := NEW.amount * 0.27;
      UPDATE profiles SET balance = balance + commission_amount, total_bonus = total_bonus + commission_amount WHERE id = referrer_id;
      INSERT INTO transactions (user_id, type, amount, status, description) 
      VALUES (referrer_id, 'commission', commission_amount, 'approved', 'Level 1 commission - ' || NEW.amount);
      
      -- Level 2: 2%
      SELECT referred_by INTO upline_2_id FROM profiles WHERE id = referrer_id;
      IF upline_2_id IS NOT NULL THEN
        commission_amount := NEW.amount * 0.02;
        UPDATE profiles SET balance = balance + commission_amount, total_bonus = total_bonus + commission_amount WHERE id = upline_2_id;
        INSERT INTO transactions (user_id, type, amount, status, description) 
        VALUES (upline_2_id, 'commission', commission_amount, 'approved', 'Level 2 commission - ' || NEW.amount);
        
        -- Level 3: 1%
        SELECT referred_by INTO upline_3_id FROM profiles WHERE id = upline_2_id;
        IF upline_3_id IS NOT NULL THEN
          commission_amount := NEW.amount * 0.01;
          UPDATE profiles SET balance = balance + commission_amount, total_bonus = total_bonus + commission_amount WHERE id = upline_3_id;
          INSERT INTO transactions (user_id, type, amount, status, description) 
          VALUES (upline_3_id, 'commission', commission_amount, 'approved', 'Level 3 commission - ' || NEW.amount);
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER distribute_commissions_trigger
AFTER INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION distribute_commissions();
FINANCIAL RULES & VALIDATIONS
Welcome Bonus
Auto-credited: 1,500 FCFA on registration

Added to balance and total_bonus field

Transaction record created with type 'bonus'

Withdrawal Rules
Minimum amount: 1,000 FCFA (validation in UI + backend)

Fee: 15% deducted from withdrawal amount

Net amount calculation: net_amount = amount - (amount * 0.15)

Display both gross amount and net amount to user

Store both fee and net_amount in transactions table

UI Display Requirements
Withdraw form: Show "Amount (Gross)" input, display "Fee (15%): X FCFA", "Net to receive: Y FCFA"

Withdrawal history: Show gross, fee, and net columns

Admin validation: Show gross, fee, net, and approve/reject buttons

PAGE SPECIFICATIONS
A. AUTHENTICATION
Register (/auth/register)

Country auto-detection with fallback: Côte d'Ivoire (+225), Burkina Faso (+226), Bénin (+229), Cameroun (+237)

Phone input with country code dropdown

Password: minimum 6 characters

Referral code: REQUIRED, 6 alphanumeric characters, validate existence in profiles table

Auto-credit 1,500 FCFA welcome bonus

Create auth.user and profile in one transaction

Login (/auth/login)

Phone number + password authentication

Redirect to / on success

B. CLIENT INTERFACE (Bottom Navigation - 4 Tabs)
Tab 1 - Products (/)

Announcement modal on mount (Telegram channel, rules)

Action buttons: Recharge, Withdraw, Support

Withdraw button: navigate to /withdraw-request

Product catalog grid: Air Force 1, Jordan 1, etc.

Each card shows: daily yield %, total yield %, price, "Buy" button

On purchase: create user_product, deduct balance, generate yield transactions

Validate sufficient balance before purchase

Tab 2 - My Products (/my-products)

List of owned active sneakers

Each shows: countdown timer for next yield claim (24h cooldown)

Claim button triggers daily yield distribution

Status: active/completed

Tab 3 - Team (/team)

Display referral code and shareable link (copy to clipboard)

3-level commission table: L1 27%, L2 2%, L3 1%

Team statistics: total members, active members, total commissions earned

Show downline list with levels

Tab 4 - Profile (/profile)

Total balance display

Navigation to sub-pages: Missions, Account Details, Recharge History, Withdraw History, Add Bank, Support, Change Password

C. CLIENT SUB-PAGES
Withdraw Request (/withdraw-request)

Form with amount input

Real-time calculation: Fee = amount * 0.15, Net = amount - fee

Minimum amount validation: 1,000 FCFA

Validate: amount >= 1000 and balance >= amount

Select bank account from list or add new

Create transaction with type 'withdraw', status 'pending'

Store fee and net_amount in transaction record

Show confirmation modal before submission

Missions (/missions)

List of tasks: "Invite 5 people (500 FCFA)", "Invite 10 people (1000 FCFA)", "Purchase VIP2 (2000 FCFA)", "Purchase VIP5 (5000 FCFA)"

Progress bars showing completion (e.g., 3/5 referrals)

"Claim Bonus" button when requirements met

Auto-credit bonus on claim

Account Details (/account-details)

Financial history with filters: today, 7 days, month, total

Show: credited vs debited breakdown (deposits + bonuses + commissions vs withdrawals)

Transaction list with: type, amount, status, date, description

Color-coded: green for credits, red for debits

Recharge History (/recharge-history)

Full log of deposit transactions with: amount, status (pending/approved/rejected), date, reference

Filter by date range

Withdraw History (/withdraw-history)

Full log of withdrawal transactions with: gross amount, fee (15%), net amount, status, date

Show fee deduction clearly

Add Bank (/add-bank)

Form: provider dropdown (Wave, Orange, MTN, Moov), account number, account name

Save to bank_accounts table

Validate unique account per user/provider

Support (/support)

Cards with redirects: Telegram Group, Telegram Channel, Direct Support

Open external links in new tab

Change Password (/change-password)

Old password, new password (min 6 chars), confirm password

Update auth.users via Supabase Auth API

Show success toast and logout

D. ADMIN PANEL (/admin - role = 'admin')
Dashboard Overview

Stats cards: Total Users, Total Deposits, Total Withdrawals, Pending Transactions

Recent activity feed

Users Management

Table with all users: phone, balance, role, status (active/frozen), total deposits, total withdrawals

Actions: Freeze/Unfreeze (toggle is_frozen), Edit Balance (manual adjustment with reason), Promote to Promoter

Real-time updates via Supabase Realtime

Search by phone or referral code

Products & VIP Management

Assign/Remove products to any user (free of charge)

Overview: all purchases with user details, purchase date, status

Add new products to catalog

Transactions Validation

Deposit validation: list pending deposits with approve/reject buttons

Withdraw validation: list pending withdrawals with: gross amount, 15% fee, net amount, user details

On approve: deduct from user balance, update transaction status to 'approved'

On reject: update transaction status to 'rejected', notify user

Show "Processed by: [admin name]" on approval

Genealogy Tree

Search user by phone/referral code

Display 3-level downline network in tree structure

Show each downline: name, phone, registration date, total deposits

Export to CSV option

Anti-Fraud System (Real-time)

Table showing all users with:

User details (phone, balance)

Theoretical Balance = Approved Deposits + Total Bonus - (Approved Withdrawals + Pending Withdrawals)

Database Balance (current balance)

Difference (Theoretical - Database)

If Theoretical Balance != Database Balance → RED highlight with ⚠️ fraud icon

Emergency button: "Freeze Account" (sets is_frozen = TRUE, creates alert log)

Auto-refresh every 10 seconds via Supabase Realtime subscription

Alert log: timestamp, user, difference amount, status (resolved/pending)

RLS POLICIES (Row Level Security)
sql
-- Profiles: users read own, admins read all
CREATE POLICY users_read_own ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY admins_read_all ON profiles FOR SELECT USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY admins_update_all ON profiles FOR UPDATE USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Transactions: users read own, admins all
CREATE POLICY users_read_own_transactions ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY admins_all_transactions ON transactions FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- User Products: users read own, admins all
CREATE POLICY users_read_own_products ON user_products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY admins_all_user_products ON user_products FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Bank Accounts: users read/write own, admins read all
CREATE POLICY users_manage_own_banks ON bank_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY admins_read_all_banks ON bank_accounts FOR SELECT USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
TECHNICAL REQUIREMENTS
Frontend
Mobile-first responsive design (max-width: 430px container, full-width on mobile)

Tailwind CSS with custom theme: primary #0052FF, cyan #00E5FF, slate #64748B

Lucide React icons throughout

React Router v6 for navigation with protected routes

React Context for auth and product state

React Hook Form for form validation

React Hot Toast for notifications

Supabase Realtime subscriptions for live updates

Backend (Supabase)
Supabase client with proper error handling

Environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

Auth: Phone + Password authentication

Real-time subscriptions: profiles, transactions, user_products

RLS policies as defined above

Protected Routes
/admin: redirect to / if role != 'admin'

All client routes: redirect to /auth/login if not authenticated

Auth routes: redirect to / if already authenticated

Responsive Breakpoints
Mobile: < 640px (full-width, no padding)

Tablet: 640px - 1024px (centered with 2rem padding)

Desktop: > 1024px (centered with max-width 430px)

STARTUP SEQUENCE
Check authentication status on app mount

If authenticated:

Load user profile from profiles table

Load user products and transactions

Load product catalog

If admin: load admin dashboard data

If unauthenticated: redirect to /auth/login

Display announcement modal only once per session (use sessionStorage)

Initialize real-time subscriptions for user data

CONSTRAINTS & VALIDATIONS
Phone number: unique per country code, format: +XXX XXXXXXXX

Referral code: 6 chars alphanumeric, case-insensitive, must exist and not be user's own code

Balance: cannot go negative on purchase or withdrawal

Password: minimum 6 characters, no other restrictions

Commission levels: max 3 levels deep

Withdrawal: minimum 1,000 FCFA, fee 15% calculated automatically

Deposit: no minimum, auto-approved if amount > 0

INITIAL DATA SEED
Products
sql
INSERT INTO products (name, price, daily_yield, total_yield, vip_level, image_url) VALUES
('Air Force 1', 25000, 5, 80, 'VIP1', '/images/airforce1.png'),
('Jordan 1', 35000, 7, 100, 'VIP2', '/images/jordan1.png'),
('Dunk Low', 30000, 6, 90, 'VIP2', '/images/dunklow.png'),
('Air Max', 20000, 4, 70, 'VIP1', '/images/airmax.png'),
('Jordan 4', 45000, 8, 110, 'VIP3', '/images/jordan4.png'),
('Yeezy 350', 40000, 7.5, 95, 'VIP3', '/images/yeezy350.png');
Missions
sql
INSERT INTO missions (name, description, requirement_type, requirement_value, bonus_amount, icon_name) VALUES
('Invite 5 Friends', 'Invite 5 friends to join the platform', 'referrals', 5, 500, 'Users'),
('Invite 10 Friends', 'Invite 10 friends to join the platform', 'referrals', 10, 1000, 'Users'),
('Purchase VIP2', 'Buy any VIP2 product', 'vip_purchase', 2, 2000, 'ShoppingBag'),
('Purchase VIP5', 'Buy any VIP5 product', 'vip_purchase', 5, 5000, 'ShoppingBag'),
('Invite 20 Friends', 'Invite 20 friends to join the platform', 'referrals', 20, 2500, 'Users'),
('Complete VIP Collection', 'Buy products from VIP1 to VIP5', 'vip_purchase', 5, 10000, 'Award');
Admin User
sql
-- Create admin user with phone +2250707070707, password Admin@123
-- Set role = 'admin' in profiles table
ERROR HANDLING
Network errors: show retry option with toast

Auth errors: display user-friendly messages (e.g., "Invalid phone or password")

Validation errors: inline form validation with field-specific messages

Balance errors: "Insufficient balance" with current balance display

Supabase errors: log to console, show generic error message to user

404: custom not found page with navigation back

PERFORMANCE OPTIMIZATION
Lazy load routes with React.lazy()

Image optimization: use WebP format, lazy loading

Pagination for transaction history (20 items per page)

Debounce search inputs in admin

Use memoization for expensive computations

Implement caching for product catalog

Attend les autres photos avant de commencer

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5cc3893b-065f-4419-97d4-7b075c596ee9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

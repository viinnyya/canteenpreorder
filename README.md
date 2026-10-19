# CSPC Canteen Pre-Order System

A web app where CSPC students pre-order food from campus canteen stalls, pay with GCash, and pick up when the order is ready. Stalls manage their menus and orders. Admins manage stalls and students and see sales reports.

Midterm project, 3rd-year BSIT, Camarines Sur Polytechnic Colleges (Naga).

**Stack:** Node.js, Express, EJS, SQLite (better-sqlite3), Bootstrap 5, plain JavaScript. Everything runs locally. No cloud services are needed.

## What each role can do

| Role | Can do |
|------|--------|
| **Student** | Register with a `@my.cspc.edu.ph` email (an admin must approve the account). Browse stalls, search a menu, pre-order items, choose a pickup time, pay by GCash (reference number + receipt screenshot), cancel an order while it is waiting for a payment check, follow the order status, change their password. |
| **Stall** | Log in with an account an admin created. Add, edit, hide and remove menu items, with categories. Import and export the menu as CSV. Check the GCash payment for each order, then accept or reject it (a reason is required). Move accepted orders through preparing, ready, picked up or no-show. Search order history. See their own sales page: revenue, best sellers, daily chart, busiest hours, CSV download. |
| **Admin** | Approve or reject student registrations. Create, remove and restore stall accounts. Import a menu for any stall. See the overview, the sales reports with charts for all stalls, and download them as CSV. |

### How an order moves

```
Student places order
        |
Awaiting payment check --(student cancels)--> Cancelled
        |                  
  stall checks GCash
   |            |
Rejected     Accepted --> Preparing --> Ready for pickup --> Picked up
(with reason)                                  |
                                               +--> No-show
```

Only the stall that owns an order can move it forward. The server checks every change, so a button that is missing from the page cannot be bypassed by editing the request.

### What counts as a sale

Reports and the sales page count only orders whose payment a stall has verified: **accepted, preparing, ready, picked up and no-show**. Rejected, cancelled and still-unchecked orders are not revenue. Dates are grouped by Philippine time (UTC+8).

## Setup

You need [Node.js](https://nodejs.org) (the project was built and tested on Node 24).

```powershell
git clone <repository url>
cd <repository folder>
npm install
copy .env.example .env
```

Open `.env` and change `SESSION_SECRET` to any long random text. You can also set `SEED_ADMIN_PASSWORD` here before the next step.

```powershell
npm run db:setup     # creates the database and the demo accounts
npm start            # http://localhost:3000
```

Want charts that are not empty for a demo? Add about a month of made-up orders:

```powershell
npm run db:demo
```

The demo orders are labelled `DEMO-...` and have no receipt images. Running the command twice does nothing the second time.

### Demo accounts

Created by `npm run db:setup`. Change or remove them before any real use.

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@my.cspc.edu.ph` | the value of `SEED_ADMIN_PASSWORD` (default `change-me-before-demo`) |
| Stall | `rosa.stall@my.cspc.edu.ph` (Aling Rosa Silog) | `stall12345` |
| Stall | `kape.stall@my.cspc.edu.ph` (Kape at Tinapay) | `stall12345` |
| Student | `student@my.cspc.edu.ph` | `student12345` |

`npm run db:demo` also adds `demo.student1` to `demo.student5@my.cspc.edu.ph` (password `student12345`).

### Showing it from phones on the same Wi-Fi

1. Run `npm start` on the laptop.
2. Run `ipconfig` and find the laptop's IPv4 address, for example `192.168.1.20`.
3. On a phone connected to the same Wi-Fi (or the laptop's hotspot), open `http://192.168.1.20:3000`.
4. If Windows asks about the firewall the first time, allow Node.js on private networks.

The page fonts and Bootstrap load from the internet. Without internet the app still works but looks plainer.

## Project layout

```
app.js            Express setup
config/           database, session, uploads, order statuses, categories
db/               schema.sql, migrate.js, setup.js (seed), demo-data.js
middleware/       login and role checks
models/           database queries (user, stall, menuItem, order, report)
controllers/      request handling
routes/           URL to controller wiring
lib/              CSV, dates, pickup slots, chart helpers
views/            EJS pages (admin/, stall/, student/, partials/)
public/           CSS and small browser scripts
uploads/          GCash receipt images (not committed)
```

The database is `db/canteen.db` (created by `npm run db:setup`, not committed). `db/migrate.js` upgrades an older database on start without losing data.

## Security notes

- Passwords are hashed with bcrypt. Sessions are stored in the database, expire after 8 hours, and are renewed at login.
- Every page checks the user's role on the server. The check reads the user's current status from the database on each request, so blocking a student or removing a stall takes effect immediately.
- Prices and totals always come from the database, never from the browser.
- Receipt uploads are limited to 3 MB, checked by their real file contents (not just the name), stored outside the public folder, and shown only to the student who placed the order, the stall that owns it, and admins.
- A stall can only see its own orders and sales. The stall is taken from the logged-in account, never from the URL.
- CSV exports neutralise cells that start with `=`, `+`, `-` or `@`, so a spreadsheet will not run them as formulas.
- All user text is escaped when pages are drawn.

## Known limitations

These are choices for a class project, not oversights. A real deployment would need them fixed.

- No CSRF tokens on forms. The session cookie is `SameSite=Lax`, which blocks most cross-site posts.
- No limit on login attempts.
- No email verification. A student is accepted by the `@my.cspc.edu.ph` domain plus manual approval by an admin.
- No "forgot password" page. A logged-in user can change their password on the Account page, but a forgotten password needs a database fix by someone with access.
- GCash payments are checked by a person looking at a screenshot and the reference number. There is no connection to GCash.
- Receipt images are not compressed or resized.
- Runs on one computer with one SQLite file. It is not built for many simultaneous users.
- The page uses HTTP. Use HTTPS (and set the session cookie to `secure`) before putting it on the internet.

## Team and workflow

| Member | GitHub | Main batches |
|--------|--------|--------------|
| Member 1 | (add handle) | |
| Member 2 | (add handle) | |
| Member 3 | (add handle) | |

We built the project in small branches, one feature each, named `feature/<what-it-does>`. Every change went through a pull request that one teammate wrote and a different teammate reviewed and merged into `main`. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`).

```
git checkout main
git pull
git checkout -b feature/short-name
# make changes, then
git add .
git commit -m "feat: what changed"
git push -u origin feature/short-name
# open a pull request on GitHub
```

## AI disclosure

This project was built with the help of an AI assistant, **Claude (by Anthropic)**, used through a chat and coding-assistant interface.

**What the AI did:** proposed the architecture, wrote most of the application code, the database schema and migrations, the page designs and styling, the seed and demo-data scripts, the automated test scripts it ran against throwaway databases, and the first draft of this README.

**What we did:** chose the project idea and its features, decided the roles and rules (domain check, admin approval, GCash screenshot verification, stall accounts created only by admins), ran every batch of code on our own machines before pushing, tested the features by hand, committed under our own accounts, and reviewed each other's pull requests.

Please review the code as you would any teammate's: it works, but you should be able to explain any part of it. Questions about a part of the code are welcome during the demo.

## License

MIT. See [LICENSE](LICENSE).

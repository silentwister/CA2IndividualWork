const express = require('express');
const mysql = require('mysql2');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});

const upload = multer({ storage: storage });

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    port:3306,
    password: 'Republic_C207',
    database: 'c237_job_appli_app'
  });

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Set up view engine
app.set('view engine', 'ejs');
//  enable static files
app.use(express.static('public'));
// enable form processing
app.use(express.urlencoded({
    extended: false
}));



// Beginning of orginal code
const session = require('express-session'); // Importing express-session for session management

app.use(session({ // Setting up session middleware
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: {maxAge: 1000 * 60 * 60 * 24 * 7}
}));
// Use of flash
app.use(flash());

const checkSameNameOrEmail = (req, res, next) => {
    const { username, email } = req.body;
    const checkusernameSql = 'SELECT * FROM users WHERE username = ? OR email = ?';
    db.query(checkusernameSql, [username, email], (err, results) => {
        if (err) {
            throw err;
        }
        if (results.length > 0) {
            req.flash('error', 'Username or email already exists.');
            req.flash('formData', req.body);
            return res.redirect('/register');
        }
        next();
    });
};

const validateRegistration = (req, res, next) => { // Middleware to validate registration form data
    const { username, email, password, address, contact } = req.body;

    if (!username || !email || !password || !address || !contact) {
        return res.status(400).send('All fields are required.');
    }
    
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};
// Check authentication middleware
const checkAuthenticated = (req, res, next)=>{
    if (req.session.user) {	// check if session.user is set
        return next();
    } else {
        req.flash('error', 'Pls log in to view this resource');
        res.redirect('/login');  // change url to /login and load the page, will call code of app.get('/login', (req, res)..
    }
};

// Check admin middleware
const checkAdmin = (req, res, next) => {
    if (req.session.user.role === "admin"){ // check if session.user role variable is admin
        return next();
    }else {
        req.flash('error', 'Access denied');	// flash to variable: error
        res.redirect('/jobs');  // change url to /jobs and load the page, will call code of app.get('/jobs', ..
    }
};

const checkEmployer = (req, res, next) => {
    if (req.session.user.role === "employer"){ // check if session.user role variable is admin
        return next();
    }else {
        req.flash('error', 'Access denied');	// flash to variable: error
        res.redirect('/jobs');  // change url to /jobs and load the page, will call code of app.get('/jobs', ..
    }
};

app.get('/', (req, res) => {
    res.render('index', { user: req.session.user, messages: req.flash('success')});
});

app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});


// View Route - Jisha

// View all freelance job listings
app.get('/jobs', (req, res) => {
    const query = 'SELECT * FROM jobs';
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render('jobs', { jobs: results, user: req.session.user });
    });
});

// View job details by job ID
app.get('/jobs/:id', (req, res) => {
    const jobId = req.params.id;
    const query = 'SELECT * FROM jobs WHERE job_id = ?';
    db.query(query, [jobId], (err, results) => {
        if (err) throw err;
        if (results.length === 0) return res.status(404).send('Job not found');
        res.render('job_detail', { job: results[0], user: req.session.user });
    });
});

// View the user's job applications lol
app.get('/applications', checkAuthenticated, (req, res) => {
    const userId = req.session.user.user_id;
    const query = 'SELECT * FROM jobs WHERE applicant_id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) throw err;
        res.render('applications', { jobs: results, user: req.session.user });
    });
});


// View user's profile
app.get('/profile', checkAuthenticated, (req, res) => {
    const userId = req.session.user.user_id;
    const query = 'SELECT * FROM users WHERE user_id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) throw err;
        res.render('profile', { userInfo: results[0], user: req.session.user });
    });
});

// Admin gets to view all users
app.get('/admin/users', checkAuthenticated, checkAdmin, (req, res) => {
    const query = 'SELECT * FROM users';
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render('admin_users', { users: results, user: req.session.user });
    });
});

// Admin gets to view all job posts
app.get('/admin/jobs', checkAuthenticated, checkAdmin, (req, res) => {
    const query = 'SELECT * FROM jobs';
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render('admin_jobs', { jobs: results, user: req.session.user });
    });
});

// View jobs filtered by location
app.get('/location', (req, res) => {
    const query = 'SELECT DISTINCT location FROM jobs';
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render('location', { locations: results, user: req.session.user });
    });
});

// View jobs filtered by job position
app.get('/job-positions', (req, res) => {
    const query = 'SELECT DISTINCT position FROM jobs';
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render('job_positions', { positions: results, user: req.session.user });
    });
});

// View jobs filtered by pay per hour
app.get('/pay-per-hour', (req, res) => {
    const query = 'SELECT pay_per_hour FROM jobs WHERE pay_per_hour IS NOT NULL';
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render('pay_per_hour', { jobs: results, user: req.session.user });
    });
});

// View points earned by the user (Yay!)
app.get('/points-earned', checkAuthenticated, (req, res) => {
    const userId = req.session.user.user_id;
    const query = 'SELECT points_earned AS total_points FROM jobs WHERE applicant_id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) throw err;
        res.render('points_earned', { points: results[0].total_points, user: req.session.user });
    });
});

app.get('/employer/jobs', checkAuthenticated, checkEmployer, (req, res) => {
    const employerId = req.session.user.user_id;
    const sql = 'SELECT * FROM jobs WHERE employer_id = ?';
    db.query(sql, [employerId], (err, results) => {
        if (err) {
            console.error('Error fetching employer jobs:', err);
            return res.status(500).send('Error fetching jobs');
        }
        res.render('employer_jobs', { jobs: results, user: req.session.user });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(3000, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
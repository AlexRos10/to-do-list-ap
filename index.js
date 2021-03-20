const express = require('express');
const morgan = require('morgan');
const crypto = require('crypto');
const session = require('express-session');
const admin = require('firebase-admin');
const app = express();
var logger = (req, res, next) => {
    console.log(`Route Received: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
    next();
}

// Firestore Settings
var serviceAccount = require("./firestore.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://to-do-list-5c6fb-default-rtdb.europe-west1.firebasedatabase.app/'
});

const db = admin.firestore();

// App Settings
app.set('appName', 'To-Do List');
app.set('port', 5500);
app.set('view engine', 'ejs');
app.set('salt', 'f844b09ff50c');

// Middlewares
app.use(express.json());
app.use(morgan('dev'));
app.use(logger);
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'secret' }));

// Routes
var isLogged = function(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

var hasher = (password, salt) => {
    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    var value = hash.digest('hex');
    return value;
};

app.get('/', isLogged, async(req, res) => {
    var query = db.collection('Users');
    var snapshot = await query.where('username', '==', req.session.user).get();
    snapshot.forEach(doc => {
        var tasks = doc.data().tasks;
        res.render('index.ejs', { tasks: tasks, theme: req.session.theme });
    });
    res.redirect('/logout');
});

app.post('/add', isLogged, async(req, res) => {
    var query = db.collection('Users');
    var snapshot = await query.where('username', '==', req.session.user).get();
    snapshot.forEach(async doc => {
        var tasks = doc.data().tasks;
        await query.doc(req.session.user).update({
            tasks: tasks.concat(req.body.task)
        });
        res.redirect('/');
    });
});

app.post('/delete', isLogged, async(req, res) => {
    var query = db.collection('Users');
    var snapshot = await query.where('username', '==', req.session.user).get();
    snapshot.forEach(async doc => {
        var tasks = doc.data().tasks;
        const index = tasks.indexOf(req.body.task);
        if (index > -1) {
            tasks.splice(index, 1);
        }
        await query.doc(req.session.user).update({
            tasks: tasks
        });
        res.redirect('/');
    });
});

app.get('/register', (req, res) => {
    if (req.session.user) {
        res.redirect('/');
    } else {
        res.render('client/register.ejs');
    }
});

app.post('/register', async(req, res) => {
    var params = {
        "username": req.body.user,
        "password": hasher(req.body.password, app.get('salt')),
        "apikey": '',
        "tasks": [req.body.user + ' Welcome to To-Do List', 'Try to delete this task, clicking on the left X | →']
    }
    var query = db.collection('Users');
    var snapshot = await query.where('username', '==', req.body.user).get();
    snapshot.forEach(doc => {
        if (doc.data().username == req.body.user) {
            res.send("<script>alert('Username is alredy in use'); window.location.href='/register';</script>");
        }
    });
    db.collection('Users').doc('/' + req.body.user + '/').create(params);
    req.session.user = req.body.user;
    res.redirect('/');
});

app.get('/login', (req, res) => {
    if (req.session.user) {
        res.redirect('/');
    } else {
        res.render('client/login.ejs');
    }
});

app.post('/login', async(req, res) => {
    var query = db.collection('Users');
    var snapshot = await query.where('username', '==', req.body.user).get();
    snapshot.forEach(doc => {
        if (doc.data().password == hasher(req.body.password, app.get('salt'))) {
            req.session.user = req.body.user;
            req.session.theme = "Light";
            res.redirect('/');
        }
    });
    res.send("<script>alert('Credentials not valids'); window.location.href='/login';</script>")
});

app.get('/logout', isLogged, (req, res) => {
    delete req.session.user;
    delete req.session.userID;
    res.redirect('/login');
});

app.get('/account', isLogged, async (req, res) => {
    var query = db.collection('Users');
    var snapshot = await query.where('username', '==', req.session.user).get();
    snapshot.forEach(doc => {
        res.render('client/account.ejs', { user: req.session.user, apikey: doc.data().apikey });
    });
});

app.get('/theme', async (req, res) => {
    if (req.session.theme == "Light") {
        req.session.theme = "Dark";
    } else {
        req.session.theme = "Light";
    }

    res.redirect('/');
});

app.post('/user/password', isLogged, async(req, res) => {
    var query = db.collection('Users');
    var snapshot = await query.where('username', '==', req.session.user).get();
    snapshot.forEach(async doc => {
        if (hasher(req.body.oldPassword, app.get('salt')) == doc.data().password) {
            await query.doc(req.session.user).update({
                password: hasher(req.body.newPassword, app.get('salt'))
            });
            res.redirect('/');
        }
    });
});

app.post('/user/delete', isLogged, async(req, res) => {
    var query = db.collection('Users');
    var snapshot = await query.where('username', '==', req.session.user).get();
    snapshot.forEach(async doc => {
        if (hasher(req.body.password, app.get('salt')) == doc.data().password) {
            await query.doc(req.session.user).delete();
            res.redirect('/logout');
        } else {
            res.send("<script>alert('Credentials not valids'); window.location.href='/account';</script>");
        }
    });
});

app.get('/api/key/generate', isLogged, async (req, res) => {
    var apikey = '';
    var str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
        'abcdefghijklmnopqrstuvwxyz0123456789@#$';
    for (let i = 1; i <= 30; i++) {
        var char = Math.floor(Math.random() * str.length + 1);
        apikey += str.charAt(char)
    }

    var changekey = true;
    var query = db.collection('Users');
    var snapshot = await query.where('apikey', '==', apikey).get();
    snapshot.forEach(doc => {
        if (doc.data().apikey == apikey) {
            changekey = false;
            res.send('Puto');
        }
    });
    if (changekey) {
        await query.doc(req.session.user).update({
            apikey: apikey
        });
        res.send(apikey);
    }
});

// Api Routes
var isAPIkey = (req, res, next) => {
    if (req.body.apikey) {
        next();
    } else {
        res.status(500).send('Error: apikey parameter required');
    }
}

app.get('/api/get', isAPIkey, async(req, res) => {
    var query = db.collection('Users');
    var snapshot = await query.where('apikey', '==', req.body.apikey).get();
    if (!snapshot.empty) {
        snapshot.forEach(doc => {
            var tasks = doc.data().tasks;
            res.send({tasks:tasks});
        });
    } else {
        res.status(404).send('API key not found');
    }
});

app.patch('/api/add', isAPIkey, async(req, res) => {
    var query = db.collection('Users');
    var snapshot = await query.where('apikey', '==', req.body.apikey).get();
    if (!snapshot.empty) {
        snapshot.forEach(async doc => {
            var tasks = doc.data().tasks;
            await query.doc(doc.data().username).update({
                tasks: tasks.concat(req.body.tasks)
            });
            if (typeof req.body.tasks == 'string') {
                res.status(200).send(`Patch Request Received\nUpdate "${req.body.tasks}" record to Data Base`);
            } else {
                res.status(200).send(`Patch Request Received\nUpdate "${req.body.tasks}" records to Data Base`);
            }
        });
    } else {
        res.status(404).send('API key not found');
    }
});

app.delete('/api/delete', isAPIkey, async(req, res) => {
    var query = db.collection('Users');
    var snapshot = await query.where('apikey', '==', req.body.apikey).get();
    if (!snapshot.empty) {
        snapshot.forEach(async doc => {
            var tasks = doc.data().tasks;
            const index = tasks.indexOf(req.body.task);
            if (index > -1) {
                tasks.splice(index, 1);
                await query.doc(doc.data().username).update({
                    tasks: tasks
                });
                res.send(`Delete Request Received\nDeleted "${req.body.task}" record from Data Base`);
            } else {
                res.status(404).send(`Not found "${req.body.task}" in ${doc.data().username} Account`);
            }
        });
    } else {
        res.status(404).send('API key not found');
    }
});

//Error 404: Not Found Page
app.use((req, res, next) => {
    res.status(404).send('Not Found, Bitch!');
});

// Running App
app.listen(app.get('port'), () => {
    console.log(app.get('appName'));
    console.log(`Server on port ${app.get('port')}`);
});
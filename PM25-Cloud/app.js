/* jshint node: true */
'use strict';

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var juicerExpressAdapter = require('juicer-express-adapter');
var enrouten = require('express-enrouten');
var rewriteModule = require('http-rewrite-middleware');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var app = express();
var ssoauth = require('basic-auth-connect');
var config = require('./configure');

// keep the same rule with nginx rewrite
var rewriteMiddleware = rewriteModule.getMiddleware([]);

// view engine setup
app.set('view engine', 'html');
app.engine('html', juicerExpressAdapter);

app.use(favicon(path.join(__dirname, 'public/favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(rewriteMiddleware);

// for production environment
app.set('env', 'environment');
if (app.get('env') === 'production') {
    console.log('pro');
    app.set('views', path.join(__dirname, 'build/templates'));
    app.use(express.static(path.join(__dirname, 'build/public')));
}
else {
    console.log('dev');
    app.set('views', path.join(__dirname, 'templates'));
    app.use(express.static(path.join(__dirname, 'public')));
}

/// session support
app.use(session({
    secret: 'pm25-secret',
    resave: false,
    saveUninitialized: true,
    store: new MongoStore({url: config.sessiondbpath}),
    cookie: {secure: false, httpOnly: false, maxAge: 120 * 60 * 1000 * 100}
}));

app.use(ssoauth('pm', '2.5')); // 登录时输入

// 默认设置一个session uid=1 ,否则后面会走不通
app.use(function (req, res, next) {
    req.session.user = {
        id: 1
    };
    next();
});


/// ssoauth
//app.use(unless('/settoken', ssoauth.auth({
//    clientId: 'clientId',
//    clientSecret: 'clientSecret',
//    redirect: 'server',
//    settoken: '/settoken?continue='
//})));

/// dynamically include controllers
app.use(enrouten({directory: 'controllers'}));

/// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('buildin/error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('buildin/error', {
        message: err.status,
        error: {}
    });
});

module.exports = app;

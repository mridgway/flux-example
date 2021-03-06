/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
require('node-jsx').install({ extension: '.jsx' });
var express = require('express');
var favicon = require('serve-favicon');
var expressState = require('express-state');
var bodyParser = require('body-parser');
var debug = require('debug')('Example');
var React = require('react');
var app = require('./app');
var showChat = require('./actions/showChat');
var HtmlComponent = React.createFactory(require('./components/Html.jsx'));

var server = express();
expressState.extend(server);
server.set('state namespace', 'App');
server.use(favicon(__dirname + '/../favicon.ico'));
server.use('/public', express.static(__dirname + '/build'));
server.use(bodyParser.json());

// Get access to the fetchr plugin instance
var fetchrPlugin = app.getPlugin('FetchrPlugin');
// Register our messages REST service
fetchrPlugin.registerService(require('./services/message'));
// Set up the fetchr middleware
server.use(fetchrPlugin.getXhrPath(), fetchrPlugin.getMiddleware());

server.use(function (req, res, next) {
    var context = app.createContext({
        req: req // The fetchr plugin depends on this
    });

    debug('Executing showChat action');
    context.getActionContext().executeAction(showChat, {}, function (err) {
        if (err) {
            if (err.status && err.status === 404) {
                next();
            } else {
                next(err);
            }
            return;
        }

        debug('Exposing context state');
        res.expose(app.dehydrate(context), 'App');

        debug('Rendering Application component into html');
        var AppComponent = app.getAppComponent();
        var html = React.renderToStaticMarkup(HtmlComponent({
            state: res.locals.state,
            markup: React.renderToString(AppComponent({
                context: context.getComponentContext()
            }))
        }));

        debug('Sending markup');
        res.write(html);
        res.end();
    });
});

var port = process.env.PORT || 3000;
server.listen(port);
console.log('Listening on port ' + port);

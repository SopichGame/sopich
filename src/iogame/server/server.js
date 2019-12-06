const express = require('express')
const webpack = require('webpack')
const webpackDevMiddleware = require('webpack-dev-middleware')
const socketio = require('socket.io')
const mongoose = require('mongoose')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const Constants = require('../shared/constants')
const { User } = require('./user.js')

// db connection
const localcs = 'mongodb://127.0.0.1:27017/TodoApp'
mongoose.connect(process.env.MONGOLAB_URI || localcs, {useNewUrlParser: true} )
console.info('using db',process.env.MONGOLAB_URI || localcs )

/*
 * Passport 
 */
function loggedIn(req, res, next) {
    console.log('=> check if logged in',req.user)
    if (req.user) {
        next()
    } else {
        res.redirect('/login')
    }
}
passport.serializeUser(function(user, done) {
    done(null, user)
})
passport.deserializeUser(function(user, done) {
    done(null, user)
})
passport.use(new LocalStrategy(
    function(username, password, done) {
        /*if ( Math.random() > 0.5 ){
          console.log(username,'no')
          return done( null, false,  { message: 'Incorrect username.' } )
          } else {*/
        console.log(username,'connected using passport',password)
        let user = { username }
        return done( null,  user )
        /*        username = 'Zildjian'
                  User.findByUsername( username, function (err, user) {
                  if (err) { return done(err) }
                  if (!user) { return done(null, false) }
        */
    }
))

const app = express()
// app.use(require('serve-static')(__dirname + '/../../public'))
const cookieParser = require('cookie-parser')
app.use(cookieParser())
app.use(require('body-parser').urlencoded({ extended: true }))
const expressSession = require('express-session')
const MongoStore = require('connect-mongo')(expressSession)
const SESSION_SECRET = 'securedbynumberandspecialsign$5'
const sessionStore = new MongoStore({ mongooseConnection: mongoose.connection })
      
app.use(expressSession({
    secret: SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    store : sessionStore
}))
app.use(passport.initialize())

const passportSession = passport.session()
app.use(passportSession)

app.post('/login',
         passport.authenticate('local', { successRedirect: '/',
                                          failureRedirect: '/login' }))
app.get('/logout', function(req, res){
    console.log('logs out')
    req.logout()
    res.redirect('/')
})
app.get('/login',
        function (req, res) {
            console.log('ask login but',req.user )

            let userZone = ''
            userZone = 'already connected as ?: '+JSON.stringify( req.user )

            let passZone
            let html = [
                // '<html>',
                // '<head>',
                // '</head>',
                // '<body>',
                userZone,
                '<form action="/login" method="post">',
                '<div><label>Username:</label><input type="text" name="username"/></div>',
                '<div><label>Password:</label><input type="password" name="password"/></div>',
                '<div><input type="submit" value="Log In"/>',
                '</div>',
                '</form>',
                // '</body>',
                // '</html>'
            ]
            res.send( html.join("\n") )
        })

// TODO remove
app.get('/stats/users', function(req, res) {
    User.find({}, function(err, users) {
        res.send(users.map( ({username,score}) => ({username,score}) ) )
    })
})

if (process.env.NODE_ENV === 'development') {
    // Setup Webpack for development
    const webpackConfig = require('../../../webpack.dev.js')
    const compiler = webpack(webpackConfig)
    app.use([loggedIn,webpackDevMiddleware(compiler)])
} else {
    // Static serve the dist/ folder in production
    app.use('/',[loggedIn,express.static('dist')])
}


// Listen on port
const port = process.env.PORT || 3000
const server = app.listen(port)
console.log(`Server listening on port ${port}`)

// Setup socket.io
const io = socketio(server)
const passportSocketIo = require("passport.socketio");

function onAuthorizeSuccess(data, accept){
  console.log('successful connection to socket.io');
 
  // The accept-callback still allows us to decide whether to
  // accept the connection or not.
  accept(null, true);
 
}
 
function onAuthorizeFail(data, message, error, accept){
  if(error)
    throw new Error(message);
  console.log('failed connection to socket.io:', message);
 
  // We use this callback to log all of our failed connections.
  accept(null, false);
 
}

io.use(passportSocketIo.authorize({
    cookieParser: cookieParser,       // the same middleware you registrer in express
    key:          'connect.sid',       // the name of the cookie where express/connect stores its session_id
    secret:       SESSION_SECRET,    // the session_secret to parse the cookie
    store:        sessionStore,        // we NEED to use a sessionstore. no memorystore please
    success:      onAuthorizeSuccess,  // *optional* callback on success - read more below
    fail:         onAuthorizeFail,     // *optional* callback on fail/error - read more below
}));


// Listen for socket.io connections
io.on('connection', socket => {
    //    console.log('iooioi',socket.handshake)
    console.log('connexion', socket.id)
    socket.on(Constants.MSG_TYPES.JOIN_GAME, joinGame)
    socket.on(Constants.MSG_TYPES.INPUT, handleInput)
    socket.on('disconnect', onDisconnect)
})

/*
 * Setup the Game
 */

import { Game } from '../../game.js'

function tellPlayer( socketId, update ){
    //    console.log('got to tell', socketId, update)
    io.to(`${socketId}`).emit( Constants.MSG_TYPES.GAME_UPDATE, update )
}
function tellScore( name, score ){
    console.log(name,'quits with score',JSON.stringify(score) )
    User.updateOne( { username : name },
                    //{ $inc : { score : score.total } },
                    { score : score.total },
                    { upsert : true } )
        .then( x => console.log('update!YES',x))
        .catch( x => console.log('update!NO',x))
}
const game = new Game( { tellPlayer, tellScore } )
// TOOO : remove ?
app.get('/stats/players', function(req, res, next) {
    if ( game && game.players ){
        let names = game.players.names()
        let scores = game.players.scores()
        const out = names.map( (n,i) => [ n, scores[i] ] )
        console.log( out )
        res.json( out )
    } else {
        res.json( [] )
    }
})
async function joinGame(username) {
    console.log('joinGame',this.id,username,this.request.user)
    const id = this.id
    // get latest score if exists and add player
    User.findOne( { username } )
        .then( u => game.addPlayer( id, username, u.score ) )
        .catch( u => game.addPlayer( id, username ) )
        .then( o => {
            if ( o === 0 ){
                this.emit( Constants.MSG_TYPES.JOINED_GAME_OK )
            } else {
                this.emit( Constants.MSG_TYPES.JOINED_GAME_KO, o )
            }
        })
}
function handleInput(dir) {
    game.handleInput(this.id,dir)
}
function onDisconnect() {
    game.removePlayer(this.id)
}

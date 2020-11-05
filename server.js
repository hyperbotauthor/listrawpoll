function IS_PROD(){
	return !!process.env.SITE_HOST
}

const sse = require('@easychessanimations/sse')

const express = require('express')
const app = express()
const port = parseInt(process.env.PORT || "3000")

const MongoClient = require('mongodb').MongoClient
const uri = process.env.MONGODB_URI
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })

const passport = require('passport')
const LichessStrategy = require('passport-lichess').Strategy

client.connect(err => {
	if(err){
		console.error("MongoDb connection failed", err)
	}else{
		console.log("MongoDb connected!")		
	}
})

app.use(require('cookie-parser')())

app.use(require('body-parser').json())

app.use(require('body-parser').urlencoded({ extended: true }))

const session = require('express-session')    

const MongoStore = require('connect-mongo')(session)

const mongoStoreOptions = {
	client: client,
	dbName: "mongodbtestserveroauth",
	collection: "users"
}

const sessionProps= {
	secret: 'keyboard cat',
	resave: process.env.RESAVE == "true",
	saveUninitialized: process.env.SAVE_UNINITIALIZED == "true",
	cookie: {
		maxAge: parseInt( process.env.COOKIE_MAX_AGE || 1 * 366 * 31 * 24 * 60 * 60 * 1000 )
	},
	store: new MongoStore(mongoStoreOptions)
}

app.use(session(sessionProps))

app.use(passport.initialize())

app.use(passport.session())

passport.serializeUser(function(user, cb) {
    cb(null, user)
})
  
passport.deserializeUser(function(obj, cb) {
    cb(null, obj)
})

function getHostProtAndUrl(props){
    let host = process.env.SITE_HOST || props.SITE_HOST || "localhost:3000"
    let prot = host.match(/^localhost:/) ? "http://" : "https://"
    let url = prot + host + props.authURL
    return [host, prot, url]
}

function addLichessStrategy(app, props){
    let [host, prot, url] = getHostProtAndUrl(props)
    passport.use(props.tag, new LichessStrategy({
        clientID: props.clientID,
        clientSecret: props.clientSecret,
        callbackURL: url + "/callback",
        scope: props.scope || ""
        },
        function(accessToken, refreshToken, profile, cb) {
            console.log(`id : ${profile.id}\naccessToken : ${accessToken}\nrefreshToken : ${refreshToken}`)
		
            profile.accessToken = accessToken
				
            return cb(null, profile)
        }
    ))
	
	app.get(props.authURL,
        passport.authenticate(props.tag))

    app.get(props.authURL + "/callback", 
        passport.authenticate(props.tag, { failureRedirect: prot + host + props.failureRedirect }),
            function(req, res) {
				console.log("auth req user", req.user)
		
				res.redirect(prot + host + props.okRedirect)
            }
    )
}

addLichessStrategy(app, {
    tag: "lichess",
    clientID: process.env.LICHESS_CLIENT_ID || "some client id",
    clientSecret: process.env.LICHESS_CLIENT_SECRET || "some client secret",
    authURL: "/auth/lichess",
	scope: "",
    failureRedirect: "/?lichesslogin=failed",
    okRedirect: "/?lichesslogin=ok"
})

app.use("/", express.static(__dirname))

function apiSend(res, blob){
	res.set('Content-Type', 'application/json')
	
	res.send(JSON.stringify(blob))
}

app.use(sse.sseMiddleware)

sse.setupStream(app)

app.get('/logout', (req, res) => {
	req.logout()
	res.redirect("/")
})

app.post('/api', (req, res) => {
	let body = req.body
	
	let topic = body.topic
	
	if(IS_PROD()) if( (!req.user) && (!["getAll"].includes(topic)) ){
		let msg = "Warning: You should be logged in to be able to use the API."
		
		console.warn(msg)
		
		apiSend(res, {
			warn: msg
		})
		
		return
	}
	
	let payload = body.payload
	
	console.info("api", topic, payload)
	
	if(topic == "listDatabases"){
		client.db("admin").admin().listDatabases().then(result => {
			apiSend(res, result)
		})
	}
	
	if(topic == "listCollections"){
		client.db(payload.dbName).listCollections().toArray().then(result => {
			apiSend(res, result)
		}, err => console.error("listing collections failed", err))
	}
	
	if(topic == "dropCollection"){
		if((payload.dbName == mongoStoreOptions.dbName)&&(payload.collName == mongoStoreOptions.collection)){
			apiSend(res, {err: "Warning: You are not allowed to drop this collection for security reasons.", result: {}})
			
			return
		}
		
		client.db(payload.dbName).dropCollection(payload.collName, (err,result) => {
			if(err) console.error("dropping collections failed", err)
			apiSend(res, {err: err, result: result})
		})
	}
	
	if(topic == "dropDatabase"){
		if(payload.dbName == mongoStoreOptions.dbName){
			apiSend(res, {err: "Warning: You are not allowed to drop this database for security reasons.", result: {}})
			
			return
		}
		
		client.db(payload.dbName).dropDatabase((err,result) => {
			if(err) console.error("dropping database failed", err)
			apiSend(res, {err: err, result: result})
		})
	}
	
	if(topic == "getSample"){
		if(payload.dbName == mongoStoreOptions.dbName){
			apiSend(res, {
				"warning": "you are not allowed to get samples from this database for security reason"
			})
			
			return
		}
		client.db(payload.dbName).collection(payload.collName).aggregate([{$sample: {size: payload.size || 1}}]).toArray().then(result => {
			apiSend(res, result)
		}, err => console.error("sampling collection failed", err))
	}
	
	if(topic == "getAll"){
		client.db("app").collection("transactions").find({}).toArray().then(result => {
			apiSend(res, result)
		}, err => console.error("getting all documents failed", err))
	}
	
	if(topic == "updateOne"){
		client.db(payload.dbName).collection(payload.collName).updateOne(payload.filter, {$set: payload.doc}, payload.options).then(result => {
			apiSend(res, result)
		})
	}
	
	if(topic == "addTransaction"){
		let tr = payload.transaction
		client.db("app").collection("transactions").insertOne(tr).then(result => {
			apiSend(res, result)
			
			sse.ssesend({
				topic: "addTransaction",
				transaction: payload.transaction
			})
		})
	}
})

app.get('/', (req, res) => {
	res.send(`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Lichess Straw Poll</title>    
    <script src="https://unpkg.com/@easychessanimations/foo@1.0.43/lib/fooweb.js"></script>
	<script src="https://unpkg.com/@easychessanimations/sse/lib/sseclient.js"></script>
  </head>
  <body>

	<div style="padding: 3px; background-color: #eee; margin-bottom: 6px;">
		${req.user ? "logged in as <b>" + req.user.username + "</b> <a href='/logout'>log out</a>" : "<a href='/auth/lichess'>log in with lichess</a>"}
	</div>

    <div id="root"></div>
	<script>
		var USER = ${JSON.stringify(req.user || {}, null, 2)}
		var TICK_INTERVAL = ${sse.TICK_INTERVAL}
	</script>
	<script src="app.js"></script>
  </body>
</html>
`)
})

app.listen(port, () => {
	console.log(`mongodbtest listening at port ${port}`)
})

function IS_PROD(){
	return !!process.env.SITE_HOST
}

const classes = require("./classes.js")

const sse = require('@easychessanimations/sse')

const express = require('express')
const app = express()
const port = parseInt(process.env.PORT || "3000")

const MongoClient = require('mongodb').MongoClient
const uri = process.env.MONGODB_URI
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })

const passport = require('passport')
const LichessStrategy = require('passport-lichess').Strategy

let STATE = classes.State()

client.connect(err => {
	if(err){
		console.error("MongoDb connection failed", err)
	}else{
		console.log("MongoDb connected!")		
		client.db("app").collection("transactions").find({}).toArray().then(result => {
			console.log("retrieved all transactions", result.length)
			for(let transactionBlob of result){
				STATE.executeTransaction(classes.transactionFromBlob(transactionBlob))
			}
		}, err => console.error("getting all transactions failed", err))
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

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE

class Transactions{
	constructor(props){				
		this.props = props
		
		this.quotas = this.props.quotas
		
		this.transactions = []
	}
	
	add(transaction){
		this.transactions.unshift(transaction)
	}
	
	isExhausted(user){		
		for(let quota of this.quotas) quota.init()
		
		for(let transaction of this.transactions){
			for(let quota of this.quotas){
				if(quota.isExhausted(user, transaction)){
					return true
				}
			}
		}
		
		return false
	}
}

class TransactionQuota{
	constructor(props){
		this.props = props
		
		this.span = this.props.span
		this.cap = this.props.cap
	}
	
	init(){
		this.count = 0
		this.now = new Date().getTime()
	}
	
	isExhausted(user, transaction){
		console.log(user, transaction.verifiedUser)
		if(!transaction.verifiedUser.equalTo(user)) return false
		
		let elapsed = this.now - transaction.createdAt
		
		if(elapsed < this.span){
			this.count ++
			
			if(this.count > this.cap){
				return true
			}
		}
	}
}

const TRANSACTIONS = new Transactions({
	quotas: [
		new TransactionQuota({
			span: 10 * MINUTE,
			cap: 20
		}),
		new TransactionQuota({
			span: 30 * SECOND,
			cap: 5
		})
	]
})

app.post('/api', (req, res) => {
	let body = req.body
	
	let topic = body.topic
	
	if(IS_PROD() && (!req.user)){
		let msg = "Warning: You should be logged in to be able to use the API."
		
		console.warn(msg)
		
		apiSend(res, {
			warn: msg
		})
		
		return
	}
	
	let payload = body.payload
	
	console.info("api", topic, payload)
		
	if(topic == "addTransaction"){
		let ok = true
		
		let transaction = classes.transactionFromBlob(payload.transaction)
		
		transaction.createdAt = new Date().getTime()
		
		transaction.verifiedUser = classes.User(req.user)
		
		if(TRANSACTIONS.isExhausted(transaction.verifiedUser)){
			apiSend(res, {
				quotaExceeded: true
			})
			
			return
		}
		
		TRANSACTIONS.add(transaction)
		
		client.db("app").collection("transactions").insertOne(transaction.serialize()).then(result => {
			apiSend(res, result)
			
			if(ok){
				STATE.executeTransaction(transaction)
				
				sse.ssesend({
					topic: "setState",
					state: STATE.serialize()
				})	
			}
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
	<link rel="stylesheet" href="style.css">
  </head>
  <body>

	<div style="padding: 3px; background-color: #eee; margin-bottom: 6px;">
		${req.user ? "logged in as <b>" + req.user.username + "</b> <a href='/logout'>log out</a>" : "<a href='/auth/lichess'>log in with lichess</a>"}
	</div>

    <div id="root"></div>
	<script>
		var USER = ${JSON.stringify(req.user || {}, null, 2)}
		var STATE = ${JSON.stringify(STATE.serialize(), null, 2)}
		var TICK_INTERVAL = ${sse.TICK_INTERVAL}
	</script>
	<script src="classes.js"></script>
	<script src="app.js"></script>
  </body>
</html>
`)
})

app.listen(port, () => {
	console.log(`mongodbtest listening at port ${port}`)
})

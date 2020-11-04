const express = require('express')
const app = express()
const port = parseInt(process.env.PORT || "3000")

const MongoClient = require('mongodb').MongoClient
const uri = process.env.MONGODB_URI
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })

let collection = null

client.connect(err => {
	if(err){
		console.log("MongoDb connection failed", err)
	}else{
		console.log("MongoDb connected!")
		collection = client.db("sample_airbnb").collection("listingsAndReviews")		
	}
})

app.use(require('body-parser').json())

app.use("/", express.static(__dirname))

function apiSend(res, blob){
	res.set('Content-Type', 'application/json')
	
	res.send(JSON.stringify(blob))
}

app.post('/api', (req, res) => {
	let body = req.body
	
	let topic = body.topic
	
	let payload = body.payload
	
	console.log("api", topic, payload)
	
	if(topic == "listDatabases"){
		client.db("admin").admin().listDatabases().then(result => {
			apiSend(res, result)
		})
	}
	
	if(topic == "listCollections"){
		client.db(payload.dbName).listCollections().toArray().then(result => {
			apiSend(res, result)
		}, err => console.log("listing collections failed", err))
	}
})

app.get('/findone', (req, res) => {
	collection.findOne().then(doc => {
		res.send("<pre>" + JSON.stringify(doc, null, 2) + "/<pre>")
	})
})

app.get('/', (req, res) => {
	res.send(`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>MongoDb Test</title>    
    <script src="https://unpkg.com/@easychessanimations/foo/lib/fooweb.js"></script>
  </head>
  <body>
	<a href="/findone" rel="noopener noreferrer" target="_blank">find one</a>
	<hr>
    <div id="root"></div>
	<script src="app.js"></script>
  </body>
</html>
`)
})

app.listen(port, () => {
	console.log(`mongodbtest listening at port ${port}`)
})

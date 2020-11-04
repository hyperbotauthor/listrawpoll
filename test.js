const MongoClient = require('mongodb').MongoClient
const uri = process.env.MONGODB_URI
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })

console.log("connecting...")

client.connect(err => {
	if(err){
		console.log("connection failed", err)
	}else{
		console.log("connected!")
		const collection = client.db("sample_airbnb").collection("listingsAndReviews")
		collection.findOne().then(doc => {
			console.log(doc.beds)
			client.close()
		})
	}
})

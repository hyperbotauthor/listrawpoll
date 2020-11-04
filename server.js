const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
	res.send('MongoDb test.')	
})

app.listen(port, () => {
	console.log(`mongodbtest listening at port ${port}`)
})

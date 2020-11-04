const express = require('express')
const app = express()
const port = parseInt(process.env.PORT || "3000")

app.use("/", express.static(__dirname))

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
    <div id="root"></div>
	<script src="app.js"></script>
  </body>
</html>
`)
})

app.listen(port, () => {
	console.log(`mongodbtest listening at port ${port}`)
})

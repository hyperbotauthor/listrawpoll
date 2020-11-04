function api(topic, payload){
	return new Promise(resolve => fetch('/api', {
			method: "POST",
			headers: {
			   "Content-Type": "application/json"
			},
			body: JSON.stringify({
				topic: topic,
				payload: payload
			})
		}).then(
			response => response.text().then(
				text => {
					try{                    
						let response = JSON.parse(text)
						
						resolve(response)
					}catch(err){
						console.log("api parse error", err, text)
					}
				}
			),
			err => {
				console.log("api response error", err)
			}
		)    
	)	
}

let listDatabasesDiv = div()

function listDatabases(){
	api("listDatabases").then(result => {
		listDatabasesDiv.html(`<hr>result : <pre>${JSON.stringify(result, null, 2)}</pre><hr>`)
	})
}

let app = div().bc("#0f0").pad(10).a(	
	button(listDatabases).html("List databases"),
	listDatabasesDiv
)

document.getElementById("root").appendChild(app.e)

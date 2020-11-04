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

class Database_ extends SmartdomElement_{
	constructor(props){
		super({...props, ...{tagName: "div"}})
		
		this.api = this.props.api
		
		this.name = this.props.name
		this.sizeOnDisk = this.props.sizeOnDisk
		this.empty = this.props.empty
		
		this.build()
		
		this.getCollectionsNames()
	}
	
	build(){
		this.a(
			div().ffms().mar(2).fl().a(
				div().fs(16).w(300).pad(3).bc("#ffe").fwb().html(this.name),
				div().fl().w(600).pad(3).bc("#eee").a(
					div().mar(2).w(300).pad(2).bc("#ddd").html(`size on disk : ${this.sizeOnDisk}`),
					div().mar(2).w(100).pad(2).bc("#ddd").html(`empty : ${this.empty}`)
				)
			),
			this.collectionsDiv = div()
		)
		
		return this
	}
	
	getCollectionsNames(){
		
	}
}
function Database(props){return new Database_(props)}

function listDatabases(){
	api("listDatabases").then(result => {
		listDatabasesDiv.a(
			result.databases.map(database => Database({...database, ...{api: api}}))
		)
	})
}

let app = div().bc("#0f0").pad(10).a(	
	button(listDatabases).html("List databases"),
	listDatabasesDiv
)

document.getElementById("root").appendChild(app.e)

listDatabases()
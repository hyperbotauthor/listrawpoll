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
	}
	
	build(){
		this.a(
			div().ffms().mar(2).fl().a(
				div().fs(16).w(300).pad(3).bc("#ffe").fwb().html(this.name).curp().ae("click", _=>this.listCollections()),
				div().fl().w(600).pad(3).bc("#eee").a(
					button(_=>this.listCollections()).html("Get collection names"),
					div().mar(2).marl(10).w(200).pad(2).bc("#ddd").html(`size on disk : ${this.sizeOnDisk}`),
					div().mar(2).w(100).pad(2).bc("#ddd").html(`empty : ${this.empty}`)					
				)
			),
			this.collectionsDiv = div().marl(20)
		)		
		
		return this
	}
	
	listCollections(){		
		this.api("listCollections", {dbName: this.name}).then(result => {
			this.collectionsDiv.x().a(result.map(collection => Collection({...collection, ...{parentDatabase: this}})))
		})
	}
}
function Database(props){return new Database_(props)}

class Collection_ extends SmartdomElement_{
	constructor(props){
		super({...props, ...{tagName: "div"}})
		
		this.parentDatabase = this.props.parentDatabase
		
		this.name = this.props.name		
		
		this.build()
	}
	
	build(){
		this.a(
			div().ffms().mar(2).fl().a(
				div().fs(16).w(300).pad(3).bc("#eff").fwb().html(this.name),
				div().fl().w(600).pad(3).bc("#eee").a(
					button(_=>this.getSample()).html("Get sample")
				)
			),
			this.documentDiv = div().mar(3).marl(10).pad(3).bc("#eee")
		)		
		
		return this
	}	
	
	getSample(){
		api("getSample", {dbName: this.parentDatabase.name, collName: this.name}).then(result => {
			this.documentDiv.x().a(Value({value: result}))
		})
	}
}
function Collection(props){return new Collection_(props)}

class Value_ extends SmartdomElement_{
	constructor(props){
		super({...props, ...{tagName: "div"}})
		
		this.value = props.value
		
		this.build()
	}
	
	build(){
		if(typeof this.value == "object"){
			if(!value){
				this.x().mar(2).pad(2).bc("#f00").html("null")
			}else if(Array.isArray(this.value)){
				this.x().mar(2).bdrs("solid").bdrw(1).bdrc("#700").a(
					this.value.map(item => Value({value: item}))
				)
			}else{
				this.x().mar(2).bdrs("solid").bdrw(1).bdrc("#070").a(
					Object.entries(this.value).map(entry => div().bc("#79d").pad(2).mar(2).fl().aic().a(
						div().pad(2).bc("#aff").w(150).fwb().html(entry[0]),
						div().marl(3).pad(2).bc("#aaa").a(Value({value: entry[1]}))
					))
				)
			}
		}else{
			if(typeof this.value == "number"){
				this.mar(2).pad(2).bc("#fff").ffms().fs(18).c("#070").fwb().html(`${this.value}`)	
			}else{
				this.mar(2).pad(2).bc("#fff").c("#007").html(`${this.value}`)
			}			
		}
		
		return this
	}
}
function Value(props){return new Value_(props)}


function listDatabases(){
	api("listDatabases").then(result => {
		listDatabasesDiv.x().a(
			result.databases.filter(database => !["admin", "local"].includes(database.name)).map(database => Database({...database, ...{api: api}}))
		)
	})
}

let app = div().bc("#0f0").pad(10).a(	
	button(listDatabases).html("List databases"),
	listDatabasesDiv
)

document.getElementById("root").appendChild(app.e)

listDatabases()
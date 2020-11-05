function UID(){
	return "uid_" + Math.random().toString(36).substring(2,12)
}

function IS_DEV(){
	return document.location.host.match(/localhost/)
}

function getUser(){
	return IS_DEV() ? {
		id: "anonymous",
		username: "@nonymous"
	} : USER
}

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

class Poll_ extends SmartdomElement_{
	constructor(props){
		super({...props, ...{tagName: "div"}})
		
		this.poll = this.props.poll || "Poll?"
		this.pollId = this.props.pollId || UID()
		
		this.api = this.props.api || api
		
		this.pad(2).mar(2).bc("#eee").bdrs("solid").bdrw(1).bdrc("#777").bdrr(10)
		
		this.build()
	}
	
	addTransaction(tr){
		this.api("addTransaction", {
			transaction: tr.serialize()
		}).then(result => {
			console.log(result)			
		})	
	}
	
	delete(){
		let tr = Transaction({
			topic: "deletePoll",			
			pollId: this.pollId
		})
		
		this.addTransaction(tr)
	}
	
	build(){
		this.x().a(
			div().fl().aic().a(
				div().w(600).fs(20).mar(2).pad(2).bc("#ffe").html(this.poll),
				button(_ => this.delete()).html("Delete").bc("#faa")
			)
		)
		
		return this
	}
}
function Poll(props){return new Poll_(props)}

class State_ extends SmartdomElement_{
	constructor(props){
		super({...props, ...{tagName: "div"}})
		
		this.transactions = this.props.transactions || []
		
		this.execTrIds = {}
		
		this.polls = this.props.polls || []
		
		this.pad(2).mar(2).bc("#aaf").bdrs("solid").bdrw(1).bdrc("#777").bdrr(10)
		
		this.build()
	}
	
	exec(tr){
		let trs = Array.isArray(tr) ? tr : [tr]
		
		for(let tr of trs){
			if(tr.topic == "createPoll"){
				this.polls.push(Poll(tr.props))
			}
			
			if(tr.topic == "deletePoll"){
				this.polls = this.polls.filter(poll => poll.pollId != tr.pollId)
			}
			
			this.execTrIds[tr.id] = true
		}		
		
		return this.build()
	}
	
	addTransaction(tr){
		if(this.execTrIds[tr.id]) return
		
		this.exec(tr)
		
		this.transactions.push(tr)
	}
	
	build(){
		this.x().a(
			this.polls			
		)
		
		return this
	}
}
function State(props){return new State_(props)}

class Transaction_ extends SmartdomElement_{
	constructor(props){
		super({...props, ...{tagName: "div"}})
		
		this.id = this.props.id || UID()
		
		this.topic = this.props.topic || "dummy"
		
		this.pad(5).mar(2).bc("#afa").bdrs("solid").bdrw(1).bdrc("#777").bdrr(10)
		
		this.build()
	}
	
	serialize(){
		let blob = {
			topic: this.topic,
			id: this.id
		}
		
		if(this.topic == "createPoll"){
			blob.poll = this.props.poll
			blob.pollId = this.props.pollId
		}
		
		return blob
	}
	
	build(){
		this.x().a(
			this.table = table().sa("border", "1").sa("cellpadding", "3").sa("cellspacing", "3").bc("#eee").a(
				tr().a(
					td().html("Topic"),
					td().html(this.topic)
				),
				tr().a(
					td().html("Id"),
					td().html(this.id)
				)
			)	
		)
		
		if(this.topic == "createPoll"){
			this.table.a(
				td().html("Poll"),
				td().html(this.props.poll)
			)
		}
		
		return this
	}
}
function Transaction(props){return new Transaction_(props)}

class App_ extends SmartdomElement_{
	constructor(props){
		super({...props, ...{tagName: "div"}})
		
		this.state = this.props.state || State()
		
		this.api = this.props.api || api
		
		this.build()
		
		this.api("getAll", {}).then(result => {
			this.state.exec(result.map(blob => Transaction(blob)))
		})
	}
	
	createPoll(){
		let poll = window.prompt("Poll question :")
		
		if(poll){
			let tr = Transaction({
				topic: "createPoll",
				poll: poll,
				pollId: UID()
			})
			
			this.addTransaction(tr)
		}
	}
	
	build(){
		this.controlPanel = div().mar(3).pad(3).bc("#7a7").a(
			button(_=>this.createPoll()).bc("#afa").fs(20).html("Create poll")
		)
		
		this.x().a(
			div().pad(3).bc("#ffe").fs(20).html(`Lichess Straw Poll.`),
			this.controlPanel,
			//div().pad(3).mart(10).bc("#eef").html("<pre>" + JSON.stringify(USER, null, 2) + "</pre>"),
			this.state,
			this.state.transactions
		)
		
		return this
	}
	
	addTransaction(tr){
		this.api("addTransaction", {
			transaction: tr.serialize()
		}).then(result => {
			console.log(result)
			if(result.ok){				
				this.state.addTransaction(tr)
			}
		})
	}
}
function App(props){return new App_(props)}

let app = App()

document.getElementById("root").appendChild(app.e)

setupSource(blob => {	
	if(blob.kind != "tick") console.info(blob)
	if(blob.topic == "addTransaction"){
		app.state.addTransaction(Transaction(blob.transaction))
	}
}, TICK_INTERVAL)

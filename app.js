function IS_DEV(){
	return document.location.host.match(/localhost/)
}

function getUser(){
	return IS_DEV() ? {
		id: "@nonymous",
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

function addTransaction(transaction){
	return this.api("addTransaction", {
		transaction: transaction.serialize()
	})
}

class SmartPoll_ extends SmartdomElement_{
	constructor(props){
		super({...props, ...{tagName: "div"}})
		
		this.poll = this.props.poll || Poll()
		
		this.pad(2).mar(2).bc("#eee").bdrs("solid").bdrw(1).bdrc("#777").bdrr(10)
		
		this.build()
	}
	
	delete(){
		let transaction = DeletePoll({
			author: this.poll.author,
			pollId: this.poll.pollId
		})
		
		addTransaction(transaction).then(result => {
			console.info(result)
		})
	}
	
	build(){
		this.x().a(
			div().fl().aic().jc("space-between").a(
				div().w(600).fs(20).mar(2).pad(2).bc("#ffe").html(this.poll.poll),
				button(_ => this.delete()).html("Delete").bc("#faa")
			)
		)
		
		return this
	}
}
function SmartPoll(props){return new SmartPoll_(props)}

class SmartState_ extends SmartdomElement_{
	constructor(props){
		super({...props, ...{tagName: "div"}})
		
		this.state = this.props.state || State()
		
		this.pad(2).mar(2).bc("#aaf").bdrs("solid").bdrw(1).bdrc("#777").bdrr(10)
		
		this.build()
	}
	
	build(){
		this.x().a(
			this.state.polls.map(poll => SmartPoll({poll: poll}))
		)
		
		return this
	}
}
function SmartState(props){return new SmartState_(props)}

class App_ extends SmartdomElement_{
	constructor(props){
		super({...props, ...{tagName: "div"}})
		
		this.state = this.props.state || State()
		
		this.setState(this.state)
	}
	
	setState(state){
		this.state = state
		
		this.build()
	}
	
	createPoll(){
		let poll = window.prompt("Poll question :")
		
		if(poll){
			let transaction = CreatePoll({				
				poll: poll,
				author: getUser()
			})
			
			addTransaction(transaction).then(result => {
				console.info(result)
			})
		}
	}
	
	build(){
		this.controlPanel = div().mar(3).pad(3).bc("#7a7").a(
			button(_=>this.createPoll()).bc("#afa").fs(20).html("Create poll")
		)
		
		this.x().a(
			div().pad(3).bc("#ffe").fs(20).html(`Lichess Straw Poll.`),
			this.controlPanel,			
			SmartState({state: this.state})
		)
		
		return this
	}
}
function App(props){return new App_(props)}

let app = App({state: STATE})

document.getElementById("root").appendChild(app.e)

setupSource(blob => {	
	if(blob.kind != "tick") console.info(blob)
	if(blob.topic == "setState"){
		app.setState(State(blob.state))
	}
}, TICK_INTERVAL)

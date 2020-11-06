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
	return new Promise(resolve => {
		return this.api("addTransaction", {
			transaction: transaction.serialize()
		}).then(result => {
			if(result.quotaExceeded){
				window.alert("Transaction quouta exceeded. Wait a little.")				
			}else{
				resolve(result)
			}
		})
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
	
	addOption(){
		let optionText = window.prompt("Option :")
		
		if(optionText){
			let option = PollOption({
				author: getUser(),
				option: optionText,
				parentPollId: this.poll.pollId
			})
			
			let transaction = AddOption({				
				option: option
			})
			
			addTransaction(transaction).then(result => {
				console.info(result)
			})
		}
	}
	
	build(){
		this.x().a(
			div().fl().aic().jc("space-between").a(
				div().c("#007").fwb().w(600).fs(22).mar(2).pad(2).bc("#ffe").html(this.poll.poll),
				button(_ => this.addOption()).html("Add option").bc("#afa").marr(10),				
				button(_ => this.delete()).html("Delete").bc("#faa").marr(10)
			),
			div().marl(10).pad(2).bc("#eee").html(`by <b style="color:#070">${this.poll.author.username}</b> <small>${new Date(this.poll.createdAt).toLocaleString()}</small>`),
			div().pad(2).marl(10).bc("#de9").a(
				this.poll.options.sort((a,b) => b.getNumVotes() - a.getNumVotes())
					.map(option => SmartOption({option: option}))
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
			this.state.polls.sort((a,b) => b.getNumVotes() - a.getNumVotes())
				.map(poll => SmartPoll({poll: poll}))
		)
		
		return this
	}
}
function SmartState(props){return new SmartState_(props)}

class SmartOption_ extends SmartdomElement_{
	constructor(props){
		super({...props, ...{tagName: "div"}})
		
		this.option = this.props.option || PollOption()
		
		this.build()
		
		this.fl().aic().jc("space-between").pad(2).mar(2).bc("#aff")
	}	
	
	vote(quantity){
		let transaction = AddVote({				
			vote: Vote({
				author: getUser(),			
				targetPollId: this.option.parentPollId,
				targetOptionId: this.option.optionId,
				quantity: quantity
			})
		})

		addTransaction(transaction).then(result => {
			console.info(result)
		})
	}
	
	delete(){
		let transaction = DeleteOption({				
			parentPollId: this.option.parentPollId,
			optionId: this.option.optionId
		})

		addTransaction(transaction).then(result => {
			console.info(result)
		})
	}
	
	showVotes(){
		this.showVotesDiv.x().disp("none")
		
		if(this.showVotesOpen){			
			this.showVotesOpen = false
			return
		}
		
		let voters = {}
		
		for(let vote of this.option.votes){
			let voter = vote.author.username
			
			if(!voters[voter]) voters[voter] = {numVotes: 0}
			
			let newNumVotes = voters[voter].numVotes + vote.quantity
			if(newNumVotes >= 0) voters[voter].numVotes = newNumVotes
		}
		
		this.showVotesDiv.disp("block").a(Object.entries(voters)
			.filter(entry => entry[1].numVotes).map(entry => div().fl().aic().a(
			div().c("#007").pad(2).mar(2).bc("#fd8").html(`<i>${entry[0]}</i>`),
			div().c("#070").fwb().pad(2).mar(2).bc("#ffa")
				.html(entry[1].numVotes).marl(10).w(30).tac()
		)))
		
		this.showVotesOpen = true
	}
	
	build(){
		this.x().a(
			div().w(550).pad(2).mar(2).bc("#edf").fs(18).fwb().html(this.option.option),
			div().por().w(50).tac().pad(2).mar(2).bc("#ff0").fs(18).html(`${this.option.getNumVotes()}`).curp()
				.ae("click", this.showVotes.bind(this)).a(
					this.showVotesDiv = div().disp("none").poa().pad(5).bc("#e8f")
						.mar(2).mart(6).marl(3).addStyle("zIndex", 100)
				),
			button(_=>this.vote(1)).html("Vote").bc("#afa"),
			button(_=>this.vote(-1)).html("Unvote").bc("#dd7"),
			button(_=>this.delete()).html("Delete").bc("#faa")
		)
	}
}
function SmartOption(props){return new SmartOption_(props)}

class App_ extends SmartdomElement_{
	constructor(props){
		super({...props, ...{tagName: "div"}})
		
		this.state = this.props.state || State()
		
		this.setState(this.state)
	}
	
	setState(state){
		this.state = state
		
		this.e.classList.add("unselectable")
		
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

let app = App({state: State(STATE)})

document.getElementById("root").appendChild(app.e)

setupSource(blob => {	
	if(blob.kind != "tick") console.info(blob)
	if(blob.topic == "setState"){
		app.setState(State(blob.state))
	}
}, TICK_INTERVAL)

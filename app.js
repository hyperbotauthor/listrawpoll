let loadPollMatch = document.location.href.match(/loadPoll=([a-zA-Z0-9_]+)/)

function IS_DEV(){
	return document.location.host.match(/localhost|goorm.io/)
}

function getUser(){
	return IS_DEV() ? User({
		id: "@nonymous",
		username: "@nonymous"
	}) : User(USER)
}

function genLink(href, display){
	return `<a href="${href}" rel="noopener noreferrer" target="_blank">${display}</a>`
}

function userLink(username){
	return genLink(`https://lichess.org/@/${username}`, username)
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

class UserWithVote_ extends SmartdomElement_{
	constructor(props){
		super({...props, ...{tagName: "div"}})
		
		this.dib().fl().aic().mar(2).pad(2).bc("#eee").a(
			div().mar(2).pad(3).bc("#add").addStyle("fontStyle", "italic").html(userLink(this.props.username))
		)
		
		if(this.props.showCount) this.a(
			div().mar(2).pad(2).bc("#ffa").fwb().c("#070").html(`${this.props.votes}`)
		)
	}
}
function UserWithVote(props){return new UserWithVote_(props)}

class SmartPoll_ extends SmartdomElement_{
	constructor(props){
		super({...props, ...{tagName: "div"}})
		
		this.poll = this.props.poll || Poll()
		
		this.pad(2).mar(2).bc(this.poll.author.equalTo(getUser()) ? "#afa" : "#eee").bdrs("solid").bdrw(1).bdrc("#777").bdrr(10)
		
		this.build()
	}
	
	delete(){		
		if(!this.poll.author.equalTo(getUser())){
			window.alert("You can only delete your own poll.")
			
			return
		}
		
		let transaction = DeletePoll({
			author: this.poll.author,
			pollId: this.poll.pollId
		})
		
		addTransaction(transaction).then(result => {
			console.info(result)
		})
	}
	
	addOption(){
		if(!this.poll.author.equalTo(getUser())){
			window.alert("You can only add an option to your own poll.")
			
			return
		}
		
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
	
	loadPoll(){
		document.location.href = `/?loadPoll=${this.poll.pollId}`
	}
	
	build(){
		this.x().a(
			div().fl().aic().jc("space-between").a(
				div().c("#007").fwb().w(600).fs(22).mar(2).pad(2).bc("#ffe").html(this.poll.poll).
				curp().ae("click", _ => this.loadPoll()),
				button(_ => this.addOption()).html("Add option").bc("#afa").marr(10),				
				button(_ => this.delete()).html("Delete").bc("#faa").marr(10)
			),
			div().marl(10).pad(2).bc("#eee").html(`by <b style="color:#070">${this.poll.author.username}</b> <small><i><a href="https://lichess.org/@/${this.poll.author.username}" rel="noopener noreferrer" target="_blank">view profile</a> </i>created at ${new Date(this.poll.createdAt).toLocaleString()} ${this.poll.pollId}	</small>`),
			this.optionsDiv = div().pad(2).marl(10).bc("#de9").a(
				this.poll.options.sort((a,b) => b.getNumVotes() - a.getNumVotes())
					.map(option => SmartOption({option: option, parentPoll: this}))
			)			
		)
		
		this.optionsDiv.e.classList.add("unselectable")
		
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
			this.state.polls.filter(poll => loadPollMatch ? poll.pollId == loadPollMatch[1] : true).sort(this.cmpPolls.bind(this))
				.map(poll => SmartPoll({poll: poll}))
		)
		
		return this
	}
	
	cmpPolls(a, b){
		let me = getUser()
		
		if( a.getNumMe(me) != b.getNumMe(me) ) return b.getNumMe(me) - a.getNumMe(me)
		
		if( a.getNumMe(me) ) return b.createdAt - a.createdAt
		
		return b.getNumVotes() - a.getNumVotes()
	}
}
function SmartState(props){return new SmartState_(props)}

class SmartOption_ extends SmartdomElement_{
	constructor(props){
		super({...props, ...{tagName: "div"}})
		
		this.option = this.props.option || PollOption()
		
		this.parentPoll = this.props.parentPoll
		
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
		if(!this.parentPoll.poll.author.equalTo(getUser())){
			window.alert("You can only delete an option from your own poll.")
			
			return
		}
		
		let transaction = DeleteOption({				
			parentPollId: this.option.parentPollId,
			optionId: this.option.optionId
		})

		addTransaction(transaction).then(result => {
			console.info(result)
		})
	}
	
	edit(){
		if(!this.parentPoll.poll.author.equalTo(getUser())){
			window.alert("You can only edit an option from your own poll.")
			
			return
		}
		
		let editedOption = window.prompt("Edit option:", this.option.option)
		
		let transaction = DeleteOption({				
			parentPollId: this.option.parentPollId,
			optionId: this.option.optionId
		})

		addTransaction(transaction).then(result => {
			console.info(result)
		})
		
		let option = PollOption({
			author: getUser(),
			option: editedOption,
			parentPollId: this.option.parentPollId
		})

		transaction = AddOption({				
			option: option
		})

		addTransaction(transaction).then(result => {
			console.info(result)
		})
	}
	
	showVotes(showCount){
		this.showVotesDiv.x().disp("none")
		
		if(this.showVotesOpen){			
			this.showVotesOpen = false
			return
		}
		
		this.showVotesDiv.marl(-200).w(600).fl().addStyle("flexWrap", "wrap").a(Object.entries(this.option.getVoters())
			.filter(entry => entry[1].numVotes).map(entry => 
				UserWithVote({username: entry[0], votes: entry[1].numVotes, showCount: showCount})
			)
		)
		
		this.showVotesOpen = true
	}
	
	build(){
		this.x().a(
			div().w(550).pad(2).mar(2).bc("#edf").fs(18).fwb().html(this.option.option),
			div().html(`total`),
			div().por().w(50).tac().pad(2).mar(2).bc("#ff0").fs(18).c("#070").fwb()
				.html(`${this.option.getNumVotes()}`).curp()
				.ae("click", this.showVotes.bind(this, true)).a(
					this.showVotesDiv = div().disp("none").poa().pad(5).bc("#e8f")
						.mar(2).mart(6).marl(3).addStyle("zIndex", 100)
				),
			div().html(`unique`),
			div().por().w(50).tac().pad(2).mar(2).bc("#adf").fs(18).c("#070").fwb()
				.html(`${this.option.getNumVoters()}`).curp()
				.ae("click", this.showVotes.bind(this, false)).a(
					this.showVotesDiv = div().disp("none").poa().pad(5).bc("#e8f")
						.mar(2).mart(6).marl(3).addStyle("zIndex", 100)
				),
			button(_=>this.vote(1)).html("Vote").bc("#afa"),
			button(_=>this.vote(-1)).html("Unvote").bc("#dd7"),
			button(_=>this.edit()).html("Edit").bc("#aad"),
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

let app

function isDocVerified(doc){
	if(!doc.verifiedUser) return false
	
	if(doc.verifiedUser.id == "@nonymous") return false
	
	return true
}

function htmlLink(href, display){
	return `<a href="${href}" rel="noopener noreferrer" target="_blank">${display}</a>`
}

function pollLink(pollId){
	return htmlLink(`/?loadPoll=${pollId}`, pollId)
}

function docInfo(doc){
	if(doc.topic == "addVote"){
		return pollLink(doc.vote.targetPollId) + " / " + doc.vote.targetOptionId
	}
	
	if(doc.topic == "addOption"){
		return pollLink(doc.option.parentPollId)
	}
	
	if(doc.topic == "deleteOption"){
		return pollLink(doc.parentPollId)
	}
	
	if(doc.topic == "createPoll"){
		return pollLink(doc.pollId)
	}
	
	if(doc.topic == "deletePoll"){
		return doc.pollId
	}
	
	if(doc.topic == "oauthLogin"){
		return ""
	}
}

if(document.location.href.match(/latest=true/)){
	api("getLatest", {limit: 200}).then(result => {
		app = div().a(result.filter(doc => isDocVerified(doc)).map(doc => div().fl().aic().pad(2).mar(2).bc("#eee").a(
			div().w(150).pad(2).mar(2).bc("#ffe").html(doc.topic),
			div().w(150).pad(2).mar(2).bc("#eff").html(doc.verifiedUser.username),
			div().w(200).pad(2).mar(2).bc("#fef").html(new Date(doc.createdAt).toLocaleString()).ffms(),
			div().pad(2).mar(2).bc("#eee").html(docInfo(doc)),
		)))
		
		document.getElementById("root").appendChild(app.e)
	})
}else{
	app = App({state: State(STATE)})
	
	document.getElementById("root").appendChild(app.e)
}

setupSource(blob => {	
	if(blob.kind != "tick") console.info(blob)
	if(blob.topic == "setState"){
		app.setState(State(blob.state))
	}
}, TICK_INTERVAL)

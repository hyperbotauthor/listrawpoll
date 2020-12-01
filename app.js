let loadPollMatch = document.location.href.match(/loadPoll=([a-zA-Z0-9_]+)/)

function storeLocal(path, value){
	localStorage.setItem(path, JSON.stringify(value))
}

function getLocal(path, value){
	let stored = localStorage.getItem(path)
	
	if(!stored) return value
	
	try{
		parseValue = JSON.parse(stored)
		return parseValue
	}catch(err){
		return value
	}
}

function IS_DEV(){
	return document.location.host.match(/localhost|goorm.io/)
}

function SORT_UNIQUE(){
	return document.location.href.match(/sort=unique/)
}

function getPollsUrl(unique, loadPoll){
	let pollUrls = []
	
	if(loadPoll){
		pollUrls.push(`loadPoll=${loadPoll}`)	
	}else{
		if(loadPollMatch) pollUrls.push(`loadPoll=${loadPollMatch[1]}`)	
	}
	
	if(unique) pollUrls.push(`sort=unique`)
	
	if(pollUrls.length){
		return `/?${pollUrls.join("&")}`
	}
	
	return `/`
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
				window.alert("Transaction quota exceeded. Wait a little.")				
			}else if(result.error){
				window.alert(result.status)
			}else{
				resolve(result)
			}
		})
	})	
}

class ControlButton_ extends button_{
	constructor(callback){
		super(callback)
		
		this.bdrs("solid").bdrw(1).bdrc("#aaa").bdrr(10).pad(4)
			.addStyle("paddingLeft", "10px").addStyle("paddingRight", "10px")
			.addStyle("boxShadow", "3px 3px #000")
	}
}
function ControlButton(callback){return new ControlButton_(callback)}

class UserWithVote_ extends SmartdomElement_{
	constructor(props){
		super({...props, ...{tagName: "div"}})
		
		this.dib().fl().aic().mar(2).pad(2).bc("#eee").a(
			div().mar(2).pad(3).addStyle("paddingLeft", "8px").addStyle("paddingRight", "8px").bc("#add").ffms().addStyle("fontStyle", "italic").html(userLink(this.props.username))
		)
		
		if(this.props.showCount) this.a(
			div().mar(2).marl(4).marr(4).pad(2).bc("#ffa").fwb().c("#070").html(`${this.props.votes}`)
		)
	}
}
function UserWithVote(props){return new UserWithVote_(props)}

class SmartPoll_ extends SmartdomElement_{
	constructor(props){
		super({...props, ...{tagName: "div"}})
		
		this.parentState = this.props.parentState
		
		this.poll = this.props.poll || Poll()
		
		this.pad(2).mar(2).bc(this.isMine() ? "#afa" : "#eee").bdrs("solid").bdrw(1).bdrc("#777").bdrr(10)
		
		this.build()
	}
	
	isMine(){
		return this.poll.author.equalTo(getUser())
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
		document.location.href = getPollsUrl(SORT_UNIQUE(), this.poll.pollId)
	}
	
	collapse(){
		storeLocal(`collapsePoll/${this.poll.pollId}`, true)
		this.parentState.build()
	}
	
	expand(){
		storeLocal(`collapsePoll/${this.poll.pollId}`, false)
		this.parentState.build()
	}
	
	build(){
		let collapsed = getLocal(`collapsePoll/${this.poll.pollId}`)
		
		this.x().a(
			div().fl().aic().jc("space-between").a(
				div().c("#007").fwb().w(600).fs(22).mar(2).pad(2).bc("#ffe").html(this.poll.poll).curp().ae("click", _ => this.loadPoll()),
				ControlButton(_ => this.addOption()).html("Add option").bc("#afa").marr(10).op(this.isMine() ? 1 : 0.5),
				collapsed ?
					ControlButton(_ => this.expand()).html("Expand").bc("#afa")
				:
					ControlButton(_ => this.collapse()).html("Collapse").bc("#dd8")
				,
				ControlButton(_ => this.delete()).html("Delete").bc("#faa").marr(10).op(this.isMine() ? 1 : 0.5)
			),
			collapsed ? div() : div().marl(10).pad(2).bc(this.isMine() ? "#9e9" : "#eee").html(`by <b style="color:#070">${this.poll.author.username}</b> <small><i><a href="https://lichess.org/@/${this.poll.author.username}" rel="noopener noreferrer" target="_blank">view profile</a> </i>created at ${new Date(this.poll.createdAt).toLocaleString()} ${this.poll.pollId}	</small>`),
			this.optionsDiv = collapsed ? div() : div().pad(2).marl(10).bc("#de9").a(
				this.poll.options.sort((a,b) => SORT_UNIQUE() ? b.getNumVoters() - a.getNumVoters() : b.getNumVotes() - a.getNumVotes())
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
				.map(poll => SmartPoll({parentState: this, poll: poll}))
		)
		
		return this
	}
	
	cmpPolls(a, b){
		let me = getUser()
		
		if( a.getNumMe(me) != b.getNumMe(me) ) return b.getNumMe(me) - a.getNumMe(me)
		
		if( a.getNumMe(me) ) return b.createdAt - a.createdAt
		
		let [aColl, bColl] = [a, b].map(poll => getLocal(`collapsePoll/${poll.pollId}`) ? 1 : 0)
		
		console.log(aColl, bColl)
		
		if(aColl != bColl) return aColl - bColl
		
		return SORT_UNIQUE() ? b.getNumVoters() - a.getNumVoters() : b.getNumVotes() - a.getNumVotes()
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
		
		this.showVotesOpen = {}
	}	
	
	isMine(){
		return this.parentPoll.isMine()
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
		
		if(!editedOption){
			return
		}
		
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
	
	showVotes(kind, showCount){
		const entries = Object.entries(this.option.getVoters())
		
		if(!entries.length) return
		
		let isOpen = this.showVotesOpen[kind]
		
		for(let kind of ["total", "unique"]){
			this.showVotesDivs[kind].x().disp("none")	
			this.showVotesOpen[kind] = false
		}
		
		if(isOpen){			
			this.showVotesOpen[kind] = false
			return
		}
		
		this.showVotesOpen[kind] = true
		
		this.showVotesDivs[kind].fl().a(entries
			.filter(entry => entry[1].numVotes).sort((a,b) => b[1].numVotes - a[1].numVotes).map(entry => 
				UserWithVote({username: entry[0], votes: entry[1].numVotes, showCount: showCount})
			)
		)
		
		this.showVotesOpen[kind] = true
	}
	
	createShowVotesDiv(){
		return div().disp("none").poa().pad(5).bc("#e8f")
					.w(600).jcsa().addStyle("flexWrap", "wrap")
					.t(30).l(-300).addStyle("zIndex", 100)
	}
	
	build(){
		this.showVotesDivs = {
			"total": this.createShowVotesDiv(),
			"unique": this.createShowVotesDiv(),
		}
		
		let voteBlocks = ["total", "unique"].map(kind => 
			[
				div().html(`${kind}`),
				div().por().w(50).tac().pad(2).mar(2).bc(kind == "total" ? "#ff0" : "#ccf").fs(18).c("#070").fwb()
					.html(`${kind == "total" ? this.option.getNumVotes() : this.option.getNumVoters()}`).curp()
					.ae("click", this.showVotes.bind(this, kind, kind == "total")).a(
						this.showVotesDivs[kind]
				)
			]
		)
		
		this.x().a(			
			div().w(550).pad(2).mar(2).bc("#edf").fs(18).fwb().html(this.option.option),
			ControlButton(_=>this.vote(1)).html(`<div style="display: flex; align-items: center;">Vote <img style="margin-left: 5px;" width="18px" src="/stuff/tick.png"></img></div>`).bc("#afa")
		)
		
		if(SORT_UNIQUE()) voteBlocks.reverse()
		
		for(let block of voteBlocks){
			this.a(block)
		}
		
		this.a(						
			ControlButton(_=>this.vote(-1)).html("Unvote").bc("#dd7"),
			ControlButton(_=>this.edit()).html("Edit").bc("#aad").op(this.isMine() ? 1 : 0.5),
			ControlButton(_=>this.delete()).html("Delete").bc("#faa").op(this.isMine() ? 1 : 0.5)
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
	
	changeSort(){
		document.location.href = getPollsUrl(!SORT_UNIQUE())
	}
	
	build(){
		this.controlPanel = div().mar(6).pad(6).bc("#8b8").por().h(35).bdrs("solid").bdrr(10).bdrc("#773")
		
		this.x().bc("#ffa").a(			
			div().h(165),
			div().por().a(
				div().poa().t(-185).l(-20).addStyle("zIndex", "100").pad(3).fs(20).html(`<img src="stuff/listrawpoll.png"></img>`),
				this.controlPanel.a(
					div().poa().addStyle("zIndex", "200").a(
						ControlButton(_=>this.createPoll()).bc("#afa").fs(22).pad(3)
						.addStyle("paddingRight", "10px").addStyle("paddingLeft", "10px").html("Create poll"),
						ControlButton(_=>this.changeSort()).bc(SORT_UNIQUE() ? "#ffa" : "#aaf"	).fs(14)
							.html(SORT_UNIQUE() ? "Sort by total" : "Sort by unique").marl(10)
					)
				),				
				SmartState({state: this.state}).mart(5),
			)			
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
	return htmlLink(getPollsUrl(false, pollId), pollId)
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

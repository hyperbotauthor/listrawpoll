function UID(){
	return "uid_" + Math.random().toString(36).substring(2,12)
}

const DEFAULT_POLL = "Poll?"
const DEFAULT_OPTION = "Yes!"

class User_{
	constructor(props){
		this.deserialize(props)
	}
	
	deserialize(props){
		this.props = props || {}

		this.id = this.props.id || "@nonymous"
		this.username = this.props.username || "@nonymous"
		
		return this
	}
	
	serialize(){
		return {
			id: this.id,
			username: this.username
		}
	}
	
	equalTo(user){
		return this.id == user.id
	}
}
function User(props){return new User_(props)}

class Transaction_{
	constructor(props){
		this.deserialize(props)
	}
	
	deserialize(props){
		this.props = props || {}

		this.author = this.props.author ? User(this.props.author) : User()
		this.topic = "transaction"
		this.transactionId = this.props.transactionId || UID()
		this.createdAt = this.props.createdAt || new Date().getTime()
		
		this.verifiedUser = this.props.verifiedUser ? User(this.props.verifiedUser) : User()
		
		return this
	}
	
	serialize(){
		return {
			author: this.author.serialize(),
			topic: this.topic,
			transactionId: this.transactionId,
			createdAt: this.createdAt,
			
			verifiedUser: this.verifiedUser.serialize()
		}
	}
}
function Transaction(props){return new Transaction_(props)}

class CreatePoll_ extends Transaction_{
	constructor(props){
		super(props)
		
		this.deserialize(props)
	}
	
	deserialize(props){
		this.props = props || {}
		
		super.deserialize(this.props)
		
		this.topic = "createPoll"
		
		this.poll = this.props.poll || DEFAULT_POLL
		this.pollId = this.props.pollId || UID()
		
		return this
	}
	
	serialize(){
		return {...super.serialize(), ...{			
			poll: this.poll,
			pollId: this.pollId
		}}
	}
}
function CreatePoll(props){return new CreatePoll_(props)}

class DeletePoll_ extends Transaction_{
	constructor(props){
		super(props)
		
		this.deserialize(props)
	}
	
	deserialize(props){
		this.props = props || {}
		
		super.deserialize(this.props)
		
		this.topic = "deletePoll"
		
		this.pollId = this.props.pollId
		
		return this
	}
	
	serialize(){
		return {...super.serialize(), ...{						
			pollId: this.pollId
		}}
	}
}
function DeletePoll(props){return new DeletePoll_(props)}

class AddOption_ extends Transaction_{
	constructor(props){
		super(props)
		
		this.deserialize(props)
	}
	
	deserialize(props){
		this.props = props || {}
		
		super.deserialize(this.props)
		
		this.topic = "addOption"
		
		this.option = PollOption(this.props.option)
		
		return this
	}
	
	serialize(){
		return {...super.serialize(), ...{			
			option: this.option.serialize()
		}}
	}
}
function AddOption(props){return new AddOption_(props)}

class AddVote_ extends Transaction_{
	constructor(props){
		super(props)
		
		this.deserialize(props)
	}
	
	deserialize(props){
		this.props = props || {}
		
		super.deserialize(this.props)
		
		this.topic = "addVote"
		
		this.vote = Vote(this.props.vote)
		
		return this
	}
	
	serialize(){
		return {...super.serialize(), ...{			
			vote: this.vote.serialize()
		}}
	}
}
function AddVote(props){return new AddVote_(props)}

class DeleteOption_ extends Transaction_{
	constructor(props){
		super(props)
		
		this.deserialize(props)
	}
	
	deserialize(props){
		this.props = props || {}
		
		super.deserialize(this.props)
		
		this.topic = "deleteOption"
		
		this.parentPollId = this.props.parentPollId
		this.optionId = this.props.optionId
		
		return this
	}
	
	serialize(){
		return {...super.serialize(), ...{			
			parentPollId: this.parentPollId,
			optionId: this.optionId
		}}
	}
}
function DeleteOption(props){return new DeleteOption_(props)}

class OauthLogin_ extends Transaction_{
	constructor(props){
		super(props)
		
		this.deserialize(props)
	}
	
	deserialize(props){
		this.props = props || {}
		
		super.deserialize(this.props)
		
		this.topic = "oauthLogin"
		
		return this
	}
	
	serialize(){
		return {...super.serialize(), ...{			
			
		}}
	}
}
function OauthLogin(props){return new OauthLogin_(props)}

function transactionFromBlob(blob){
	switch(blob.topic){
		case "createPoll": return CreatePoll(blob)
		case "deletePoll": return DeletePoll(blob)
		case "addOption": return AddOption(blob)
		case "addVote": return AddVote(blob)
		case "deleteOption": return DeleteOption(blob)
		case "oauthLogin": return OauthLogin(blob)
	}
}

class Poll_{
	constructor(props){
		this.deserialize(props)
	}
	
	deserialize(props){
		this.props = props || {}
		
		this.poll = this.props.poll || DEFAULT_POLL
		this.author = this.props.author ? User(this.props.author) : User()
		this.createdAt = this.props.createdAt || new Date().getTime()
		this.pollId = this.props.pollId || UID()		
		this.options = (this.props.options || []).map(optionBlob => PollOption(optionBlob))
		
		return this
	}
	
	serialize(){
		return {
			poll: this.poll,
			author: this.author.serialize(),
			createdAt: this.createdAt,
			pollId: this.pollId,
			options: this.options.map(option => option.serialize())
		}
	}
	
	addOption(option){
		this.options.push(option)
	}
	
	getOptionById(optionId){
		return this.options.find(option => option.optionId == optionId)
	}
	
	deleteOptionById(optionId){
		let option = this.options.find(option => option.optionId == optionId)
		
		if(!option) return
		
		if(option.getNumVotes() > 0){
			return {
				error: true,
				status: "Not allowed to delete option that has votes."
			}
		}
		
		this.options = this.options.filter(option => option.optionId != optionId)
	}
	
	executeTransaction(transaction){
		if(transaction instanceof AddVote_){
			let vote = transaction.vote
			
			let option = this.getOptionById(vote.targetOptionId)
			
			if(option){
				option.addVote(vote)
			}
		}
	}
	
	getNumVotes(){
		let numVotes = 0
		
		this.options.forEach(options => numVotes += options.getNumVotes())
		
		return numVotes
	}
	
	getNumVoters(){
		let numVotes = 0
		
		this.options.forEach(options => numVotes += options.getNumVoters())
		
		return numVotes
	}
	
	getNumMe(me){
		return this.author.equalTo(me) ? 1 : 0
	}
}
function Poll(props){return new Poll_(props)}

class State_{
	constructor(props){
		this.deserialize(props)
	}
	
	deserialize(props){
		this.props = props || {}
		
		this.pollsBlob = this.props.polls || []
		
		this.polls = this.pollsBlob.map(pollBlob => Poll(pollBlob))
		
		return this
	}
	
	serialize(){
		return {
			polls: this.polls.map(poll => poll.serialize())
		}
	}
	
	executeTransaction(transaction){
		//console.info("executing transaction", transaction)
		
		if(transaction instanceof CreatePoll_){
			let poll = Poll({
				poll: transaction.poll,
				createdAt: transaction.createdAt,
				pollId: transaction.pollId,
				author: User(transaction.author)
			})
			
			this.polls.push(poll)
			
			return
		}
		
		if(transaction instanceof DeletePoll_){
			let poll = this.getPollById(transaction.pollId)
			
			if(poll){
				if(!poll.author.equalTo(transaction.verifiedUser)){
					return
				}
				
				this.polls = this.polls.filter(poll => poll.pollId != transaction.pollId)	
			}			
		}
		
		if(transaction instanceof AddOption_){
			let targetPoll = this.getPollById(transaction.option.parentPollId)
			
			if(targetPoll){
				if(!targetPoll.author.equalTo(transaction.verifiedUser)){
					return
				}
				
				targetPoll.addOption(transaction.option)
			}
		}
		
		if(transaction instanceof AddVote_){
			let targetPoll = this.getPollById(transaction.vote.targetPollId)
			
			if(targetPoll){
				targetPoll.executeTransaction(transaction)
			}
		}
		
		if(transaction instanceof DeleteOption_){
			let targetPoll = this.getPollById(transaction.parentPollId)
			
			if(targetPoll){
				if(!targetPoll.author.equalTo(transaction.verifiedUser)){
					return
				}
				
				return targetPoll.deleteOptionById(transaction.optionId)
			}
		}
	}
											 
	getPollById(pollId){
		return this.polls.find(poll => poll.pollId == pollId)
	}
}
function State(props){return new State_(props)}

class Vote_{
	constructor(props){
		this.deserialize(props)
	}
	
	deserialize(props){
		this.props = props || {}
		
		this.author = User(this.props.author)
		this.createdAt = this.props.createdAt || new Date().getTime()
		this.targetPollId = this.props.targetPollId
		this.targetOptionId = this.props.targetOptionId		
		this.quantity = this.props.quantity || 1
	}
	
	serialize(){
		return {
			author: this.author.serialize(),
			createdAt: this.createdAt,
			targetPollId: this.targetPollId,
			targetOptionId: this.targetOptionId,
			quantity: this.quantity
		}
	}
}
function Vote(props){return new Vote_(props)}

class PollOption_{
	constructor(props){
		this.deserialize(props)
	}
	
	deserialize(props){
		this.props = props || {}
		
		this.optionId = this.props.optionId || UID()
		this.option = this.props.option || DEFAULT_OPTION
		this.parentPollId = this.props.parentPollId
		this.votes = (this.props.votes || []).map(voteBlob => Vote(voteBlob))
	}
	
	serialize(){
		return {			
			option: this.option,
			optionId: this.optionId,
			parentPollId: this.parentPollId,
			votes: this.votes.map(vote => vote.serialize())
		}
	}
	
	getVotesByUser(user){
		return this.votes.filter(vote => vote.author.equalTo(user))
	}
	
	addVote(vote){
		if(vote.quantity < 0){
			let numVotes = this.getNumVotesFor(this.getVotesByUser(vote.author))
			if(numVotes < 1){				
				return
			}
		}
		
		this.votes.push(vote)
	}

	getNumVotesFor(votes){
		let numVotes = 0
		
		votes.forEach(vote => numVotes += vote.quantity)
		
		return numVotes
	}
	
	getNumVotes(){
		return this.getNumVotesFor(this.votes)
	}
	
	getVoters(){
		let voters = {}
		
		for(let vote of this.votes){
			let voter = vote.author.username
			
			if(!voters[voter]) voters[voter] = {numVotes: 0}
			
			let newNumVotes = voters[voter].numVotes + vote.quantity
			
			if(newNumVotes > 0){
				 voters[voter].numVotes = newNumVotes
			}else{
				delete voters[voter]
			}
		}
		
		return voters
	}
	
	getNumVoters(){
		return Object.keys(this.getVoters()).length
	}
}
function PollOption(props){return new PollOption_(props)}

if(typeof module != "undefined"){
	module.exports = {
		User: User,
		CreatePoll: CreatePoll,
		CreatePoll_: CreatePoll_,
		DeletePoll: DeletePoll,
		transactionFromBlob: transactionFromBlob,
		Poll: Poll,
		State: State,
		Transaction: Transaction
	}
}

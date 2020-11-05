function UID(){
	return "uid_" + Math.random().toString(36).substring(2,12)
}

const DEFAULT_POLL = "Poll?"

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
		
		return this
	}
	
	serialize(){
		return {
			author: this.author.serialize(),
			topic: this.topic,
			transactionId: this.transactionId,
			createdAt: this.createdAt
		}
	}
}

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

function transactionFromBlob(blob){
	switch(blob.topic){
		case "createPoll": return CreatePoll(blob)
		case "deletePoll": return DeletePoll(blob)
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
		this.createdAt = this.props.createdAtr || new Date().getTime()
		this.pollId = this.props.pollId || UID()
		
		return this
	}
	
	serialize(){
		return {
			poll: this.poll,
			author: this.author.serialize(),
			createdAt: this.createdAt,
			pollId: this.pollId
		}
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
			this.polls = this.polls.filter(poll => poll.pollId != transaction.pollId)
		}
	}
}
function State(props){return new State_(props)}

if(typeof module != "undefined"){
	module.exports = {
		User: User,
		CreatePoll: CreatePoll,
		DeletePoll: DeletePoll,
		transactionFromBlob: transactionFromBlob,
		Poll: Poll,
		State: State
	}
}

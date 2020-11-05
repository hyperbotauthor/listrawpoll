# mongodbtest

MongoDb test application.

## Motivation

So far I used Firebase for persistence, but I want to try something else. This app is meant to be the mother of all applications that use MongoDb for persistence and oauth for user identification.

## Features

### Oauth

The app lets you log in with oauth, and this login is stored in the database, so after server restart it is still remembered.

### Database

You are allowed to view and edit that database. You can list all databases, list all collections within databases and get a random sample document from any collection ( showing all docuents is a no go, as there can be several thousand documents in a collection ). You can also update a document using upsert strategy, by specifying the database name, the collection name, the filter and the document.

For filtering refer to https://docs.mongodb.com/manual/reference/operator/query/ .

If your filter matches a document, then this document will be updated with your document, otherwise your document will be inserted as a new document.

### Online

https://mongodbtestserver.herokuapp.com/
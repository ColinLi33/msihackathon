const { MongoClient, ServerApiVersion , ObjectId } = require('mongodb');

class MongoDriver {
    constructor(uri) {
        this.uri = uri;
        // this.client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        this.client = new MongoClient(uri, {
            serverApi: {
              version: ServerApiVersion.v1,
              strict: true,
              deprecationErrors: true,
            }
        });
        this.db = null;
    }

    async connect() {
        try {
            await this.client.connect();
            this.db = this.client.db('tec');
            console.log('Connected to MongoDB');
        } catch (error) {
            console.error('Error connecting to MongoDB:', error);
            throw error;
        }
    }

    async close() {
        await this.client.close();
        console.log('Connection to MongoDB closed');
    }

    async read(collectionName, query = {}) {
        const collection = this.db.collection(collectionName);
        try {
            const result = await collection.find(query).toArray();
            return result;
        } catch (error) {
            console.error('Error reading from MongoDB:', error);
            throw error;
        }
    }

    async write(collectionName, document) {
        const collection = this.db.collection(collectionName);
        try {
            const result = await collection.insertOne(document);
            console.log('Document inserted:', result.insertedId);
            return result;
        } catch (error) {
            console.error('Error writing to MongoDB:', error);
            throw error;
        }
    }

    async update(collectionName, query, update) {
        const collection = this.db.collection(collectionName);
        const options = { upsert: true };
        try {
            const result = await collection.findOneAndUpdate(query, { $set: update }, options);
            console.log('Document updated');
            return result;
        } catch (error) {
            console.error('Error updating in MongoDB:', error);
            throw error;
        }
    }

    async delete(collectionName, query) {
        const collection = this.db.collection(collectionName);
        try {
            const result = await collection.deleteOne(query);
            console.log('Document deleted:', result.deletedCount);
            return result;
        } catch (error) {
            console.error('Error deleting from MongoDB:', error);
            throw error;
        }
    }

    async getSize(collectionName){
        const size = this.db.collection(collectionName).count();
        //console.log(size);
        return size;
    }
}
module.exports = MongoDriver;
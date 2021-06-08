const { MongoClient } = require('mongodb')

const MONGO_DB = 'flossbank_db'
const ORGANIZATIONS_COLLECTION = 'organizations'

class Mongo {
  constructor ({ config, log }) {
    this.log = log
    this.config = config
    this.db = null
    this.mongoClient = null
  }

  async connect () {
    const mongoUri = await this.config.getMongoUri()
    this.mongoClient = new MongoClient(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    await this.mongoClient.connect()

    this.db = this.mongoClient.db(MONGO_DB)
  }

  async close () {
    if (this.mongoClient) return this.mongoClient.close()
  }

  async getPendingManualOrgDistributions () {
    // Grab all organizations that are a manual billed and
    // have a remainingDonation > 0
    return this.db.collection(ORGANIZATIONS_COLLECTION).find({
      'billingInfo.manuallyBilled': true,
      remainingDonation: { $gt: 0 }
    }).toArray()
  }
}

module.exports = Mongo

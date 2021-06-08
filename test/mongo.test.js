const test = require('ava')
const sinon = require('sinon')
const { MongoMemoryServer } = require('mongodb-memory-server')
const Config = require('../lib/config')
const Mongo = require('../lib/mongo')

test.before(async (t) => {
  const config = new Config({
    kms: {}
  })

  const mongo = new MongoMemoryServer()
  const mongoUri = await mongo.getUri()

  config.decrypt = sinon.stub().returns(mongoUri)
  t.context.Mongo = new Mongo({ config, log: { info: sinon.stub() } })
  await t.context.Mongo.connect()

  const { insertedId: org1 } = await t.context.Mongo.db.collection('organizations').insertOne({
    name: 'flossbank',
    billingInfo: {
      manuallyBilled: true
    },
    donationAmount: 1000,
    remainingDonation: 1000
  })
  t.context.orgWithRemainingDonation = org1

  const { insertedId: org2 } = await t.context.Mongo.db.collection('organizations').insertOne({
    name: 'tf',
    billingInfo: {
      customer_id: 'asdf'
    },
    donationAmount: 1000
  })
  t.context.orgStripeBilled = org2

  const { insertedId: org3 } = await t.context.Mongo.db.collection('organizations').insertOne({
    name: 'tf2',
    billingInfo: {
      manuallyBilled: true
    },
    donationAmount: 1000,
    remainingDonation: 0
  })
  t.context.orgNoRemainingDonation = org3
})

test.after(async (t) => {
  await t.context.Mongo.close()
})

test('getPendingManualOrgDistributions', async (t) => {
  const orgsWithPayouts = await t.context.Mongo.getPendingManualOrgDistributions()

  t.true(orgsWithPayouts.length === 1)
  t.false(orgsWithPayouts.some((o) => o._id.toString() === t.context.orgStripeBilled.toString()))
  t.false(orgsWithPayouts.some((o) => o._id.toString() === t.context.orgNoRemainingDonation.toString()))
})

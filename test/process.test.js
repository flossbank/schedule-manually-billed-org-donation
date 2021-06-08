const test = require('ava')
const sinon = require('sinon')
const { MongoMemoryServer } = require('mongodb-memory-server')
const Config = require('../lib/config')
const Mongo = require('../lib/mongo')
const Process = require('../lib/process')
const Sqs = require('../lib/sqs')

test.before(async (t) => {
  const config = new Config({
    kms: {}
  })

  sinon.stub(Date, 'now').returns(1234)

  const mongo = new MongoMemoryServer()
  const mongoUri = await mongo.getUri()

  config.decrypt = sinon.stub().returns(mongoUri)
  t.context.Mongo = new Mongo({ config, log: { info: sinon.stub() } })
  t.context.fakeAwsSqs = {
    sendMessage: sinon.fake.returns({
      promise: sinon.stub()
    })
  }
  t.context.sqs = new Sqs({
    config,
    sqs: t.context.fakeAwsSqs
  })
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
    name: 'flossbank-test-org',
    billingInfo: {
      manuallyBilled: true
    },
    donationAmount: 1000,
    remainingDonation: 500
  })
  t.context.orgWithRemainingDonation2 = org2

  const { insertedId: org3 } = await t.context.Mongo.db.collection('organizations').insertOne({
    name: 'tf',
    billingInfo: {
      customer_id: 'asdf'
    },
    donationAmount: 1000
  })
  t.context.orgStripeBilled = org3

  const { insertedId: org4 } = await t.context.Mongo.db.collection('organizations').insertOne({
    name: 'tf2',
    billingInfo: {
      manuallyBilled: true
    },
    donationAmount: 1000,
    remainingDonation: 0
  })
  t.context.orgNoRemainingDonation = org4
})

test.after(async (t) => {
  await t.context.Mongo.close()
})

test.only('should find orgs with payouts and send sqs messages successfully', async (t) => {
  await Process.process({ db: t.context.Mongo, log: { info: sinon.stub() }, sqs: t.context.sqs })
  const sqsCalls = t.context.fakeAwsSqs.sendMessage.getCalls()

  // Only the first two orgs are manually billed and have remaining donations > 0
  t.true(sqsCalls.length === 2)

  t.deepEqual(JSON.parse(sqsCalls[0].args[0].MessageBody), {
    organizationId: t.context.orgWithRemainingDonation.toString(),
    amount: 1000,
    timestamp: 1234
  })

  // This event should be the remainingAmount, because it's less than the donationAmount, so we shouldn't
  // send the donationAmount otherwise we would have _oversent_ money.
  t.deepEqual(JSON.parse(sqsCalls[1].args[0].MessageBody), {
    organizationId: t.context.orgWithRemainingDonation2.toString(),
    amount: 500,
    timestamp: 1234
  })
})

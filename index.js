const AWS = require('aws-sdk')
const Pino = require('pino')
const Process = require('./lib/process')
const Config = require('./lib/config')
const Db = require('./lib/mongo')
const Sqs = require('./lib/sqs')

const kms = new AWS.KMS({ region: 'us-west-2' })
const awsSqs = new AWS.SQS()

/*
- Get all manually billed organizations that have a donation that should be scheduled.
- This is determined by finding all manually billed orgs that have a remainingDonation.
*/
exports.handler = async () => {
  const log = Pino()
  const config = new Config({ kms })
  const sqs = new Sqs({ sqs: awsSqs, config })
  const db = new Db({ log, config })
  await db.connect()

  try {
    await Process.process({ db, log, sqs })
  } finally {
    await db.close()
  }
}

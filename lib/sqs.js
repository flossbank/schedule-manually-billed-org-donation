class Sqs {
  constructor ({ config, sqs }) {
    this.config = config
    this.sqs = sqs
  }

  async sendDistributeOrgDonationMessage (payload) {
    const url = this.config.getDistributeOrgDonationQueueUrl()
    return this.sendMessage(url, payload)
  }

  async sendMessage (url, payload) {
    return this.sqs.sendMessage({
      QueueUrl: url,
      MessageBody: JSON.stringify(payload)
    }).promise()
  }
}

module.exports = Sqs

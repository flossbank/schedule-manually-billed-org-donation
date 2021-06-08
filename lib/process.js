exports.process = async ({ log, db, sqs }) => {
  log.info('Starting shedule of manually billed organization donations')

  const orgsPendingPayout = await db.getPendingManualOrgDistributions()

  for (const org of orgsPendingPayout) {
    log.info('Sending sqs distribute org donation for org %s', org._id)
    await sqs.sendDistributeOrgDonationMessage({
      organizationId: org._id,
      amount: org.donationAmount <= org.remainingDonation ? org.donationAmount : org.remainingDonation,
      timestamp: Date.now()
    })
  }

  log.info('Finished, distribute manually billed organization lambda ending')
  return { success: true }
}

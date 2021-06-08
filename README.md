# schedule-manually-billed-org-donation

Lambda that runs on a cron (once a day) to
check for maintainer payouts that haven't been paid yet, and schedule them
by sending an SQS event to our "process maintainer payouts" lambda

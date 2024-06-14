const { Validator } = require('./validator')
const searchAndReplaceSpecialAnnotations = require('../actions/lib/searchAndReplaceSpecialAnnotation')
const constructErrorOutput = require('./options_processor/options/lib/constructErrorOutput')
const consolidateResult = require('./options_processor/options/lib/consolidateResults')
const _ = require('lodash')

class LastComment extends Validator {
  constructor () {
    super('lastComment')
    // Ignore 'issue_comment.deleted' to not validate what obviously isn't wanted anymore
    this.supportedEvents = [
      'pull_request.*',
      'pull_request_review.*',
      'issues.*',
      'issue_comment.created',
      'issue_comment.edited'
    ]
    this.supportedSettings = {
      must_include: {
        regex: ['string', 'array'],
        regex_flag: 'string',
        message: 'string'
      },
      must_exclude: {
        regex: ['string', 'array'],
        regex_flag: 'string',
        message: 'string'
      },
      exclude: {
        users: ['array'],
        bots: 'boolean'
      }
    }
  }

  async validate (context, validationSettings) {
    let excludeOption = null
    if (validationSettings.exclude) {
      excludeOption = validationSettings.exclude
      delete validationSettings.exclude
    }

    // payload is the issue or pull_request that the comment was posted in
    const payload = this.getPayload(context)
    const issueNumber = payload.number
    let filteredComments = []
    if (context.eventName === 'issue_comment') {
      console.log(context.payload.comment.user.login.toLowerCase())
      if (context.payload.comment.user.login.toLowerCase().endsWith('[bot]')) {
        const validatorContext = { name: this.name }
        const err = new Error('Aborting on comment posted by a bot.')
        const output = [constructErrorOutput(validatorContext, JSON.stringify(context.payload.comment), validationSettings, `${err.name}`, err)]
        console.log(output)
        return consolidateResult(output, validatorContext)
      }
      // the single comment that got created/edited
      filteredComments = [this.getPayload(context, true).comment]
    } else {
      // all the comments of the issue or pr
      filteredComments = await this.githubAPI.listComments(context, issueNumber)
    }

    // exclude all GitHub bots by default
    filteredComments = _.reject(filteredComments, c => 
      (excludeOption?.bots ?? true) && c.user.login.toLowerCase().endsWith('[bot]')
    )

    if (excludeOption && excludeOption.users) {
      const excludeUsers = excludeOption.users.map(u =>
        searchAndReplaceSpecialAnnotations(u, payload).toLowerCase()
      )
      filteredComments = _.reject(filteredComments, c =>
        excludeUsers.includes(c.user.login.toLowerCase())
      )
    }

    return this.processOptions(
      validationSettings,
      filteredComments.length ? filteredComments[filteredComments.length - 1].body : ''
    )
  }
}

module.exports = LastComment

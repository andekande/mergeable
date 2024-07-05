const { Validator } = require('./validator')
const options = require('./options_processor/options')
const ListProcessor = require('./options_processor/listProcessor')
const consolidateResult = require('./options_processor/options/lib/consolidateResults')
const constructErrorOutput = require('./options_processor/options/lib/constructErrorOutput')
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
        message: 'string',
      },
      must_exclude: {
        regex: ['string', 'array'],
        regex_flag: 'string',
        message: 'string',
      },
      comment_author: {
        one_of: 'array',
        none_of: 'array',
        no_bots: 'boolean'
      },
      comment_changed_by: {
        one_of: 'array',
        none_of: 'array'
      },
      comment_changed_from: {
        must_include: {
          regex: ['string', 'array'],
          regex_flag: 'string',
          message: 'string',
        },
        must_exclude: {
          regex: ['string', 'array'],
          regex_flag: 'string',
          message: 'string',
        }
      }
    }
  }

  async validate (context, validationSettings) {
    let excludeBots = true
    const commentAuthorOption = { do: validationSettings.do }
    const commentChangedByOption = { do: validationSettings.do }
    const commentChangedFromOption = { do: validationSettings.do }
    const validatorContext = { name: validationSettings.do }

    if (validationSettings.comment_author) {
      if (validationSettings.comment_author.one_of) {
        commentAuthorOption.one_of = await ListProcessor.process(validationSettings.comment_author.one_of, context)
      }
      if (validationSettings.comment_author.none_of) {
        commentAuthorOption.none_of = await ListProcessor.process(validationSettings.comment_author.none_of, context)
      }
      if (validationSettings.comment_author.no_bots === false) {
        excludeBots = false
      }
    }
    delete validationSettings.comment_author

    if (validationSettings.comment_changed_by) {
      if (validationSettings.comment_changed_by.one_of) {
        commentChangedByOption.one_of = await ListProcessor.process(validationSettings.comment_changed_by.one_of, context)
      }
      if (validationSettings.comment_changed_by.none_of) {
        commentChangedByOption.none_of = await ListProcessor.process(validationSettings.comment_changed_by.none_of, context)
      }
    }
    delete validationSettings.comment_changed_by

    if (validationSettings.comment_changed_from) {
      if (validationSettings.comment_changed_from.must_include) {
        commentChangedFromOption.must_include = validationSettings.comment_changed_from.must_include
      }
      if (validationSettings.comment_changed_from.must_exclude) {
        commentChangedFromOption.must_exclude = validationSettings.comment_changed_from.must_exclude
      }
    }
    delete validationSettings.comment_changed_from

    const hasCommentChangedOption = [
      commentChangedByOption.one_of,
      commentChangedByOption.none_of,
      commentChangedFromOption.must_include,
      commentChangedFromOption.must_exclude]
      .some(o => !_.isUndefined(o))

    // payload is the issue or pull_request that the comment was posted in
    const issueNumber = this.getPayload(context).number
    const optionResults = []
    let comments = []

    if (context.eventName === 'issue_comment' && context.payload.action === 'edited') {
      if (hasCommentChangedOption) {
        // the single comment that got edited
        const commentThatChanged = this.payload.comment
        if (_.isUndefined(commentThatChanged)) {
          const inputMessage = 'issue_comment.edited event without \'comment\' property'
          const errorMessage = 'Failed to validate \'comment_changed_by\' or \'comment_changed_from\' because the edited \'comment\' is missing from the payload. This is likely due to a Check Re-run.'
          const output = [constructErrorOutput(validatorContext, inputMessage, validationSettings, errorMessage)]
          optionResults.push(consolidateResult(output, validatorContext))
        } else {
          comments = [commentThatChanged]
          // drop that comment if comment_changed_by or comment_changed_from do not pass
          const commentChangedBy = this.getPayload(context, true).sender.login
          comments = await this.filterByCommentChange(commentChangedBy, comments, commentChangedByOption)
          const commentChangedFrom = this.getPayload(context, true).changes.body.from
          comments = await this.filterByCommentChange(commentChangedFrom, comments, commentChangedFromOption)
        }
      } else {
        // all the comments of the issue or pr
        comments = await this.githubAPI.listComments(context, issueNumber)
      }
    } else {
      // all the comments of the issue or pr
      comments = await this.githubAPI.listComments(context, issueNumber)
    }

    comments = await this.filterByCommentAuthor(comments, excludeBots, commentAuthorOption)

    const result = await this.processOptions(
      validationSettings,
      comments.length ? comments[comments.length - 1].body : ''
    )
    optionResults.push(result)

    // flatten all intermediary results
    const output = _.flatten(optionResults.map(result => {
      return result.validations
    }))

    return consolidateResult(output, validatorContext)
  }

  async filterByCommentAuthor (comments, excludeBots, commentAuthorOption) {
    let filteredComments = Array.from(comments)

    // exclude all GitHub bots by default
    if (excludeBots) {
      filteredComments = _.reject(filteredComments, c => c.user.login.toLowerCase().endsWith('[bot]'))
    }

    // for each comment, process comment_author option and drop those which don't pass
    if (commentAuthorOption.one_of || commentAuthorOption.none_of) {
      const filtered = []
      for (const c of filteredComments) {
        const result = await this.processOptions(commentAuthorOption, c.user.login)
        if (result.status !== 'pass') {
          filtered.push(c)
        }
      }
      filteredComments = _.difference(filteredComments, filtered)
    }

    return filteredComments
  }

  async filterByCommentChange (input, comments, commentChangedOption) {
    let filteredComments = Array.from(comments)
    
    if (input && commentChangedOption) {
      if (input == "HELLO") {
        console.log("----pre")
      }
      const result = await this.processOptions(commentChangedOption, input)
      if (input == "HELLO") {
        console.log("----post: " + result.status)
      }
      if (result.status !== 'pass') {
        return []
      }
    }

    return filteredComments
  }
}

module.exports = LastComment

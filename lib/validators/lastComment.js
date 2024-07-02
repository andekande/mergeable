const { Validator } = require('./validator')
const ListProcessor = require('./options_processor/listProcessor')
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
        all: 'boolean'
      },
      must_exclude: {
        regex: ['string', 'array'],
        regex_flag: 'string',
        message: 'string',
        all: 'boolean'
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
          regex_flag: 'string'
          message: 'string',
          all: 'boolean'
        },
        must_exclude: {
          regex: ['string', 'array'],
          regex_flag: 'string'
          message: 'string',
          all: 'boolean'
        }
      }
    }
  }

  async validate (context, validationSettings) {
    let excludeBots = true
    let changedCommentCheck = false
    const commentAuthorOption = { do: validationSettings.do }
    const commentChangedByOption = { do: validationSettings.do }
    const commentChangedFromOption = { do: validationSettings.do }
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
      changedCommentCheck = true
      if (validationSettings.comment_changed_by.one_of) {
        commentChangedByOption.one_of = await ListProcessor.process(validationSettings.comment_changed_by.one_of, context)
      }
      if (validationSettings.comment_changed_by.none_of) {
        commentChangedByOption.none_of = await ListProcessor.process(validationSettings.comment_changed_by.none_of, context)
      }
    }
    delete validationSettings.comment_changed_by
    if (validationSettings.comment_changed_from) {
      changedCommentCheck = true
      if (validationSettings.comment_changed_from.must_include) {
        commentChangedFromOption.must_include = validationSettings.comment_changed_from.must_include
      }
      if (validationSettings.comment_changed_from.must_exclude) {
        commentChangedFromOption.must_exclude = validationSettings.comment_changed_from.must_exclude
      }
    }
    delete validationSettings.comment_changed_from

    // payload is the issue or pull_request that the comment was posted in
    const payload = this.getPayload(context)
    const issueNumber = payload.number
    let comments = []
    if (changedCommentCheck && context.eventName === 'issue_comment') {    
      let isChangedCommentCheckPass = true

      // check editor
      if (commentChangedByOption.one_of || commentChangedByOption.none_of) {
        const result = await this.processOptions(commentChangedByOption, this.getPayload(context, true).sender.login)
        if (result.status !== 'pass') {
          isChangedCommentCheckPass = false
        }
      }

      // check edited text
      let commentsFrom = []
      if (commentChangedFromOption.must_include || commentChangedFromOption.must_exclude) {
        const result = await this.processOptions(commentChangedFromOption, this.getPayload(context, true).changes.body.from)
        if (result.status !== 'pass') {
          isChangedCommentCheckPass = false
        }
      }

      if (isChangedCommentCheckPass) {
        // the single comment that got created/edited
        comments = [this.getPayload(context, true).comment]
      }
    } else {
      // all the comments of the issue or pr
      comments = await this.githubAPI.listComments(context, issueNumber)
    }

    comments = await this.filterByCommentAuthor(comments, excludeBots, commentAuthorOption)

    return this.processOptions(
      validationSettings,
      comments.length ? comments[comments.length - 1].body : ''
    )
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
        if (result.status === 'fail') {
          filtered.push(c)
        }
      }
      filteredComments = _.difference(filteredComments, filtered)
    }

    return filteredComments
  }
}

module.exports = LastComment

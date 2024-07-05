LastComment
^^^^^^^^^^^
Validates that the newly created comment contains or excludes given text.
When an existing comment is edited and ``comment_changed_by`` or ``comment_changed_from`` is present, then exactly this one is validated instead.

::

    - do: lastComment
      must_include:
        regex: '/sign'
        regex_flag: 'none' # Optional. Specify the flag for Regex. default is 'i', to disable default use 'none'
        message: 'Contributor Agreement signed...'
      must_exclude:
        regex: 'incompliant'
        regex_flag: 'none' # Optional. Specify the flag for Regex. default is 'i', to disable default use 'none'
        message: 'Violates compliance...'
      comment_author:
        one_of: ['user-1', '@author'] # when the option is present, ONLY comments from users in this list will be considered, use @author for PR/Issue author
        none_of: ['user-2', '@author'] # when the option is present, comments from users in this list will NOT be considered, use @author for PR/Issue author
        no_bots: true # by default comments from any bots will NOT be considered, set to false to exclude only specific bots explicitly in 'comment_author' option
      comment_changed_by:
        one_of: ['user-1', '@author'] # when the option is present AND an existing comment is edited, it is considered ONLY if it got changed by users in this list, use @author for PR/Issue author
        none_of: ['user-2', '@author'] # when the option is present AND an existing comment is edited, it is NOT considered if it got changed by users in this list, use @author for PR/Issue author
      comment_changed_from:
        must_include:
          regex: 'incompliant' # when the option is present AND an existing comment is edited, it is considered ONLY if the content before the edit matches that regular expression
          regex_flag: 'none' # Optional. Specify the flag for Regex. default is 'i', to disable default use 'none'
        must_exclude:
          regex: 'rejected' # when the option is present AND an existing comment is edited, it is NOT considered if the content before the edit matches that regular expression
          regex_flag: 'none' # Optional. Specify the flag for Regex. default is 'i', to disable default use 'none'

Simple example:
::

    # check if the last comment contains only the word 'merge'
    - do: lastComment
      must_include:
        regex: '^merge$'

Complex example:
::

    # check if the last comment, not posted by PR/Issue author, meets one of these conditions 
    # it might have been posted by a bot, except Mergeble itself
    - do: lastComment
      comment_author:
        none_of: ['@bot', '@author']
        no_bots: false
      or:
        - and:
          - must_exclude:
              regex: 'block|wip|stale'
              message: 'pre-requisites are not fulfilled...'
          - must_include:
              regex: 'agreed|confirmed|compliant'
              message: 'pre-requisites are fulfilled...'
        - must_include:
            regex: '^/override$'
            message: 'skip pre-requisite check...'

    # check if the last edit to a comment from the PR/Issue author was done by someone else,
    # and when the content changed from 'awaiting approval' to 'approved' the validator fails
    # but when the edit was done by the PR/Issue author himself the validator passes
    # but when the content before the edit was different from 'awaiting approval' the validator passes
    - do: lastComment
      comment_author:
        one_of: ['@author']
      comment_changed_by:
        none_of: ['@author']
      comment_changed_from:
        must_include:
          regex: 'awaiting approval'
      must_exclude:
        regex: 'approved'
        message: 'No one else but the author can approve.'

Supported Events:
::

    'pull_request.*', 'pull_request_review.*', 'issues.*', 'issue_comment.*'

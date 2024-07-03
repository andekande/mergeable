MustExclude
^^^^^^^^^^^

``must_exclude`` can be used to validate that input does not match the given regular expression.

::

    - do: headRef
      must_exclude:
        regex: '^(feature|hotfix)\/.+$'
        message: |
            Your pull request doesn't adhere to the branch naming convention described <a href="some link">there</a>!

You can also use an array of regex matchers. If any of them match, the validation will fail.

::

    - do: headRef
      must_exclude:
        regex:
          - "^bug"
          - "^breaking"
          - "^test"
        message: |
            Your pull request doesn't adhere to the branch naming convention described <a href="some link">there</a>!

.. list-table:: Supported Params
   :widths: 25 50 25 25
   :header-rows: 1

   * - Param
     - Description
     - Required
     - Default Message
   * - regex
     - Regular expression or array of regular expressions to validate input with
     - Yes
     -
   * - message
     - Message to show if the validation fails
     - No
     - [INPUT NAME] does not include [REGEX]
   * - regex_flag
     - Regex flag to be used with regex param to validate inputs
     - No
     - i
   * - key
     - When input is an object, key specifies the property name to validate
     - No
     - 
   * - all
     - When input is an array of strings, require any expression to not match for all strings
     - No
     - false

Supported Validators:
::

    'author', 'baseRef', 'headRef', 'changeset', 'content', 'description', 'label', 'lastComment', 'milestone', 'title'

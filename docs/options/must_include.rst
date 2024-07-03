MustInclude
^^^^^^^^^^^

``must_include`` can be used to validate that input matches the given regular expression.

::

    - do: headRef
      must_include:
        regex: '^(feature|hotfix)\/.+$'
        message: |
            Your pull request doesn't adhere to the branch naming convention described <a href="some link">there</a>!

You can also use an array of regex matchers. If any of them match, the validation will pass.

::

    - do: headRef
      must_include:
        regex:
          - "^feature"
          - "^hotfix"
          - "^fix"
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
     - When input is an array of strings, require any expression to match for all strings
     - No
     - false

Supported Validators:
::

    'author', 'baseRef', 'headRef', 'changeset', 'commit', 'content', 'description', 'label', 'lastComment', 'milestone', 'project', 'title'

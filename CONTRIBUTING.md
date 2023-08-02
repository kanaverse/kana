# Contributing to Kana

If you are reading this, you already decided to get involved and make a contribution. I guess nothing we say can hold you back! 

But let's not digress. We welcome all contributions to this project through GitHub issues and pull requests.

## Getting Started

Contributions are made to this repo via [Issues](https://github.com/kanaverse/kana/issues) and [Pull Requests (PRs)](https://github.com/kanaverse/kana/pulls). 
A few general guidelines that cover both:

- Search for existing Issues and PRs before creating your own.
- We try to resolve bugs as soon as possible.
Since web applications have many degrees of freedom, it often helps if you can outline the steps to reproduce the issue.
Screenshots of errors messages in the [browser console](https://developer.chrome.com/docs/devtools/open/) help narrow down the issue.

### Setting up

You should already have node available on your machine. Install dependencies:

```sh
npm install --force or yarn # depending on what you use
npm dedupe --force # you might sometimes have to dedupe
```

To start the app:

```sh
yarn start # if using yarn, highly recommended
npm run start # if using npm
```

This usually runs on port 3000 unless something else is already running on the same port.

### Issues
[Issues](https://github.com/kanaverse/kana/issues) should be used to report problems with the application or any of its dependencies, request a new feature, 
or to discuss potential changes before a PR is created. 

If you find an Issue that addresses the problem you're having, please add your own reproducible example to the existing issue rather than creating a new one. 

### Pull Requests
[PRs](https://github.com/kanaverse/kana/pulls) are always welcome and can be a quick way to get your fix or improvement merged. In general, PRs should:

- Only fix/add the functionality in question OR address widespread whitespace/style issues, not both.
- Address a single concern in the least number of changed lines as possible.
- Include documentation in the repo either in the README or through the wiki page.
  
For changes that address core functionality or would require breaking changes (e.g. a major release), it's best to open an Issue to discuss your proposal first. 
This is not required but can save time creating and reviewing changes.

In general, we follow the ["fork-and-pull" Git workflow](https://gist.github.com/Chaser324/ce0505fbed06b947d962)

- [Fork](https://github.com/kanaverse/kana/fork) the repository to your own Github account
- Clone the project to your machine
- Create a branch locally with a succinct but descriptive name
- Commit changes to the branch
- Following any formatting and testing guidelines specific to this repo
- Push changes to your fork
- Open a PR in our repository and follow the PR template so that we can efficiently review the changes

### Style Guide

- We use the [prettier](https://prettier.io/) formatter as the default formatter. If you are using vscode, install this extension. 
- Commitment to Fun: Remember, the only commit we take seriously is our commitment to having fun while coding. Happy developers make better code!

Let's create something amazing together, and build better tools. Happy coding!!

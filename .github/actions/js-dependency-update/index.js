//The code above is leveraging the @actions/core package to 
// write a line to the output of our custom action. In the next exercise we will continue the development of the JavaScript code.

const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');

const setupGit = async () => {
  await exec.exec(`git config --global user.name "gh-automation"`);
  await exec.exec(`git config --global user.email "gh-automation@email.com"`);
};

const validateBranchName = ({ branchName }) =>
  /^[a-zA-Z0-9_\-\.\/]+$/.test(branchName);
const validateDirectoryName = ({ dirName }) =>
  /^[a-zA-Z0-9_\-\/]+$/.test(dirName);

const setupLogger = ({ debug, prefix } = { debug: false, prefix: '' }) => ({
  debug: (message) => {
    if (debug) {
      core.info(`DEBUG ${prefix}${prefix ? ' : ' : ''}${message}`);
    }
  },
  info: (message) => {
    core.info(`${prefix}${prefix ? ' : ' : ''}${message}`);
  },
  error: (message) => {
    core.error(`${prefix}${prefix ? ' : ' : ''}${message}`);
  },
});

async function run() {
  const baseBranch = core.getInput('base-branch', {required: true});
  // const targetBranch = core.getInput('target-branch', {required: true});
  // const headBranch = core.getInput('head-branch') || targetBranch;
  const headBranch = core.getInput('head-branch', {required: true})
  const ghToken = core.getInput('gh-token', {required: true});
  const workingDir = core.getInput('working-directory', {required: true});
  const debug = core.getBooleanInput('debug');  
  const logger = setupLogger({ debug, prefix: '[js-dependency-update]' });


  const commonExecOpts = {
    cwd: workingDir,
  }
  core.setSecret(ghToken);

  logger.debug('Validating inputs base-branch, head-branch, working-directory');

  if (!validateBranchName({ branchName: baseBranch })) {
    core.setFailed(
      'Invalid base-branch name. Branch names should include only characters, numbers, hyphens, underscores, dots, and forward slashes.'
    );
    return;
  }

  if (!validateBranchName({ branchName: headBranch })) {
    core.setFailed(
      'Invalid target-branch name. Branch names should include only characters, numbers, hyphens, underscores, dots, and forward slashes.'
    );
    return;
  }

  if (!validateDirectoryName({ dirName: workingDir })) {
    core.setFailed(
      'Invalid working directory name. Directory names should include only characters, numbers, hyphens, underscores, and forward slashes.'
    );
    return;
  }

  logger.debug(` base branch is ${baseBranch}`);
  logger.debug(`target branch is ${headBranch}`);
  logger.debug(` working directory is ${workingDir}`);

  logger.debug('Checking for package updates');
  await exec.exec('npm update', [], {
    ...commonExecOpts
  });

  const gitStatus = await exec.getExecOutput(
    'git status -s package*.json',
    [],
    {
      ...commonExecOpts
    }
  );

  // const gitDiff = await exec.getExecOutput(
  //   'git diff HEAD^ HEAD',
  //   [],
  //   {
  //     ...commonExecOpts
  //   }
  // )

  if (gitStatus.stdout.length > 0) {
    logger.debug('There are updates available!');
    logger.debug('Setting up git');

    // core.info('[js-dependency-update] : There are updates available!');
    await setupGit();

    logger.debug('Committing and pushing package*.json changes');
    await exec.exec(`git checkout -b ${headBranch}`, [], {
      ...commonExecOpts
    })
    await exec.exec(`git add package.json package-lock.json `, [], {
      ...commonExecOpts
    })
    await exec.exec(`git commit -m "chore: update dependencies`, [], {
      ...commonExecOpts
    })
    // rebase first, if its successful -> push changes
    await exec.exec(`git push -u origin ${headBranch} --force`, [], {
      ...commonExecOpts,
    });

    logger.debug('Fetching octokit API');
    const octokit = github.getOctokit(ghToken)
    try{
      // check if a branch is already created -> push to that branch
      logger.debug(`Creating PR using head branch ${headBranch}`);
    octokit.rest.pulls.create({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      title: `Update NPM dependencies`,
      body: `This pull request updates NPM packages`,
      base: baseBranch,
      head: headBranch
    })
  } catch(e){
    logger.error(
      'Something went wrong while creating the PR. Check logs below.'
    );    
    core.setFailed(e.message);
    core.error(e);
    
  }

  } else {
    logger.info('No updates at this point in time.');
  }
  // if (gitDiff.stdout) {
  //   core.info(`${gitDiff.stdout}`);
  // } else{
  //   core.info('[js-dependency-update] : No updates.');
  // }
  /*
  [DONE] 1. Parse inputs:
    1.1 base-branch from which to check for updates
    1.2 target-branch to use to create the PR
    1.3 Github Token for authentication purposes (to create PRs)
    1.4 Working directory for which to check for dependencies
  [DONE] 2. Execute the npm update command within the working directory
  [DONE] 3. Check whether there are modified package*.json files
  4. If there are modified files:
    4.1 Add and commit files to the target-branch
    4.2 Create a PR to the base-branch using the octokit API
  5. Otherwise, conclude the custom action
   */
  // core.info('I am a custom JS action');
}

run();
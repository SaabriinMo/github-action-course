//The code above is leveraging the @actions/core package to 
// write a line to the output of our custom action. In the next exercise we will continue the development of the JavaScript code.

const core = require('@actions/core');
 
async function run() { 
  core.info('I am a custom JS action');
}
 
run();
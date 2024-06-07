const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Paths
const tsConfig = path.resolve(__dirname, '../tsconfig.sw.json');
const src = path.resolve(__dirname, '../src/service-workers/chat-user-sw.ts');
const dest = path.resolve(__dirname, '../public/chat-user-sw.js');

// Function to compile TypeScript to JavaScript
function compileTypeScript() {
  return new Promise((resolve, reject) => {
    exec(`tsc -p ${tsConfig}`, (err, stdout, stderr) => {
      if (err) {
        console.error(`Error: ${stderr} ${err}`);
        reject(stderr);
      } else {
        console.log(stdout);
        resolve();
      }
    });
  });
}

// Function to copy the compiled JavaScript file to the public directory
function copyCompiledFile() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log('Worker file copied to public directory.');
      resolve();
    } else {
      reject(`Compiled file ${src} does not exist.`);
    }
  });
}

// Compile and copy process
async function compileAndCopy() {
  try {
    await compileTypeScript();
    await copyCompiledFile();
    console.log('Compilation and copy completed successfully.');
  } catch (error) {
    console.error('Error during compilation and copy:', error);
  }
}

compileAndCopy();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

console.log('🧹 Cleaning build environment...');

// Check if rimraf exists, install if not
try {
  require.resolve('rimraf');
} catch (e) {
  console.log('Installing rimraf...');
  execSync('npm install --no-save rimraf');
}

// Kill any running Metro/Expo processes
console.log('Killing any running Metro/Expo processes...');
try {
  if (process.platform === 'win32') {
    execSync('taskkill /F /IM node.exe', { stdio: 'ignore' });
  } else {
    execSync('killall -9 expo metro bundler', { stdio: 'ignore' });
  }
} catch (e) {
  // Ignore errors if no processes were found
}

// Remove problematic directories
const dirsToRemove = [
  '.expo',
  path.join('android', '.gradle'),
  path.join('android', 'app', 'build'),
  path.join('node_modules', '.cache'),
  path.join('node_modules', 'metro-cache'),
  path.join('node_modules', 'metro-runtime'),
  path.join('node_modules', 'metro-source-map')
];

dirsToRemove.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`Removing ${dir}...`);
    try {
      rimraf.sync(dirPath);
    } catch (e) {
      console.log(`Failed to remove ${dir}, manual deletion may be required: ${e.message}`);
    }
  }
});

// Clear Metro cache
console.log('Clearing Metro cache...');
try {
  execSync('npx expo start --clear --no-dev --minify', { timeout: 5000 });
} catch (e) {
  // Expected to timeout or fail, we just need it to reset cache
  console.log('Metro cache reset initiated');
}

// Clean EAS build artifacts
console.log('Cleaning EAS build artifacts...');
try {
  execSync('npx eas-cli build:cleanup', { stdio: 'inherit' });
} catch (e) {
  console.log('EAS cleanup failed, continuing anyway...');
}

// Install dependencies
console.log('Installing dependencies...');
execSync('npm install', { stdio: 'inherit' });

// Start the build
console.log('🚀 Starting EAS build...');
execSync('npx eas-cli build --platform android --profile production --non-interactive --no-wait', 
  { stdio: 'inherit' });

console.log('✅ Build queued successfully!'); 
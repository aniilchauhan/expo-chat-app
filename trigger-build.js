const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Expo Preview Build...\n');

// Change to project directory
const projectDir = path.resolve(__dirname);
process.chdir(projectDir);

console.log('📁 Project directory:', projectDir);
console.log('');

try {
    // Check login status
    console.log('🔐 Checking login status...');
    const whoami = execSync('eas whoami', { encoding: 'utf-8' });
    console.log('✅ Logged in as:', whoami.trim());
    console.log('');

    // Run the build
    console.log('🏗️  Starting build (this may take a few minutes)...');
    console.log('');

    const buildCommand = 'eas build --profile preview --platform android --non-interactive';
    const output = execSync(buildCommand, {
        encoding: 'utf-8',
        stdio: 'inherit',
        cwd: projectDir
    });

    console.log('');
    console.log('✅ Build submitted successfully!');
    console.log('');
    console.log('📱 View your build at:');
    console.log('   https://expo.dev/accounts/anilchauhan.29.5/projects/chat-app/builds');

} catch (error) {
    console.error('');
    console.error('❌ Build failed!');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('💡 Try these alternatives:');
    console.error('   1. Build from web dashboard: https://expo.dev/accounts/anilchauhan.29.5/projects/chat-app/builds');
    console.error('   2. Check your build quota: https://expo.dev/accounts/anilchauhan.29.5/settings/billing');
    console.error('   3. Run: eas login (if not logged in)');
    process.exit(1);
}

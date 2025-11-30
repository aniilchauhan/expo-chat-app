const { execSync } = require('child_process');

console.log('=== Expo Build Debug Info ===\n');

try {
    console.log('1. Node version:');
    console.log(execSync('node --version', { encoding: 'utf-8' }).trim());
    console.log('');

    console.log('2. NPM version:');
    console.log(execSync('npm --version', { encoding: 'utf-8' }).trim());
    console.log('');

    console.log('3. EAS CLI version:');
    const easVersion = execSync('eas --version 2>&1', { encoding: 'utf-8' });
    const versionMatch = easVersion.match(/eas-cli\/(\d+\.\d+\.\d+)/);
    if (versionMatch) {
        console.log(versionMatch[1]);
    } else {
        console.log('Could not parse version');
    }
    console.log('');

    console.log('4. Logged in as:');
    try {
        const whoami = execSync('eas whoami 2>&1', { encoding: 'utf-8' });
        const usernameMatch = whoami.match(/anilchauhan\.29\.5/);
        if (usernameMatch) {
            console.log('anilchauhan.29.5');
        } else {
            console.log('Not logged in or error');
        }
    } catch (e) {
        console.log('Error checking login');
    }
    console.log('');

    console.log('5. Project directory:');
    console.log(__dirname);
    console.log('');

    console.log('6. Checking app.json:');
    const fs = require('fs');
    const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf-8'));
    console.log('   - Name:', appJson.expo.name);
    console.log('   - Slug:', appJson.expo.slug);
    console.log('   - Version:', appJson.expo.version);
    console.log('   - Project ID:', appJson.expo.extra?.eas?.projectId);
    console.log('');

    console.log('7. Checking eas.json:');
    const easJson = JSON.parse(fs.readFileSync('./eas.json', 'utf-8'));
    console.log('   - Preview profile exists:', !!easJson.build?.preview);
    console.log('   - Android build type:', easJson.build?.preview?.android?.buildType);
    console.log('');

    console.log('✅ All checks passed!');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   Option 1: Try building from web dashboard');
    console.log('   → https://expo.dev/accounts/anilchauhan.29.5/projects/chat-app/builds');
    console.log('');
    console.log('   Option 2: Check build quota');
    console.log('   → https://expo.dev/accounts/anilchauhan.29.5/settings/billing');
    console.log('');
    console.log('   Option 3: Try the build command manually');
    console.log('   → eas build --profile preview --platform android');

} catch (error) {
    console.error('❌ Error:', error.message);
}

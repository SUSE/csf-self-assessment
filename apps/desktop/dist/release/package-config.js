const PUBLISHER = 'CSF Self Assessment';
const REPOSITORY = 'https://github.com/SUSE/csf-self-assessment';
export function packageConfiguration(app, version, trust, system) {
    const siblingEntry = app.kind === 'author' ? 'assessment' : 'author';
    const iconDirectory = `release/icons/generated/${app.kind}`;
    const signed = trust === 'signed-candidate';
    return {
        appId: app.applicationId,
        productName: system === 'linux' ? app.packageName : app.productName,
        electronVersion: '43.4.0',
        asar: true,
        npmRebuild: false,
        forceCodeSigning: signed,
        publish: null,
        directories: {
            output: `../../dist/desktop/${app.kind}`,
        },
        files: [
            'dist/src/**/*.js',
            `!dist/src/${siblingEntry}.js`,
            'dist/release/contract.js',
        ],
        extraResources: [
            {
                from: `../${app.rendererDirectory}/dist/${app.rendererFile}`,
                to: `renderer/${app.rendererFile}`,
            },
        ],
        extraMetadata: {
            name: app.packageName,
            ...(system === 'linux' ? {} : { productName: app.productName }),
            desktopName: app.applicationId,
            version,
            description: app.description,
            author: PUBLISHER,
            repository: REPOSITORY,
            main: `dist/src/${app.kind}.js`,
        },
        mac: {
            target: [
                { target: 'dmg', arch: ['universal'] },
                { target: 'zip', arch: ['universal'] },
            ],
            ...(signed
                ? { hardenedRuntime: true, notarize: true, type: 'distribution' }
                : { identity: null }),
            category: 'public.app-category.productivity',
            icon: `${iconDirectory}/icon.icns`,
            artifactName: `csf-${app.kind}-${'${version}'}-macos-${'${arch}'}.${'${ext}'}`,
        },
        win: {
            target: [{ target: 'nsis', arch: ['x64'] }],
            icon: `${iconDirectory}/icon.ico`,
            ...(signed
                ? {
                    signtoolOptions: {
                        signingHashAlgorithms: ['sha256'],
                        rfc3161TimeStampServer: 'http://timestamp.digicert.com',
                    },
                }
                : {}),
            artifactName: `csf-${app.kind}-${'${version}'}-windows-${'${arch}'}.${'${ext}'}`,
        },
        linux: {
            target: [
                { target: 'AppImage', arch: ['x64'] },
                { target: 'deb', arch: ['x64'] },
                { target: 'rpm', arch: ['x64'] },
            ],
            executableName: app.packageName,
            syncDesktopName: true,
            category: 'Office',
            desktop: { entry: { Name: app.productName } },
            maintainer: PUBLISHER,
            vendor: PUBLISHER,
            description: app.description,
            synopsis: app.description,
            icon: `${iconDirectory}/icon-512.png`,
            artifactName: `csf-${app.kind}-${'${version}'}-linux-x64.${'${ext}'}`,
        },
        rpm: {
            fpm: ['--rpm-rpmbuild-define=_build_id_links none'],
            depends: [
                'gtk3',
                'libnotify',
                'nss',
                'libXScrnSaver',
                '(libXtst or libXtst6)',
                'xdg-utils',
                'at-spi2-core',
                '(libuuid or libuuid1)',
                '(alsa-lib or libasound2)',
            ],
        },
    };
}

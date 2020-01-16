const fs = require('fs');
const path = require('path');
const { homedir, arch } = require('os');

const _ = require('lodash');
const rp = require('request-promise');
const request = require('request');
const decompress = require('decompress');
const decompressTargz = require('decompress-targz');
const compareVersions = require('compare-versions');

const CODEFRESH_PATH = path.resolve(homedir(), '.Codefresh');


const prepareSpwan = async ({ name, repoName, pathName }) => {
    const dirPath = `${CODEFRESH_PATH}/${name}`;
    const versionPath = `${CODEFRESH_PATH}/${name}/version.txt`;
    const filePath = `${CODEFRESH_PATH}/${name}/${repoName}`;
    const fullPath = pathName ? `${repoName}/master/${pathName}` : `${repoName}/master`;
    const versionUrl = `https://raw.githubusercontent.com/codefresh-io/${fullPath}/VERSION`;

    let zipPath = `${CODEFRESH_PATH}/${name}/data`;
    let shouldUpdate = true;
    const options = {
        url: versionUrl,
        method: 'GET',
        headers: { 'User-Agent': 'codefresh' },
    };
    const version = await rp(options);
    if (!fs.existsSync(CODEFRESH_PATH)) {
        fs.mkdirSync(CODEFRESH_PATH);
        fs.mkdirSync(dirPath);
    } else if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
    } else if (fs.existsSync(versionPath)) {
        const currVersion = fs.readFileSync(versionPath, { encoding: 'UTF8' }).trim();
        if (compareVersions(currVersion, version) >= 0) {
            shouldUpdate = false;
        }
    }
    if (shouldUpdate) {
        let osType;
        const { platform } = process;
        if (_.isEqual(platform, 'darwin')) {
            osType = _.isEqual(arch(), 'x32') ? 'Darwin_i386.tar.gz' : 'Darwin_x86_64.tar.gz';
            zipPath = `${zipPath}.tar.gz`;
        } else if (_.isEqual(platform, 'linux')) {
            osType = _.isEqual(arch(), 'x32') ? 'Linux_i386.tar.gz' : 'Linux_x86_64.tar.gz';
            zipPath = `${zipPath}.tar.gz`;
        } else if (_.isEqual(platform, 'ein32')) {
            osType = _.isEqual(arch(), 'x32') ? 'Windows_i386.zip' : 'Windows_x86_64.zip';
            zipPath = `${zipPath}.zip`;
        }
        const assetUrl = `https://github.com/codefresh-io/${repoName}/releases/download/v${version}/${repoName}_${version}_${osType}`;
        const req = request(assetUrl);
        req.pipe(fs.createWriteStream(zipPath));
        const p = new Promise((resolve, reject) => {
            req.on('end', () => {
                decompress(zipPath, `${homedir()}/.Codefresh/${name}`, {
                    plugins: [
                        decompressTargz(),
                    ],
                }).then(() => {
                    fs.writeFile(versionPath, version, (err) => {
                        if (err) {
                            reject(err);
                        }
                    });
                    resolve(filePath);
                });
            });
        });
        return p;
    }
    return filePath;
};

module.exports = prepareSpwan;
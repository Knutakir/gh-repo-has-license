'use strict';
const https = require('https');
const defaultBranch = require('default-branch');

function fallbackMethod(repoUrl) {
    return new Promise((resolve, reject) => {
        https.get(repoUrl, response => {
            if (response.statusCode < 200 || response.statusCode > 299) {
                resolve(false);
                return;
            }
    
            response.setEncoding('UTF-8');
            let data = '';
    
            response.on('data', function(body) {
                data += body;
            });
    
            response.on('end', function() {
                try {
                    const regexp = /(.*)\n(.*)<svg(.*)octicon octicon-law[^]*?<\/a>/g;
                    const regexMatch = data.match(regexp);
                    const newLicenseUrl = 'https://github.com/' + regexMatch[0].split('a href="')[1].split('"')[0];

                    https.get(newLicenseUrl, response => {
                        if (response.statusCode < 200 || response.statusCode > 299) {
                            resolve(false);
                            return;
                        }
        
                        resolve(true);
                        return;
                    }).on('error', (error) => {
                        reject(error);
                    });
                } catch(err) {
                    resolve(false);
                    return;
                }
                resolve(true);
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

module.exports = repo => {
    if (!repo.includes('github.com')) {
        repo = 'https://github.com/' + repo;
    }

    return new Promise((resolve, reject) => {
        // Get the default branch of the repo
        defaultBranch(repo).then(branch => {
            // Try first to check this url, since it is the most used.
            const licenseUrl = repo + '/blob/' + branch + '/LICENSE';

            // Check if a license exists at that branch
            https.get(licenseUrl, response => {
                if (response.statusCode < 200 || response.statusCode > 299) {
                    if (response.statusCode !== 404) {
                        resolve(false);
                        return;
                    }
                }

                response.setEncoding('UTF-8');
                let data = '';
    
                response.on('data', function(body) {
                    data += body;
                });

                response.on('end', function() {
                    if (response.statusCode === 404) {
                        fallbackMethod(repo).then(resolve);  
                    } else {
                        resolve(true);
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        }).catch(() => {
            // If `default-branch` can't find anything. Url is wrong.
            resolve(false);
        });
    });
};

const fs = require('fs');
const { exec } = require('child_process');
const $ = require('cheerio');
const md5 = require('md5');

async function GetTextFromPDF(path) {
    let doc = await pdfjsLib.getDocument(path).promise;
    let page1 = await doc.getPage(1);
    let content = await page1.getTextContent();
    let strings = content.items.map(function(item) {
        return item.str;
    });
    return strings;
}

const roots = [
    'https://www.lexjansen.com/phuse-us/',
    'https://www.lexjansen.com/pharmasug-cn/',
    'https://www.lexjansen.com/css-us/',
    'https://www.lexjansen.com/phuse/',
    'https://www.lexjansen.com/cdisc/',
    'https://www.lexjansen.com/sugi/',
    'https://www.lexjansen.com/wuss/',
    'https://www.lexjansen.com/sesug/',
    'https://www.lexjansen.com/nesug/',
    'https://www.lexjansen.com/views/',
    'https://www.lexjansen.com/pharmasug/',
    'https://www.lexjansen.com/mwsug/',
    'https://www.lexjansen.com/scsug/',
    'https://www.lexjansen.com/pnwsug/',
    'https://www.lexjansen.com/seugi/'
];

let requestLimit = 5;

const memoizeHttp = (url) => {
    if (requestLimit <= 0) {
        throw 'No more requests';
    }

    const code = md5(url);
    const folder = code.substr(0, 4);

    const extension = 
        url.match(/[.][a-z]+$/) ?
            url.substring(url.lastIndexOf('.')) :
            'html';
   

    const file = code.substr(4) + extension;

    if (!fs.existsSync('files/' + folder)) {
        fs.mkdirSync('files/' + folder);
    }

    const destination = 'files/' + folder + '/' + file;

    if (!fs.existsSync(destination)) {
        const command = `curl -o ${destination} ${url}`; 

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }

            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }

            console.log(`stdout: ${stdout}`);
        });
        
        requestLimit--;
    } else {
        console.log('Already exists: ' + destination);
    }
}

roots.map(
    memoizeHttp
);